import { getOnboardingSelectedClub } from "@/app/actions/onboarding-actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    club: { findUnique: jest.fn() },
  },
}));
jest.mock("@clerk/nextjs/server");
jest.mock("next/headers");

const mockGet = jest.fn();
const mockCookies = () => ({ get: mockGet });
(cookies as unknown as jest.Mock).mockImplementation(mockCookies);

describe("getOnboardingSelectedClub", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
  });

  it("should return error if not authenticated", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getOnboardingSelectedClub();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifié/);
  });

  it("should return error if no club selected in cookies", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    mockGet.mockReturnValue(undefined);
    const res = await getOnboardingSelectedClub();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Aucun club sélectionné/);
  });

  it("should return error if club not found", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    mockGet.mockReturnValue({ value: "42" });
    (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await getOnboardingSelectedClub();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Club introuvable/);
  });

  it("should return club data if found", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    mockGet.mockReturnValue({ value: "42" });
    const club = { id: 42, nom: "Club Test", _count: { equipes: 3 } };
    (prisma.club.findUnique as jest.Mock).mockResolvedValue(club);
    const res = await getOnboardingSelectedClub();
    expect(res.success).toBe(true);
    expect(res.data).toEqual(club);
  });

  it("should return generic error on unexpected exception", async () => {
    (auth as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getOnboardingSelectedClub();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
