import { createClub } from "../../../app/actions/club-actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockClubFindFirst = jest.fn();
  const mockClubCreate = jest.fn();
  const mockUserClubCreate = jest.fn();
  const mockUserUpdate = jest.fn();
  const mockTransaction = jest.fn(async (fn: any) => {
    return fn({
      club: { create: mockClubCreate },
      userClub: { create: mockUserClubCreate },
      user: { update: mockUserUpdate },
    });
  });
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
      club: { findFirst: mockClubFindFirst, create: mockClubCreate },
      userClub: { create: mockUserClubCreate },
      $transaction: mockTransaction,
    },
  };
});
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/access-control", () => ({
  checkUserClubRole: jest.fn(),
}));

const { auth } = require("@clerk/nextjs/server");
const { checkUserClubRole } = require("../../../lib/access-control");
const prisma = require("../../../lib/prisma").default;

describe("createClub", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("crée un club avec des données valides", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    checkUserClubRole.mockResolvedValue({
      isGeneralAdmin: true,
      isAdmin: false,
    });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.club.findFirst.mockResolvedValueOnce(null); // coachCode unique
    prisma.club.findFirst.mockResolvedValueOnce(null); // playerCode unique
    const clubMock = {
      id: 1,
      nom: "Club Test",
      coachCode: "ABC123",
      playerCode: "DEF456",
    };
    prisma.club.create.mockResolvedValue(clubMock);
    prisma.userClub.create.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});

    const res = await createClub({ nom: "Club Test" });
    expect(res.success).toBe(true);
    expect(res.data).toMatchObject(clubMock);
    expect(prisma.club.create).toHaveBeenCalled();
    expect(prisma.userClub.create).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("refuse si données invalides", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    checkUserClubRole.mockResolvedValue({
      isGeneralAdmin: true,
      isAdmin: false,
    });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    const res = await createClub({ nom: "" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/nom.*requis/i);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await createClub({ nom: "Club Test" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });
});
