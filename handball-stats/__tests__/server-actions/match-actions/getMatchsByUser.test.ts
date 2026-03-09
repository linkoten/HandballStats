// Tests pour getMatchsByUser
import { getMatchsByUser } from "../../../app/actions/match-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockCompetitionAccessFindMany = jest.fn();
  const mockMatchsFindMany = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      competitionAccess: { findMany: mockCompetitionAccessFindMany },
      matchs: { findMany: mockMatchsFindMany },
    },
  };
});

const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("getMatchsByUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne les matchs accessibles à l'utilisateur", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.competitionAccess.findMany.mockResolvedValue([
      { competitionId: 1 },
      { competitionId: 2 },
    ]);
    const matchsMock = [
      {
        id: 1,
        competitionId: 1,
        equipes_matchs_equipe_recevant_idToequipes: {
          id: 1,
          nom: "Equipe1",
          ville: "Paris",
        },
        equipes_matchs_equipe_exterieur_idToequipes: {
          id: 2,
          nom: "Equipe2",
          ville: "Lyon",
        },
        competition: { id: 1, nom: "Comp1", saison: "2024" },
      },
    ];
    prisma.matchs.findMany.mockResolvedValue(matchsMock);
    const res = await getMatchsByUser();
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
    expect(res.data[0].id).toBe(1);
    expect(prisma.matchs.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ competitionId: { in: [1, 2] } }),
      }),
    );
  });

  it("retourne une liste vide si aucune compétition accessible", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.competitionAccess.findMany.mockResolvedValue([]);
    const res = await getMatchsByUser();
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getMatchsByUser();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non authentifié/i);
  });

  it("refuse si utilisateur introuvable", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await getMatchsByUser();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/utilisateur introuvable/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getMatchsByUser();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
