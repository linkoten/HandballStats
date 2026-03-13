import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

// Limites par plan (source de vérité côté code)
// Pas de limite sur le nombre de compétitions total :
// les tokens sont dépensés pour scraper, accumulés via la réallocation d'août.
// L'unique limite matérielle est donc le nombre de tokens disponibles.
export const PLAN_LIMITS = {
  GRATUIT: { maxTokens: 0, maxEntraineurs: 0, trialDays: 0 },
  STARTER: { maxTokens: 3, maxEntraineurs: 1, trialDays: 14 },
  PRO: { maxTokens: 10, maxEntraineurs: 3, trialDays: 0 },
  CLUB: { maxTokens: 25, maxEntraineurs: 10, trialDays: 0 },
  PREMIUM: { maxTokens: -1, maxEntraineurs: -1, trialDays: 0 },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

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
      "3 jetons (= 3 compétitions scrapées)",
      "1 entraîneur dans le club",
      "Essai gratuit 14 jours",
      "Réallocation de jetons en août",
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
      "10 jetons (= 10 compétitions scrapées)",
      "3 entraîneurs dans le club",
      "Réallocation de jetons en août",
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
      "25 jetons (= 25 compétitions scrapées)",
      "10 entraîneurs dans le club",
      "Réallocation de jetons en août",
      "Support prioritaire",
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
      "Jetons illimités",
      "Entraîneurs illimités",
      "Réallocation de jetons en août",
      "Support dédié",
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
  returnUrl: string,
) {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
