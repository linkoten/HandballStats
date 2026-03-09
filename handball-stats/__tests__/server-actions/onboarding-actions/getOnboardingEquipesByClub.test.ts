import { getOnboardingEquipesByClub } from "@/app/actions/onboarding-actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    userClub: { findFirst: jest.fn() },
    equipes: { findMany: jest.fn() },
  },
}));
jest.mock("@clerk/nextjs/server");

describe("getOnboardingEquipesByClub", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return error if not authenticated", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getOnboardingEquipesByClub(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifié/);
  });

  it("should return error if user not found", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await getOnboardingEquipesByClub(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable/);
  });

  it("should return error if user has no access to club", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2 });
    (prisma.userClub.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getOnboardingEquipesByClub(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non autorisé/);
  });

  it("should return teams if access is valid", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2 });
    (prisma.userClub.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
    const equipes = [
      { id: 1, nom: "Equipe 1", _count: { competitions: 2, joueurs: 10 } },
      { id: 2, nom: "Equipe 2", _count: { competitions: 1, joueurs: 8 } },
    ];
    (prisma.equipes.findMany as jest.Mock).mockResolvedValue(equipes);
    const res = await getOnboardingEquipesByClub(1);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(equipes);
  });

  it("should return generic error on unexpected exception", async () => {
    (auth as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getOnboardingEquipesByClub(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
