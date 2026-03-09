import { configureCompetitionsBatch } from "@/app/actions/onboarding-actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    equipes: { findFirst: jest.fn() },
    competition: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    competitionAccess: { create: jest.fn() },
  },
}));
jest.mock("@clerk/nextjs/server");
jest.mock("next/headers");
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

global.fetch = jest.fn();
const mockDelete = jest.fn();
const mockCookies = () => ({ delete: mockDelete });
(cookies as unknown as jest.Mock).mockImplementation(mockCookies);

describe("configureCompetitionsBatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDelete.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  it("should return error if not authenticated", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    const res = await configureCompetitionsBatch([]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifié/);
  });

  it("should return error if competitions is not array", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    const res = await configureCompetitionsBatch(undefined as any);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Tableau de compétitions requis/);
  });

  it("should return error if user not found", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await configureCompetitionsBatch([]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable/);
  });

  it("should return error if team access is denied", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2 });
    (prisma.equipes.findFirst as jest.Mock).mockResolvedValue(null);
    const config = [
      {
        equipeId: 1,
        competition_name: "C",
        saison: "2023",
        equipe_bdd: "E",
        url: "U",
        max_journees: "1",
      },
    ];
    const res = await configureCompetitionsBatch(config as any);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non autorisé/);
  });

  it("should return success and call fetch if all valid", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2 });
    (prisma.equipes.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      club: { id: 1 },
    });
    (prisma.competition.create as jest.Mock).mockResolvedValue({ id: 10 });
    (prisma.competitionAccess.create as jest.Mock).mockResolvedValue({});
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    process.env.NEXT_PUBLIC_API_URL = "http://localhost";
    const config = [
      {
        equipeId: 1,
        competition_name: "C",
        saison: "2023",
        equipe_bdd: "E",
        url: "U",
        max_journees: "1",
      },
    ];
    const res = await configureCompetitionsBatch(config as any);
    expect(res.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith("onboarding-selected-club");
    expect(mockDelete).toHaveBeenCalledWith("onboarding-selected-equipes");
    expect(global.fetch).toHaveBeenCalled();
  });

  it("should return generic error on unexpected exception", async () => {
    (auth as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await configureCompetitionsBatch([]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
