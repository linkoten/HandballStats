jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscriptionLimit: {
      findUnique: jest.fn(),
    },
    tokenUsageHistory: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import {
  syncSubscriptionFromStripe,
  syncSubscriptionCancellation,
  reconcileCheckoutSession,
  processTokenPurchase,
} from "@/lib/subscription-sync";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

function makeTransactionMock() {
  const tx = {
    user: { update: jest.fn().mockResolvedValue({}) },
    tokenUsageHistory: { create: jest.fn().mockResolvedValue({}) },
  };
  (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(tx));
  return tx;
}

describe("subscription-sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("syncSubscriptionFromStripe", () => {
    it("ignore l'événement si le userId est absent des metadata", async () => {
      await syncSubscriptionFromStripe({
        metadata: {},
      } as any);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("résilie les abonnements en doublon si le statut est actif", async () => {
      const tx = makeTransactionMock();
      (stripe.subscriptions.list as jest.Mock).mockResolvedValue({
        data: [{ id: "sub_current" }, { id: "sub_duplicate" }],
      });
      (stripe.subscriptions.cancel as jest.Mock).mockResolvedValue({});
      (prisma.subscriptionLimit.findUnique as jest.Mock).mockResolvedValue({
        maxTokens: 10,
      });

      await syncSubscriptionFromStripe({
        id: "sub_current",
        status: "active",
        customer: "cus_1",
        metadata: { userId: "u1" },
        items: {
          data: [
            {
              price: { id: "price_pro_monthly" },
              current_period_end: 1700000000,
            },
          ],
        },
      } as any);

      expect(stripe.subscriptions.list).toHaveBeenCalledWith({
        customer: "cus_1",
        status: "active",
        limit: 20,
      });
      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith(
        "sub_duplicate",
      );
      expect(stripe.subscriptions.cancel).not.toHaveBeenCalledWith(
        "sub_current",
      );
      expect(tx.user.update).toHaveBeenCalled();
    });

    it("met à jour l'utilisateur en BDD avec le plan, les tokens et les infos Stripe correspondant à l'abonnement Stripe", async () => {
      const tx = makeTransactionMock();
      (stripe.subscriptions.list as jest.Mock).mockResolvedValue({
        data: [],
      });
      (prisma.subscriptionLimit.findUnique as jest.Mock).mockResolvedValue({
        maxTokens: 25,
      });

      await syncSubscriptionFromStripe({
        id: "sub_1",
        status: "active",
        customer: "cus_1",
        metadata: { userId: "u1" },
        items: {
          data: [
            {
              price: { id: "price_club_monthly" },
              current_period_end: 1700000000,
            },
          ],
        },
      } as any);

      expect(prisma.subscriptionLimit.findUnique).toHaveBeenCalledWith({
        where: { subscriptionType: "CLUB" },
      });
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: {
          subscription: "CLUB",
          role: "ADMIN_CLUB",
          stripeCustomerId: "cus_1",
          stripeSubscriptionId: "sub_1",
          stripePriceId: "price_club_monthly",
          stripeCurrentPeriodEnd: new Date(1700000000 * 1000),
          tokensRemaining: 25,
          baseTokenAllocation: 25,
        },
      });
      expect(tx.tokenUsageHistory.create).toHaveBeenCalledWith({
        data: {
          userId: "u1",
          action: "SUBSCRIPTION",
          amount: 25,
          reason: expect.stringContaining("CLUB"),
        },
      });
    });

    it("retombe sur GRATUIT si le priceId ne correspond à aucun plan connu", async () => {
      const tx = makeTransactionMock();
      (stripe.subscriptions.list as jest.Mock).mockResolvedValue({
        data: [],
      });
      (prisma.subscriptionLimit.findUnique as jest.Mock).mockResolvedValue({
        maxTokens: 0,
      });

      await syncSubscriptionFromStripe({
        id: "sub_1",
        status: "active",
        customer: "cus_1",
        metadata: { userId: "u1" },
        items: {
          data: [
            { price: { id: "price_inconnu" }, current_period_end: 1700000000 },
          ],
        },
      } as any);

      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscription: "GRATUIT" }),
        }),
      );
    });
  });

  describe("syncSubscriptionCancellation", () => {
    it("ignore l'événement si le userId est absent des metadata", async () => {
      await syncSubscriptionCancellation({ metadata: {} } as any);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("ignore l'événement si ce n'est pas l'abonnement actif de l'utilisateur", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        stripeSubscriptionId: "sub_actif",
      });
      await syncSubscriptionCancellation({
        id: "sub_ancien_doublon",
        metadata: { userId: "u1" },
      } as any);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("repasse l'utilisateur en GRATUIT et remet ses tokens à 0", async () => {
      const tx = makeTransactionMock();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        stripeSubscriptionId: "sub_1",
      });

      await syncSubscriptionCancellation({
        id: "sub_1",
        metadata: { userId: "u1" },
      } as any);

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: {
          subscription: "GRATUIT",
          tokensRemaining: 0,
          baseTokenAllocation: 0,
          stripeSubscriptionId: null,
          stripePriceId: null,
        },
      });
      expect(tx.tokenUsageHistory.create).toHaveBeenCalled();
    });
  });

  describe("processTokenPurchase", () => {
    it("est idempotent : ne traite pas deux fois la même session", async () => {
      (prisma.tokenUsageHistory.findFirst as jest.Mock).mockResolvedValue({
        id: "already-1",
      });
      await processTokenPurchase({
        id: "cs_1",
        metadata: { userId: "u1" },
      } as any);
      expect(stripe.checkout.sessions.listLineItems).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("crédite les tokens correspondant au pack acheté", async () => {
      const tx = makeTransactionMock();
      (prisma.tokenUsageHistory.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (stripe.checkout.sessions.listLineItems as jest.Mock).mockResolvedValue({
        data: [{ price: { id: "price_token_pack3" } }],
      });

      await processTokenPurchase({
        id: "cs_1",
        metadata: { userId: "u1" },
      } as any);

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: {
          tokensRemaining: { increment: 3 },
          baseTokenAllocation: { increment: 3 },
        },
      });
      expect(tx.tokenUsageHistory.create).toHaveBeenCalledWith({
        data: {
          userId: "u1",
          action: "PURCHASE",
          amount: 3,
          reason: expect.stringContaining("cs_1"),
        },
      });
    });

    it("ne crédite rien si le priceId ne correspond à aucun pack de tokens", async () => {
      (prisma.tokenUsageHistory.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (stripe.checkout.sessions.listLineItems as jest.Mock).mockResolvedValue({
        data: [{ price: { id: "price_inconnu" } }],
      });

      await processTokenPurchase({
        id: "cs_1",
        metadata: { userId: "u1" },
      } as any);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("reconcileCheckoutSession", () => {
    it("resynchronise l'abonnement pour une session de type subscription", async () => {
      (stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue({
        mode: "subscription",
        subscription: {
          id: "sub_1",
          status: "active",
          customer: "cus_1",
          metadata: { userId: "u1" },
          items: {
            data: [
              {
                price: { id: "price_starter_monthly" },
                current_period_end: 1700000000,
              },
            ],
          },
        },
      });
      (stripe.subscriptions.list as jest.Mock).mockResolvedValue({
        data: [],
      });
      (prisma.subscriptionLimit.findUnique as jest.Mock).mockResolvedValue({
        maxTokens: 3,
      });
      const tx = makeTransactionMock();

      await reconcileCheckoutSession("cs_1");

      expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_1", {
        expand: ["subscription"],
      });
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscription: "STARTER" }),
        }),
      );
    });

    it("traite l'achat de tokens pour une session de type payment", async () => {
      (stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue({
        mode: "payment",
        metadata: { type: "tokens", userId: "u1" },
        id: "cs_2",
      });
      (prisma.tokenUsageHistory.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (stripe.checkout.sessions.listLineItems as jest.Mock).mockResolvedValue({
        data: [{ price: { id: "price_token_single" } }],
      });
      const tx = makeTransactionMock();

      await reconcileCheckoutSession("cs_2");

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: {
          tokensRemaining: { increment: 1 },
          baseTokenAllocation: { increment: 1 },
        },
      });
    });
  });
});
