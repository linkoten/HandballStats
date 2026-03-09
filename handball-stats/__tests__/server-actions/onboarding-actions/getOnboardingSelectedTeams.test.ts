import { getOnboardingSelectedTeams } from "@/app/actions/onboarding-actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    equipes: { findMany: jest.fn() },
  },
}));
jest.mock("@clerk/nextjs/server");
jest.mock("next/headers");

const mockGet = jest.fn();
const mockCookies = () => ({ get: mockGet });
(cookies as unknown as jest.Mock).mockImplementation(mockCookies);

describe("getOnboardingSelectedTeams", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
  });

  it("should return error if not authenticated", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getOnboardingSelectedTeams();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifié/);
  });

  it("should return error if no teams selected in cookies", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    mockGet.mockReturnValue(undefined);
    const res = await getOnboardingSelectedTeams();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Aucune équipe sélectionnée/);
  });

  it("should return teams data if found", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    mockGet.mockReturnValue({ value: JSON.stringify([1, 2]) });
    const equipes = [
      { id: 1, club: { id: 1, nom: "Club1" } },
      { id: 2, club: { id: 1, nom: "Club1" } },
    ];
    (prisma.equipes.findMany as jest.Mock).mockResolvedValue(equipes);
    const res = await getOnboardingSelectedTeams();
    expect(res.success).toBe(true);
    expect(res.data).toEqual(equipes);
  });

  it("should return generic error on unexpected exception", async () => {
    (auth as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getOnboardingSelectedTeams();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
