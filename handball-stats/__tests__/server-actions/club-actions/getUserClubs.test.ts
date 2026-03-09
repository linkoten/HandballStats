import { getUserClubs } from "../../../app/actions/club-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockUserClubFindMany = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      userClub: { findMany: mockUserClubFindMany },
    },
  };
});
const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("getUserClubs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne le club principal ou le premier club de l'utilisateur", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    const userClubMock = {
      club: { id: 1, nom: "Club1", _count: { equipes: 2, userClubs: 3 } },
    };
    prisma.userClub.findFirst = jest.fn().mockResolvedValue(userClubMock);
    const res = await getUserClubs();
    expect(res.success).toBe(true);
    expect(res.data).toEqual(userClubMock);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getUserClubs();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getUserClubs();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
