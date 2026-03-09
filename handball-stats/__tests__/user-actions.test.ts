import {
  syncUser,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
} from "../app/actions/user-actions";
import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  },
}));
jest.mock("@clerk/nextjs/server");

describe("User actions - droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("syncUser", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      await expect(syncUser()).rejects.toThrow(/authentifié/);
    });
    it("refuse si Clerk user absent", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (currentUser as unknown as jest.Mock).mockResolvedValue(null);
      await expect(syncUser()).rejects.toThrow(/Clerk/);
    });
    it("upsert si user absent", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (currentUser as unknown as jest.Mock).mockResolvedValue({
        emailAddresses: [{ emailAddress: "a@b.com" }],
        firstName: "A",
        lastName: "B",
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: 1,
        email: "a@b.com",
      });
      const res = await syncUser();
      expect(res).toMatchObject({ id: 1, email: "a@b.com" });
    });
    it("update si user existant mais mauvais clerkId", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (currentUser as unknown as jest.Mock).mockResolvedValue({
        emailAddresses: [{ emailAddress: "a@b.com" }],
        firstName: "A",
        lastName: "B",
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: "a@b.com",
        clerkId: "old",
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 1,
        email: "a@b.com",
        clerkId: "u1",
      });
      const res = await syncUser();
      expect(res).toMatchObject({ id: 1, email: "a@b.com", clerkId: "u1" });
    });
    it("update infos si user existant et bon clerkId", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (currentUser as unknown as jest.Mock).mockResolvedValue({
        emailAddresses: [{ emailAddress: "a@b.com" }],
        firstName: "A",
        lastName: "B",
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: "a@b.com",
        clerkId: "u1",
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 1,
        email: "a@b.com",
        clerkId: "u1",
      });
      const res = await syncUser();
      expect(res).toMatchObject({ id: 1, email: "a@b.com", clerkId: "u1" });
    });
  });

  describe("getCurrentUser", () => {
    it("retourne null si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await getCurrentUser();
      expect(res).toBeNull();
    });
    it("retourne user si trouvé", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      const res = await getCurrentUser();
      expect(res).toMatchObject({ id: 1 });
    });
  });

  describe("getUserProfile", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await getUserProfile();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentifié/);
    });
    it("retourne profil si user trouvé", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        clerkId: "u1",
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        subscription: "GRATUIT",
        role: "UTILISATEUR",
        tokensRemaining: 10,
        tokensUsed: 0,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        clubs: [
          {
            club: {
              id: 1,
              nom: "Club",
              ville: "Paris",
              coachCode: "X",
              playerCode: "Y",
            },
          },
        ],
        competitionAccess: [
          {
            competition: {
              id: 1,
              nom: "Compétition",
              saison: "2023-2024",
              equipe: { nom: "Équipe", club: { nom: "Club" } },
            },
          },
        ],
      });
      const res = await getUserProfile();
      expect(res.success).toBe(true);
      expect(res.data.id).toBe(1);
      expect(res.data.clubs.length).toBe(1);
      expect(res.data.recentCompetitions.length).toBe(1);
    });
  });

  describe("updateUserProfile", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await updateUserProfile({ firstName: "A" });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentifié/);
    });
    it("refuse si user introuvable", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await updateUserProfile({ firstName: "A" });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/introuvable/);
    });
    it("accepte la mise à jour", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 1,
        firstName: "A",
      });
      const res = await updateUserProfile({ firstName: "A" });
      expect(res.success).toBe(true);
      expect(res.data.id).toBe(1);
      expect(res.data.firstName).toBe("A");
    });
  });
});
