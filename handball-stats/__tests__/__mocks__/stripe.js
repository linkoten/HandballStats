const stripe = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    del: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    list: jest.fn(),
  },
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      listLineItems: jest.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: jest.fn(),
    },
    configurations: {
      list: jest.fn(),
      create: jest.fn(),
    },
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  prices: {
    retrieve: jest.fn(),
    list: jest.fn(),
  },
  invoices: {
    createPreview: jest.fn(),
  },
};

const PLAN_LIMITS = {
  GRATUIT: { maxTokens: 0, maxEntraineurs: 0, trialDays: 0 },
  STARTER: { maxTokens: 3, maxEntraineurs: 1, trialDays: 14 },
  PRO: { maxTokens: 10, maxEntraineurs: 3, trialDays: 0 },
  CLUB: { maxTokens: 25, maxEntraineurs: 10, trialDays: 0 },
  PREMIUM: { maxTokens: -1, maxEntraineurs: -1, trialDays: 0 },
};

const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: "Starter",
    priceMonthly: 9,
    priceYearly: 90,
    priceIdMonthly: "price_starter_monthly",
    priceIdYearly: "price_starter_yearly",
    tokens: 3,
    trialDays: 14,
    features: [],
  },
  PRO: {
    name: "Pro",
    priceMonthly: 29,
    priceYearly: 290,
    priceIdMonthly: "price_pro_monthly",
    priceIdYearly: "price_pro_yearly",
    tokens: 10,
    features: [],
  },
  CLUB: {
    name: "Club",
    priceMonthly: 59,
    priceYearly: 590,
    priceIdMonthly: "price_club_monthly",
    priceIdYearly: "price_club_yearly",
    tokens: 25,
    features: [],
  },
  PREMIUM: {
    name: "Premium",
    priceMonthly: 99,
    priceYearly: 990,
    priceIdMonthly: "price_premium_monthly",
    priceIdYearly: "price_premium_yearly",
    tokens: -1,
    features: [],
  },
};

const TOKEN_PACKS = {
  SINGLE: { priceId: "price_token_single", tokens: 1, price: 5, savings: 0 },
  PACK_3: { priceId: "price_token_pack3", tokens: 3, price: 12, savings: 3 },
  PACK_5: { priceId: "price_token_pack5", tokens: 5, price: 18, savings: 7 },
};

const createStripeCustomer = jest.fn();
const createSubscriptionCheckoutSession = jest.fn();
const createTokenCheckoutSession = jest.fn();
const createCustomerPortalSession = jest.fn();
const cancelSubscription = jest.fn();

module.exports = {
  stripe,
  PLAN_LIMITS,
  SUBSCRIPTION_PLANS,
  TOKEN_PACKS,
  createStripeCustomer,
  createSubscriptionCheckoutSession,
  createTokenCheckoutSession,
  createCustomerPortalSession,
  cancelSubscription,
};
