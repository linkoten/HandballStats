import { selectOnboardingClub } from "@/app/actions/onboarding-actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    userClub: { findFirst: jest.fn() },
  },
}));
jest.mock("@clerk/nextjs/server");
jest.mock("next/headers");

const mockSet = jest.fn();
const mockCookies = () => ({ set: mockSet });
(cookies as unknown as jest.Mock).mockImplementation(mockCookies);

describe("selectOnboardingClub", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockClear();
  });

  it("should return error if not authenticated", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    const res = await selectOnboardingClub(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifié/);
  });

  it("should return error if user not found", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await selectOnboardingClub(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable/);
  });

  it("should return error if user has no access to club", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2 });
    (prisma.userClub.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await selectOnboardingClub(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non autorisé/);
  });

  it("should select club and set cookie if access is valid", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2 });
    (prisma.userClub.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
    const res = await selectOnboardingClub(42);
    expect(res.success).toBe(true);
    expect(res.data.clubId).toBe(42);
    expect(mockSet).toHaveBeenCalledWith(
      "onboarding-selected-club",
      "42",
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("should return generic error on unexpected exception", async () => {
    (auth as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await selectOnboardingClub(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
