import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { stripe, SUBSCRIPTION_PLANS, TOKEN_PACKS } from "@/lib/stripe";
import { SubscriptionType } from "@prisma/client";

// Logique partagée entre le webhook Stripe (source de vérité en cas de changement
// externe) et les server actions de gestion d'abonnement (mise à jour immédiate côté UI).

// Filet de sécurité : si un client Stripe se retrouve avec plusieurs abonnements actifs
// (ex: nouveau Checkout lancé par erreur sans passer par le changement de plan in-app),
// on garde uniquement le plus récent et on résilie les autres pour éviter la double facturation.
async function cancelDuplicateActiveSubscriptions(
  customerId: string,
  keepSubscriptionId: string,
) {
  const { data: subscriptions } = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 20,
  });

  for (const sub of subscriptions) {
    if (sub.id !== keepSubscriptionId) {
      await stripe.subscriptions.cancel(sub.id).catch((error) => {
        console.error(`Échec annulation abonnement en doublon ${sub.id}:`, error);
      });
      console.log(`🧹 Abonnement en doublon ${sub.id} résilié (client ${customerId})`);
    }
  }
}

export async function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error("userId manquant dans metadata subscription");
    return;
  }

  if (subscription.status === "active") {
    await cancelDuplicateActiveSubscriptions(
      subscription.customer as string,
      subscription.id,
    );
  }

  const priceId = subscription.items.data[0]?.price.id;
  let subscriptionType: SubscriptionType = "GRATUIT";
  let tokensToAdd = 0;

  for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (plan.priceIdMonthly === priceId || plan.priceIdYearly === priceId) {
      subscriptionType = key as SubscriptionType;
      tokensToAdd = plan.tokens;
      break;
    }
  }

  const subscriptionLimit = await prisma.subscriptionLimit.findUnique({
    where: { subscriptionType },
  });
  const tokensToSet = subscriptionLimit?.maxTokens || 0;

  // Un changement de plan ne doit pas écraser la conso/les achats en cours :
  // on préserve les jetons achetés à la carte et la consommation déjà faite,
  // seule la part "plan" de l'allocation change.
  const previousUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscription: true, tokensRemaining: true, baseTokenAllocation: true },
  });
  const previousPlanLimit = previousUser
    ? await prisma.subscriptionLimit.findUnique({
        where: { subscriptionType: previousUser.subscription },
      })
    : null;
  const previousPlanMaxTokens = previousPlanLimit?.maxTokens ?? 0;

  const extraPurchasedTokens = Math.max(
    0,
    (previousUser?.baseTokenAllocation ?? 0) - previousPlanMaxTokens,
  );
  const tokensUsed = Math.max(
    0,
    (previousUser?.baseTokenAllocation ?? 0) - (previousUser?.tokensRemaining ?? 0),
  );

  const newBaseTokenAllocation = tokensToSet + extraPurchasedTokens;
  const newTokensRemaining = Math.max(0, newBaseTokenAllocation - tokensUsed);

  // Depuis l'API Stripe 2025+, current_period_end est porté par l'item de
  // l'abonnement (et non plus par l'abonnement lui-même).
  const currentPeriodEnd =
    (subscription.items.data[0] as any)?.current_period_end ??
    (subscription as any).current_period_end;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        subscription: subscriptionType,
        role: "ADMIN_CLUB",
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: new Date(currentPeriodEnd * 1000),
        tokensRemaining: newTokensRemaining,
        baseTokenAllocation: newBaseTokenAllocation,
      },
    });

    await tx.tokenUsageHistory.create({
      data: {
        userId,
        action: "SUBSCRIPTION",
        amount: newTokensRemaining,
        reason: `Abonnement ${subscriptionType} activé - ${newTokensRemaining} tokens disponibles (dont ${extraPurchasedTokens} achetés conservés)`,
      },
    });
  });

  console.log(
    `✅ Abonnement ${subscriptionType} activé pour user ${userId} - ${newTokensRemaining} tokens disponibles`,
  );
}

export async function syncSubscriptionCancellation(
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error("userId manquant dans metadata subscription");
    return;
  }

  // Ignorer l'événement si ce n'est pas l'abonnement actuellement actif de l'utilisateur
  // (ex: résiliation d'un doublon par cancelDuplicateActiveSubscriptions) : on ne doit
  // downgrade que si son VRAI abonnement en cours est celui qui vient d'être supprimé.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true },
  });
  if (user?.stripeSubscriptionId && user.stripeSubscriptionId !== subscription.id) {
    console.log(
      `Ignoré : ${subscription.id} n'est pas l'abonnement actif de l'utilisateur ${userId} (${user.stripeSubscriptionId})`,
    );
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
        tokensRemaining: 0,
        baseTokenAllocation: 0,
        stripeSubscriptionId: null,
        stripePriceId: null,
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

  console.log(`❌ Abonnement annulé pour user ${userId}`);
}

// Filet de sécurité appelé au retour de Stripe Checkout (via session_id dans l'URL
// de succès) : resynchronise immédiatement la BDD sans attendre le webhook. Utile
// en local (le webhook ne peut pas atteindre localhost) et en prod si le webhook
// est en retard/indisponible. Idempotent, sans risque de double-application.
export async function reconcileCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.mode === "subscription" && session.subscription) {
    const subscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

    await syncSubscriptionFromStripe(subscription);
  } else if (
    session.mode === "payment" &&
    session.metadata?.type === "tokens"
  ) {
    await processTokenPurchase(session);
  }
}

// Partagé entre le webhook (checkout.session.completed) et reconcileCheckoutSession :
// idempotent via la vérification du sessionId déjà traité dans TokenUsageHistory.
export async function processTokenPurchase(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("userId manquant dans metadata session");
    return;
  }

  const alreadyProcessed = await prisma.tokenUsageHistory.findFirst({
    where: { userId, action: "PURCHASE", reason: { contains: session.id } },
  });
  if (alreadyProcessed) return;

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const priceId = lineItems.data[0]?.price?.id;

  let tokensToAdd = 0;
  for (const pack of Object.values(TOKEN_PACKS)) {
    if (pack.priceId === priceId) {
      tokensToAdd = pack.tokens;
      break;
    }
  }
  if (tokensToAdd <= 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        tokensRemaining: { increment: tokensToAdd },
        baseTokenAllocation: { increment: tokensToAdd },
      },
    });

    await tx.tokenUsageHistory.create({
      data: {
        userId,
        action: "PURCHASE",
        amount: tokensToAdd,
        reason: `Achat de ${tokensToAdd} tokens supplémentaires (session ${session.id})`,
      },
    });
  });

  console.log(`🎟️  ${tokensToAdd} tokens achetés pour user ${userId}`);
}
