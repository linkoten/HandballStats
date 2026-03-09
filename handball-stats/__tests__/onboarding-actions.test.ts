import {
  selectOnboardingClub,
  getOnboardingSelectedClub,
  selectOnboardingTeams,
  getOnboardingSelectedTeams,
  configureCompetitionsBatch,
  clearOnboardingData,
  getOnboardingEquipesByClub,
} from "../app/actions/onboarding-actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    userClub: { findFirst: jest.fn() },
    club: { findUnique: jest.fn() },
    equipes: { findMany: jest.fn() },
    competition: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    competitionAccess: { create: jest.fn() },
  },
}));
jest.mock("@clerk/nextjs/server");
jest.mock("next/headers");

describe("Onboarding actions - droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("selectOnboardingClub", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await selectOnboardingClub(1);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentifié/);
    });
    it("refuse si user inconnu", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await selectOnboardingClub(1);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/introuvable/);
    });
    it("refuse si pas accès club", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.userClub.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await selectOnboardingClub(1);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/non autorisé/);
    });
    it("accepte si accès club", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.userClub.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
      const set = jest.fn();
      (cookies as jest.Mock).mockReturnValue({ set });
      const res = await selectOnboardingClub(1);
      expect(res.success).toBe(true);
      expect(res.data.clubId).toBe(1);
      expect(set).toHaveBeenCalled();
    });
  });

  describe("getOnboardingSelectedClub", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await getOnboardingSelectedClub();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentifié/);
    });
    it("refuse si aucun club sélectionné", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (cookies as jest.Mock).mockReturnValue({ get: () => undefined });
      const res = await getOnboardingSelectedClub();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Aucun club/);
    });
    it("refuse si club introuvable", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (cookies as jest.Mock).mockReturnValue({ get: () => ({ value: "1" }) });
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await getOnboardingSelectedClub();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/introuvable/);
    });
    it("accepte si club trouvé", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (cookies as jest.Mock).mockReturnValue({ get: () => ({ value: "1" }) });
      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        nom: "Club",
        _count: { equipes: 2 },
      });
      const res = await getOnboardingSelectedClub();
      expect(res.success).toBe(true);
      expect(res.data.id).toBe(1);
    });
  });

  describe("selectOnboardingTeams", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await selectOnboardingTeams([1, 2]);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentifié/);
    });
    it("refuse si user inconnu", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await selectOnboardingTeams([1, 2]);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/introuvable/);
    });
    it("refuse si équipe non autorisée", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.equipes.findMany as jest.Mock).mockResolvedValue([]);
      const res = await selectOnboardingTeams([1, 2]);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/pas autorisées/);
    });
    it("accepte si accès équipes", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.equipes.findMany as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      const set = jest.fn();
      (cookies as jest.Mock).mockReturnValue({ set });
      const res = await selectOnboardingTeams([1, 2]);
      expect(res.success).toBe(true);
      expect(res.data.equipeIds).toEqual([1, 2]);
      expect(set).toHaveBeenCalled();
    });
  });

  describe("getOnboardingSelectedTeams", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await getOnboardingSelectedTeams();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentifié/);
    });
    it("refuse si aucune équipe sélectionnée", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (cookies as jest.Mock).mockReturnValue({ get: () => undefined });
      const res = await getOnboardingSelectedTeams();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Aucune équipe/);
    });
    it("accepte si équipes trouvées", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (cookies as jest.Mock).mockReturnValue({
        get: () => ({ value: "[1,2]" }),
      });
      (prisma.equipes.findMany as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      const res = await getOnboardingSelectedTeams();
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(2);
    });
  });

  describe("clearOnboardingData", () => {
    it("supprime les cookies d'onboarding", async () => {
      const del = jest.fn();
      (cookies as jest.Mock).mockReturnValue({ delete: del });
      const res = await clearOnboardingData();
      expect(res.success).toBe(true);
      expect(del).toHaveBeenCalledTimes(2);
    });
  });

  describe("getOnboardingEquipesByClub", () => {
    it("refuse si non authentifié", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const res = await getOnboardingEquipesByClub(1);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentifié/);
    });
    it("refuse si user inconnu", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await getOnboardingEquipesByClub(1);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/introuvable/);
    });
    it("refuse si pas accès club", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.userClub.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await getOnboardingEquipesByClub(1);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/non autorisé/);
    });
    it("accepte si accès club", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.userClub.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.equipes.findMany as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      const res = await getOnboardingEquipesByClub(1);
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(2);
    });
  });
});
