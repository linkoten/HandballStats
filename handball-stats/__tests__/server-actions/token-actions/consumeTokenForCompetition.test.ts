// On mock les modules externes utilisés dans consumeTokenForCompetition
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    competitionAccess: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { consumeTokenForCompetition } from "@/app/actions/token-actions";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

describe("consumeTokenForCompetition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("consomme un token et accorde l'accès", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      tokensRemaining: 2,
    });
    (prisma.competitionAccess.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      return await cb({
        user: {
          update: jest
            .fn()
            .mockResolvedValue({ tokensRemaining: 1, tokensUsed: 1 }),
        },
        competitionAccess: {
          create: jest.fn().mockResolvedValue({ id: 123 }),
        },
        tokenUsageHistory: {
          create: jest.fn(),
        },
      });
    });
    const res = await consumeTokenForCompetition(42);
    expect(res.success).toBe(true);
    expect(res.data.remainingTokens).toBe(1);
    expect(res.data.accessId).toBe(123);
  });

  it("retourne une erreur si non authentifié", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    const res = await consumeTokenForCompetition(42);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifié/i);
  });

  it("retourne une erreur si utilisateur introuvable", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-2" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await consumeTokenForCompetition(42);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable/i);
  });

  it("retourne une erreur si tokens insuffisants", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-3" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      tokensRemaining: 0,
    });
    const res = await consumeTokenForCompetition(42);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/insuffisants/i);
  });

  it("retourne une erreur si accès déjà existant", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-4" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      tokensRemaining: 2,
    });
    (prisma.competitionAccess.findFirst as jest.Mock).mockResolvedValue({
      id: 999,
    });
    const res = await consumeTokenForCompetition(42);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/déjà accordé/i);
  });

  it("gère les erreurs inattendues", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-5" });
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error("DB down"),
    );
    const res = await consumeTokenForCompetition(42);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/DB down/);
  });
});
