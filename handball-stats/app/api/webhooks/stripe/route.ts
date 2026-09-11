import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, SUBSCRIPTION_PLANS, TOKEN_PACKS } from "@/lib/stripe";
import {
  syncSubscriptionFromStripe,
  syncSubscriptionCancellation,
  processTokenPurchase,
} from "@/lib/subscription-sync";
import prisma from "@/lib/prisma";

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
  await syncSubscriptionFromStripe(subscription);
}

async function handleSubscriptionCancellation(
  subscription: Stripe.Subscription,
) {
  await syncSubscriptionCancellation(subscription);
}

async function handleTokenPurchase(session: Stripe.Checkout.Session) {
  await processTokenPurchase(session);
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
