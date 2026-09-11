jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userClub: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import {
  getClubEntraineurs,
  removeEntraineurRole,
  promoteToAdmin,
  checkDowngradeQuotas,
} from "@/app/actions/entraineur-actions";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

describe("entraineur-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getClubEntraineurs", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await getClubEntraineurs(1);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentifié/i);
    });

    it("refuse un rôle non autorisé (ex: rôle inconnu)", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        role: "AUTRE",
      });
      const res = await getClubEntraineurs(1);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/accès refusé/i);
    });

    it("retourne les membres du club ainsi que la limite du plan de l'admin", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u1",
        role: "ADMIN_CLUB",
      });
      (prisma.userClub.findMany as jest.Mock).mockResolvedValue([
        {
          user: {
            id: "u1",
            role: "ADMIN_CLUB",
            subscription: "PRO",
          },
        },
        {
          user: {
            id: "u2",
            role: "ENTRAINEUR",
            subscription: "GRATUIT",
          },
        },
      ]);

      const res = await getClubEntraineurs(5);

      expect(res.success).toBe(true);
      expect(res.data.total).toBe(2);
      expect(res.data.planKey).toBe("PRO");
      expect(res.data.maxEntraineurs).toBe(3);
    });
  });

  describe("removeEntraineurRole", () => {
    function mockAdmin(role = "ADMIN_CLUB") {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "admin-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "admin-id",
        role,
      });
      (prisma.userClub.findFirst as jest.Mock).mockResolvedValueOnce({
        userId: "admin-id",
        clubId: 5,
      });
    }

    it("refuse que l'admin se rétrograde lui-même", async () => {
      mockAdmin();
      const res = await removeEntraineurRole("admin-id", 5);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/propre rôle/i);
    });

    it("refuse si la cible n'est pas membre du club", async () => {
      mockAdmin();
      (prisma.userClub.findFirst as jest.Mock).mockResolvedValueOnce(null);
      const res = await removeEntraineurRole("user-2", 5);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/n'est pas membre/i);
    });

    it("refuse qu'un ADMIN_CLUB rétrograde un autre ADMIN_CLUB", async () => {
      mockAdmin("ADMIN_CLUB");
      (prisma.userClub.findFirst as jest.Mock).mockResolvedValueOnce({
        userId: "user-2",
        clubId: 5,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "user-2",
        role: "ADMIN_CLUB",
      });
      const res = await removeEntraineurRole("user-2", 5);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/admin_général/i);
    });

    it("rétrograde un entraîneur en JOUEUR", async () => {
      mockAdmin("ADMIN_CLUB");
      (prisma.userClub.findFirst as jest.Mock).mockResolvedValueOnce({
        userId: "user-2",
        clubId: 5,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "user-2",
        role: "ENTRAINEUR",
      });
      const res = await removeEntraineurRole("user-2", 5);
      expect(res.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-2" },
        data: { role: "JOUEUR" },
      });
    });
  });

  describe("promoteToAdmin", () => {
    function mockAdmin(role = "ADMIN_CLUB") {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "admin-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "admin-id",
        role,
      });
      (prisma.userClub.findFirst as jest.Mock).mockResolvedValueOnce({
        userId: "admin-id",
        clubId: 5,
      });
    }

    it("refuse de se promouvoir soi-même", async () => {
      mockAdmin();
      const res = await promoteToAdmin("admin-id", 5);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/déjà administrateur/i);
    });

    it("refuse si la cible n'est pas membre du club", async () => {
      mockAdmin();
      (prisma.userClub.findFirst as jest.Mock).mockResolvedValueOnce(null);
      const res = await promoteToAdmin("user-2", 5);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/n'est pas membre/i);
    });

    it("promeut un membre au rôle ADMIN_CLUB", async () => {
      mockAdmin();
      (prisma.userClub.findFirst as jest.Mock).mockResolvedValueOnce({
        userId: "user-2",
        clubId: 5,
      });
      const res = await promoteToAdmin("user-2", 5);
      expect(res.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-2" },
        data: { role: "ADMIN_CLUB" },
      });
    });
  });

  describe("checkDowngradeQuotas", () => {
    it("autorise le downgrade si le nombre d'entraîneurs respecte la limite du plan cible", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.userClub.count as jest.Mock).mockResolvedValue(1);
      const res = await checkDowngradeQuotas(5, "STARTER");
      expect(res.success).toBe(true);
      expect(res.data.canDowngrade).toBe(true);
      expect(res.data.excessEntraineurs).toBe(0);
    });

    it("bloque le downgrade si le nombre d'entraîneurs dépasse la limite du plan cible", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.userClub.count as jest.Mock).mockResolvedValue(5);
      const res = await checkDowngradeQuotas(5, "STARTER");
      expect(res.success).toBe(true);
      expect(res.data.canDowngrade).toBe(false);
      expect(res.data.excessEntraineurs).toBe(4);
    });

    it("n'impose aucune limite pour le plan PREMIUM (illimité)", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user-1" });
      (prisma.userClub.count as jest.Mock).mockResolvedValue(50);
      const res = await checkDowngradeQuotas(5, "PREMIUM");
      expect(res.success).toBe(true);
      expect(res.data.canDowngrade).toBe(true);
      expect(res.data.excessEntraineurs).toBe(0);
    });
  });
});
