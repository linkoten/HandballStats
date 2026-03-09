// Tests pour getMatchsByEquipe
import { getMatchs } from "../../../app/actions/match-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockUserClubFindMany = jest.fn();
  const mockCompetitionAccessFindMany = jest.fn();
  const mockEquipesFindUnique = jest.fn();
  const mockMatchsFindMany = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      userClub: { findMany: mockUserClubFindMany },
      competitionAccess: { findMany: mockCompetitionAccessFindMany },
      equipes: { findUnique: mockEquipesFindUnique },
      matchs: { findMany: mockMatchsFindMany },
    },
  };
});

const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("getMatchs (via getMatchs)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getMatchs({ equipeId: "1" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non authentifié/i);
  });

  it("retourne une liste vide si aucun accès à aucune équipe", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.userClub.findMany.mockResolvedValue([]);
    prisma.competitionAccess.findMany.mockResolvedValue([]);
    const res = await getMatchs({ equipeId: "1" });
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getMatchs({ equipeId: "1" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
