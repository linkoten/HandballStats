import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, SUBSCRIPTION_PLANS, TOKEN_PACKS } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { SubscriptionType, UserRole } from "@prisma/client";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Pas de signature Stripe" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    console.error("Erreur vérification signature webhook:", error);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Nouvel abonnement créé ou essai gratuit commencé
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      // Abonnement supprimé/annulé
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancellation(subscription);
        break;
      }

      // Paiement one-time réussi (jetons)
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "payment" && session.metadata?.type === "tokens") {
          await handleTokenPurchase(session);
        }
        break;
      }

      // Paiement échoué
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erreur traitement webhook:", error);
    return NextResponse.json({ error: "Erreur traitement" }, { status: 500 });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error("userId manquant dans metadata subscription");
    return;
  }

  // Déterminer le plan
  const priceId = subscription.items.data[0]?.price.id;
  let subscriptionType: SubscriptionType = "GRATUIT";
  let tokensToAdd = 0;

  // Trouver le plan correspondant
  for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (plan.priceIdMonthly === priceId || plan.priceIdYearly === priceId) {
      subscriptionType = key as SubscriptionType;
      tokensToAdd = plan.tokens;
      break;
    }
  }

  // Récupérer les limites du plan
  const subscriptionLimit = await prisma.subscriptionLimit.findUnique({
    where: { subscriptionType },
  });

  const tokensToSet = subscriptionLimit?.maxTokens || 0;

  // Mettre à jour l'utilisateur avec transaction
  await prisma.$transaction(async (tx) => {
    // Mettre à jour l'abonnement et les tokens
    // Récupérer l'allocation bonus actuelle pour la conserver si l'utilisateur change de plan
    const existingUser = await tx.user.findUnique({
      where: { id: userId },
      select: { baseTokenAllocation: true, subscription: true },
    });
    // Les tokens bonus achetés au-delà du plan précédent sont perdus lors d'un changement de plan
    // L'allocation de base repart sur le nouveau plan
    const newBaseAllocation = tokensToSet;

    await tx.user.update({
      where: { id: userId },
      data: {
        subscription: subscriptionType,
        role: "ADMIN_CLUB", // Devient admin dès qu'il s'abonne
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000,
        ),
        tokensRemaining: tokensToSet,
        baseTokenAllocation: newBaseAllocation,
      },
    });

    // Créer un historique d'attribution de tokens
    await tx.tokenUsageHistory.create({
      data: {
        userId,
        action: "SUBSCRIPTION",
        amount: tokensToSet,
        reason: `Abonnement ${subscriptionType} activé - ${tokensToSet} tokens attribués`,
      },
    });
  });

  console.log(
    `✅ Abonnement ${subscriptionType} activé pour user ${userId} - ${tokensToSet} tokens attribués`,
  );
}

async function handleSubscriptionCancellation(
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error("userId manquant dans metadata subscription");
    return;
  }

  // Passer en GRATUIT mais :
  // - Conserver le rôle ADMIN_CLUB (l'utilisateur garde accès admin tant que la période est valide)
  // - Conserver stripeCurrentPeriodEnd (permet de savoir jusqu'à quand l'accès est payé)
  // - Mettre tokensRemaining à 0 (plus de scraping possible)
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        subscription: "GRATUIT",
        // role conservé intentionnellement (ADMIN_CLUB)
        tokensRemaining: 0,
        baseTokenAllocation: 0,
        stripeSubscriptionId: null,
        stripePriceId: null,
        // stripeCurrentPeriodEnd conservé pour savoir quand l'accès expire réellement
      },
    });

    await tx.tokenUsageHistory.create({
      data: {
        userId,
        action: "ADMIN",
        amount: 0,
        reason:
          "Abonnement annulé - tokens mis à zéro, accès jusqu'à fin de période",
      },
    });
  });

  console.log(
    `❌ Abonnement annulé pour user ${userId} (accès jusqu'au ${new Date(0).toISOString()})`,
  );
}

async function handleTokenPurchase(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;

  if (!userId) {
    console.error("userId manquant dans metadata session");
    return;
  }

  // Récupérer les line items pour connaître le nombre de jetons
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const priceId = lineItems.data[0]?.price?.id;

  let tokensToAdd = 0;

  // Trouver le pack correspondant
  for (const pack of Object.values(TOKEN_PACKS)) {
    if (pack.priceId === priceId) {
      tokensToAdd = pack.tokens;
      break;
    }
  }

  if (tokensToAdd > 0) {
    await prisma.$transaction(async (tx) => {
      // Ajouter les tokens à l'utilisateur ET à l'allocation de base (pour conserver le bonus au reset d'août)
      await tx.user.update({
        where: { id: userId },
        data: {
          tokensRemaining: { increment: tokensToAdd },
          baseTokenAllocation: { increment: tokensToAdd },
        },
      });

      // Logger l'achat
      await tx.tokenUsageHistory.create({
        data: {
          userId,
          action: "PURCHASE",
          amount: tokensToAdd,
          reason: `Achat de ${tokensToAdd} tokens supplémentaires`,
        },
      });
    });

    console.log(`🎟️  ${tokensToAdd} tokens achetés pour user ${userId}`);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof (invoice as any).subscription === "string"
      ? (invoice as any).subscription
      : ((invoice as any).subscription as Stripe.Subscription)?.id;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.userId;

  if (!userId) return;

  // Note: Le statut de paiement n'est plus stocké dans User
  console.log(`⚠️  Paiement échoué pour user ${userId}`);
  // TODO: Envoyer un email à l'utilisateur ou désactiver l'accès
}
