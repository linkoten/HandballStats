// On mock les modules externes utilisés dans subscription-actions
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/lib/subscription-sync", () => ({
  syncSubscriptionFromStripe: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import {
  getSubscriptionStatus,
  changeSubscriptionPlan,
  previewSubscriptionChange,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscription,
} from "@/app/actions/subscription-actions";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { syncSubscriptionFromStripe } from "@/lib/subscription-sync";

describe("subscription-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSubscriptionStatus", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await getSubscriptionStatus();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentifié/i);
    });

    it("retourne data: null si l'utilisateur n'a pas d'abonnement Stripe", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: null,
      });
      const res = await getSubscriptionStatus();
      expect(res.success).toBe(true);
      expect(res.data).toBeNull();
      expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    });

    it("identifie le plan et le cycle à partir du priceId Stripe", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: "sub_1",
      });
      (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
        status: "active",
        cancel_at_period_end: false,
        current_period_end: 1700000000,
        items: { data: [{ price: { id: "price_pro_yearly" } }] },
      });
      const res = await getSubscriptionStatus();
      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        planKey: "PRO",
        cycle: "yearly",
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: 1700000000 * 1000,
      });
    });

    it("dissocie l'abonnement Stripe si celui-ci n'existe plus (resource_missing)", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: "sub_stale",
      });
      (stripe.subscriptions.retrieve as jest.Mock).mockRejectedValue({
        code: "resource_missing",
      });
      const res = await getSubscriptionStatus();
      expect(res.success).toBe(true);
      expect(res.data).toBeNull();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { stripeSubscriptionId: null, stripePriceId: null },
      });
    });
  });

  describe("changeSubscriptionPlan", () => {
    it("refuse un plan invalide", async () => {
      const res = await changeSubscriptionPlan("INEXISTANT", "monthly");
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/plan invalide/i);
    });

    it("refuse si l'utilisateur n'a pas d'abonnement Stripe actif", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: null,
      });
      const res = await changeSubscriptionPlan("PRO", "monthly");
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/aucun abonnement actif/i);
    });

    it("bloque le changement de plan pendant la période d'essai", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: "sub_1",
      });
      (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
        status: "trialing",
        items: { data: [{ id: "item_1" }] },
      });
      const res = await changeSubscriptionPlan("PRO", "monthly");
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/période d'essai/i);
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it("met à jour l'abonnement Stripe et resynchronise la BDD en cas de succès", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: "sub_1",
      });
      (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
        status: "active",
        items: { data: [{ id: "item_1" }] },
      });
      const updatedSubscription = { id: "sub_1", status: "active" };
      (stripe.subscriptions.update as jest.Mock).mockResolvedValue(
        updatedSubscription,
      );

      const res = await changeSubscriptionPlan("CLUB", "yearly");

      expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_1", {
        items: [{ id: "item_1", price: "price_club_yearly" }],
        proration_behavior: "create_prorations",
        cancel_at_period_end: false,
      });
      expect(syncSubscriptionFromStripe).toHaveBeenCalledWith(
        updatedSubscription,
      );
      expect(res.success).toBe(true);
    });

    it("dissocie l'abonnement si Stripe renvoie resource_missing", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: "sub_stale",
      });
      (stripe.subscriptions.retrieve as jest.Mock).mockRejectedValue({
        code: "resource_missing",
      });
      const res = await changeSubscriptionPlan("PRO", "monthly");
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/n'existe plus/i);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { stripeSubscriptionId: null, stripePriceId: null },
      });
    });
  });

  describe("previewSubscriptionChange", () => {
    it("bloque la prévisualisation pendant la période d'essai", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: "sub_1",
      });
      (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
        status: "trialing",
        items: { data: [{ id: "item_1" }] },
      });
      const res = await previewSubscriptionChange("PRO", "monthly");
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/période d'essai/i);
      expect((stripe.invoices as any).createPreview).not.toHaveBeenCalled();
    });

    it("retourne le montant prorata prévu par Stripe", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: "sub_1",
      });
      (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
        status: "active",
        customer: "cus_1",
        items: { data: [{ id: "item_1" }] },
      });
      (stripe.invoices as any).createPreview.mockResolvedValue({
        currency: "eur",
        amount_due: 1234,
        period_end: 1700000000,
        lines: {
          data: [{ description: "Proration", amount: 1234 }],
        },
      });

      const res = await previewSubscriptionChange("CLUB", "monthly");

      expect((stripe.invoices as any).createPreview).toHaveBeenCalledWith({
        customer: "cus_1",
        subscription: "sub_1",
        subscription_details: {
          items: [{ id: "item_1", price: "price_club_monthly" }],
          proration_behavior: "create_prorations",
        },
      });
      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        currency: "eur",
        amountDue: 12.34,
        nextPaymentDate: 1700000000 * 1000,
        lines: [{ description: "Proration", amount: 12.34 }],
      });
    });
  });

  describe("cancelSubscriptionAtPeriodEnd", () => {
    it("indique isTrial=true si l'abonnement est en période d'essai", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: "sub_1",
      });
      (stripe.subscriptions.update as jest.Mock).mockResolvedValue({
        status: "trialing",
        current_period_end: 1700000000,
      });
      const res = await cancelSubscriptionAtPeriodEnd();
      expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_1", {
        cancel_at_period_end: true,
      });
      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        isTrial: true,
        periodEnd: 1700000000 * 1000,
      });
    });

    it("indique isTrial=false pour un abonnement payant classique", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: "sub_1",
      });
      (stripe.subscriptions.update as jest.Mock).mockResolvedValue({
        status: "active",
        current_period_end: 1700000000,
      });
      const res = await cancelSubscriptionAtPeriodEnd();
      expect(res.data?.isTrial).toBe(false);
    });
  });

  describe("resumeSubscription", () => {
    it("annule la résiliation programmée", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        stripeSubscriptionId: "sub_1",
      });
      (stripe.subscriptions.update as jest.Mock).mockResolvedValue({});
      const res = await resumeSubscription();
      expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_1", {
        cancel_at_period_end: false,
      });
      expect(res.success).toBe(true);
    });
  });
});
