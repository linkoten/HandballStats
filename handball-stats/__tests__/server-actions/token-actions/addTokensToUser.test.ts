import { addTokensToUser } from "@/app/actions/token-actions";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// On mock les modules externes utilisés dans addTokensToUser
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe("addTokensToUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ajoute des tokens si admin général", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "admin-1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email: "admin@site.fr",
      role: "ADMIN_GENERAL",
    });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 2,
      email: "user@site.fr",
    });
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      return await cb({
        user: {
          update: jest.fn().mockResolvedValue({ tokensRemaining: 15 }),
        },
        tokenUsageHistory: {
          create: jest.fn(),
        },
      });
    });
    const res = await addTokensToUser("user@site.fr", 10, "bonus");
    expect(res.success).toBe(true);
    expect(res.data.newBalance).toBe(15);
    expect(res.data.message).toMatch(/10 tokens ajoutés/i);
  });

  it("retourne une erreur si non admin", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email: "user@site.fr",
      role: "USER",
    });
    const res = await addTokensToUser("user@site.fr", 10);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin général requis/i);
  });

  it("retourne une erreur si utilisateur cible introuvable", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "admin-1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email: "admin@site.fr",
      role: "ADMIN_GENERAL",
    });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await addTokensToUser("user@site.fr", 10);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/cible introuvable/i);
  });

  it("gère les erreurs inattendues", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "admin-1" });
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error("DB down"),
    );
    const res = await addTokensToUser("user@site.fr", 10);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/DB down/);
  });
});
