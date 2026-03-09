import { selectOnboardingTeams } from "@/app/actions/onboarding-actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    equipes: { findMany: jest.fn() },
  },
}));
jest.mock("@clerk/nextjs/server");
jest.mock("next/headers");

const mockSet = jest.fn();
const mockCookies = () => ({ set: mockSet });
(cookies as unknown as jest.Mock).mockImplementation(mockCookies);

describe("selectOnboardingTeams", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockClear();
  });

  it("should return error if not authenticated", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
    const res = await selectOnboardingTeams([1, 2]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifié/);
  });

  it("should return error if user not found", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await selectOnboardingTeams([1, 2]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable/);
  });

  it("should return error if some teams are not authorized", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2 });
    (prisma.equipes.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);
    const res = await selectOnboardingTeams([1, 2]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/pas autorisées/);
  });

  it("should select teams and set cookie if all authorized", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "u1" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2 });
    (prisma.equipes.findMany as jest.Mock).mockResolvedValue([
      { id: 1 },
      { id: 2 },
    ]);
    const res = await selectOnboardingTeams([1, 2]);
    expect(res.success).toBe(true);
    expect(res.data.equipeIds).toEqual([1, 2]);
    expect(mockSet).toHaveBeenCalledWith(
      "onboarding-selected-equipes",
      JSON.stringify([1, 2]),
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("should return generic error on unexpected exception", async () => {
    (auth as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await selectOnboardingTeams([1, 2]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
