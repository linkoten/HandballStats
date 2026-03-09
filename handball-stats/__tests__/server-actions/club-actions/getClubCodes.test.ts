import { getClubCodes } from "../../../app/actions/club-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockClubFindMany = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      club: { findMany: mockClubFindMany },
    },
  };
});

const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("getClubCodes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait retourner les codes de club (cas nominal)", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42, role: "ADMIN_CLUB" });
    const clubsMock = [
      {
        id: 1,
        nom: "Club1",
        coachCode: "A",
        playerCode: "B",
        ville: "Paris",
        _count: { userClubs: 2, equipes: 1 },
      },
    ];
    prisma.club.findMany.mockResolvedValue(clubsMock);
    const res = await getClubCodes();
    expect(res.success).toBe(true);
    expect(res.data.clubs).toEqual(clubsMock);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getClubCodes();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });

  it("refuse si non admin", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42, role: "JOUEUR" });
    const res = await getClubCodes();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin|accès/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getClubCodes();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
