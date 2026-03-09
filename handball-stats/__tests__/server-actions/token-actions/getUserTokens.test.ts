import { getUserTokens } from "@/app/actions/token-actions";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// On mock les modules externes utilisés dans getUserTokens
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("getUserTokens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne les tokens de l'utilisateur si authentifié", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      tokensRemaining: 5,
      tokensUsed: 10,
      subscription: { id: 1, type: "PREMIUM" },
      competitionAccess: [],
      tokenUsageHistory: [],
    });
    const res = await getUserTokens();
    expect(res.success).toBe(true);
    expect(res.data.tokensRemaining).toBe(5);
    expect(res.data.tokensUsed).toBe(10);
    expect(res.data.subscription).toEqual({ id: 1, type: "PREMIUM" });
  });

  it("retourne une erreur si non authentifié", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getUserTokens();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifié/i);
  });

  it("retourne une erreur si utilisateur introuvable", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-2" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await getUserTokens();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable/i);
  });

  it("gère les erreurs inattendues", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-3" });
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error("DB down"),
    );
    const res = await getUserTokens();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/DB down/);
  });
});
