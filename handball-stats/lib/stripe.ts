import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

// Configuration des plans d'abonnement
// Configuration des plans d'abonnement
export const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: "Starter",
    priceMonthly: 9,
    priceYearly: 90,
    priceIdMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
    priceIdYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID!,
    tokens: 3,
    trialDays: 14,
    features: [
      "3 compétitions actives",
      "Entraîneurs illimités",
      "Accès Power BI",
      "Export Excel",
      "Essai gratuit 14 jours",
    ],
  },
  PRO: {
    name: "Pro",
    priceMonthly: 29,
    priceYearly: 290,
    priceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    priceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
    tokens: 10,
    features: [
      "10 compétitions actives",
      "Entraîneurs illimités",
      "Historique 3 ans",
      "Accès Power BI",
      "Export Excel",
      "Support prioritaire",
    ],
  },
  CLUB: {
    name: "Club",
    priceMonthly: 59,
    priceYearly: 590,
    priceIdMonthly: process.env.STRIPE_CLUB_MONTHLY_PRICE_ID!,
    priceIdYearly: process.env.STRIPE_CLUB_YEARLY_PRICE_ID!,
    tokens: 25,
    features: [
      "25 compétitions actives",
      "Entraîneurs illimités",
      "Historique 5 ans",
      "Accès Power BI",
      "Export Excel & PDF",
      "Support prioritaire",
      "API Access",
    ],
  },
  PREMIUM: {
    name: "Premium",
    priceMonthly: 99,
    priceYearly: 990,
    priceIdMonthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
    priceIdYearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!,
    tokens: -1, // Illimité
    features: [
      "Compétitions illimitées",
      "Entraîneurs illimités",
      "Historique complet",
      "Accès Power BI personnalisé",
      "Export tous formats",
      "Support dédié",
      "API Access illimité",
      "Formations exclusives",
    ],
  },
} as const;

// Configuration des jetons à la carte
export const TOKEN_PACKS = {
  SINGLE: {
    name: "1 Jeton",
    price: 5,
    priceId: process.env.STRIPE_TOKEN_1_PRICE_ID!,
    tokens: 1,
  },
  PACK_3: {
    name: "3 Jetons",
    price: 13,
    priceId: process.env.STRIPE_TOKEN_3_PRICE_ID!,
    tokens: 3,
    savings: "13%",
  },
  PACK_5: {
    name: "5 Jetons",
    price: 20,
    priceId: process.env.STRIPE_TOKEN_5_PRICE_ID!,
    tokens: 5,
    savings: "20%",
  },
} as const;

// Helper pour créer un client Stripe
export async function createStripeCustomer(email: string, userId: string) {
  return await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });
}

// Helper pour créer une session de paiement (abonnement)
export async function createSubscriptionCheckoutSession({
  customerId,
  priceId,
  userId,
  successUrl,
  cancelUrl,
  isStarter = false,
}: {
  customerId: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  isStarter?: boolean;
}) {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
      trial_period_days: isStarter ? 14 : undefined,
    },
  });
}

// Helper pour créer une session de paiement (jetons)
export async function createTokenCheckoutSession({
  customerId,
  priceId,
  quantity,
  userId,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  quantity: number;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      type: "tokens",
    },
  });
}

// Helper pour annuler un abonnement
export async function cancelSubscription(subscriptionId: string) {
  return await stripe.subscriptions.cancel(subscriptionId);
}

// Helper pour récupérer un abonnement
export async function getSubscription(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

// Helper pour créer un portal client (gestion abonnement)
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
) {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
