import { validateClubCode } from "../../../app/actions/club-actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockClubFindFirst = jest.fn();
  const mockUserClubFindFirst = jest.fn();
  const mockUserUpdate = jest.fn();
  const mockUserClubCreate = jest.fn();
  const mockTransaction = jest.fn(async (fn: any) => {
    return fn({
      user: { update: mockUserUpdate },
      userClub: { create: mockUserClubCreate },
    });
  });
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
      club: { findFirst: mockClubFindFirst },
      userClub: {
        findFirst: mockUserClubFindFirst,
        create: mockUserClubCreate,
      },
      $transaction: mockTransaction,
    },
  };
});
jest.mock("../../../lib/access-control", () => ({
  checkUserClubRole: jest.fn(),
}));
const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;
const { checkUserClubRole } = require("../../../lib/access-control");

describe("validateClubCode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("valide un code correct", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.club.findFirst.mockResolvedValue({
      id: 10,
      nom: "ClubTest",
      coachCode: "CODE1",
      playerCode: "CODE2",
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isGeneralAdmin: false,
    });
    prisma.userClub.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({});
    prisma.userClub.create.mockResolvedValue({});
    const res = await validateClubCode("CODE1");
    expect(res.success).toBe(true);
    expect(res.data.newRole).toBe("ENTRAINEUR");
    expect(res.data.clubName).toBe("ClubTest");
  });

  it("refuse un code incorrect", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.club.findFirst.mockResolvedValue(null);
    const res = await validateClubCode("FAUXCODE");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalide|introuvable/i);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await validateClubCode("CODE1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });
});
