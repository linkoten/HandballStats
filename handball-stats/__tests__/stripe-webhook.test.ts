/// <reference types="jest" />

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));
jest.mock("@/lib/subscription-sync", () => ({
  syncSubscriptionFromStripe: jest.fn(),
  syncSubscriptionCancellation: jest.fn(),
  processTokenPurchase: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {},
}));

import { POST } from "@/app/api/webhooks/stripe/route";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import {
  syncSubscriptionFromStripe,
  syncSubscriptionCancellation,
  processTokenPurchase,
} from "@/lib/subscription-sync";

function mockRequest(body: string) {
  return { text: jest.fn().mockResolvedValue(body) } as unknown as Request;
}

describe("POST /api/webhooks/stripe (intégration webhook <-> sync <-> BDD)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (headers as unknown as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue("sig_valide"),
    });
  });

  it("refuse la requête si l'en-tête stripe-signature est absent", async () => {
    (headers as unknown as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(null),
    });
    const res = await POST(mockRequest("{}"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature/i);
    expect(stripe.webhooks.constructEvent).not.toHaveBeenCalled();
  });

  it("refuse la requête si la signature Stripe est invalide", async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
      throw new Error("Signature invalide");
    });
    const res = await POST(mockRequest("payload"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature invalide/i);
  });

  it("resynchronise l'abonnement en BDD sur customer.subscription.created", async () => {
    const subscription = { id: "sub_1", metadata: { userId: "u1" } };
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "customer.subscription.created",
      data: { object: subscription },
    });

    const res = await POST(mockRequest("payload"));

    expect(syncSubscriptionFromStripe).toHaveBeenCalledWith(subscription);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("resynchronise l'abonnement en BDD sur customer.subscription.updated", async () => {
    const subscription = { id: "sub_1", metadata: { userId: "u1" } };
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: subscription },
    });

    await POST(mockRequest("payload"));

    expect(syncSubscriptionFromStripe).toHaveBeenCalledWith(subscription);
  });

  it("déclenche la résiliation en BDD sur customer.subscription.deleted", async () => {
    const subscription = { id: "sub_1", metadata: { userId: "u1" } };
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: subscription },
    });

    await POST(mockRequest("payload"));

    expect(syncSubscriptionCancellation).toHaveBeenCalledWith(subscription);
  });

  it("crédite les tokens en BDD sur checkout.session.completed (mode=payment, type=tokens)", async () => {
    const session = {
      mode: "payment",
      metadata: { type: "tokens", userId: "u1" },
    };
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "checkout.session.completed",
      data: { object: session },
    });

    await POST(mockRequest("payload"));

    expect(processTokenPurchase).toHaveBeenCalledWith(session);
  });

  it("ignore checkout.session.completed si ce n'est pas un achat de tokens", async () => {
    const session = { mode: "subscription", metadata: {} };
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "checkout.session.completed",
      data: { object: session },
    });

    await POST(mockRequest("payload"));

    expect(processTokenPurchase).not.toHaveBeenCalled();
  });

  it("retourne une erreur 500 si le traitement de l'événement échoue", async () => {
    const subscription = { id: "sub_1", metadata: { userId: "u1" } };
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "customer.subscription.created",
      data: { object: subscription },
    });
    (syncSubscriptionFromStripe as jest.Mock).mockRejectedValue(
      new Error("DB down"),
    );

    const res = await POST(mockRequest("payload"));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/erreur traitement/i);
  });
});
