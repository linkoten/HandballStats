import { getUserTokens, addTokensToUser } from "../app/actions/token-actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@clerk/nextjs/server");

describe("Token actions - droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserTokens", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await getUserTokens();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentifié/);
    });
    it("refuse si user introuvable", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await getUserTokens();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/introuvable/);
    });
    it("retourne les tokens si user trouvé", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        tokensRemaining: 10,
        tokensUsed: 5,
        subscription: "GRATUIT",
        competitionAccess: [],
        tokenUsageHistory: [],
      });
      const res = await getUserTokens();
      expect(res.success).toBe(true);
      expect(res.data.tokensRemaining).toBe(10);
    });
  });

  describe("addTokensToUser", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await addTokensToUser("target", 5);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentifié/);
    });
    it("refuse si pas admin général", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "admin" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: "UTILISATEUR",
      });
      const res = await addTokensToUser("target", 5);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/admin général/);
    });
    it("refuse si nombre de tokens invalide", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "admin" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: "ADMIN_GENERAL",
      });
      const res = await addTokensToUser("target", 0);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/invalide/);
    });
    it("refuse si utilisateur cible introuvable", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "admin" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: "ADMIN_GENERAL",
        email: "admin@a.com",
      });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await addTokensToUser("target", 5);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/cible introuvable/);
    });
    it("accepte l'ajout de tokens si admin général", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "admin" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: "ADMIN_GENERAL",
        email: "admin@a.com",
      });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 2,
        email: "target@a.com",
      });
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) =>
        cb({
          user: {
            update: jest.fn().mockResolvedValue({ tokensRemaining: 15 }),
          },
          tokenUsageHistory: { create: jest.fn() },
        }),
      );
      const res = await addTokensToUser("target", 5);
      expect(res.success).toBe(true);
      expect(res.data.newBalance).toBe(15);
      expect(res.data.message).toMatch(/5 tokens ajoutés/);
    });
  });
});
