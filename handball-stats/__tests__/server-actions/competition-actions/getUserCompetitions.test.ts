import { getUserCompetitions } from "../../../app/actions/competition-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockCompetitionAccessFindMany = jest.fn();
  const mockUserClubFindMany = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      competitionAccess: { findMany: mockCompetitionAccessFindMany },
      userClub: { findMany: mockUserClubFindMany },
    },
  };
});
const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("getUserCompetitions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne les compétitions de l'utilisateur", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    const compA = {
      id: 1,
      nom: "CompA",
      saison: "2025",
      equipe: { id: 1, nom: "E1", ville: "Paris", club: { id: 1, nom: "C1" } },
    };
    const compB = {
      id: 2,
      nom: "CompB",
      saison: "2024",
      equipe: { id: 2, nom: "E2", ville: "Lyon", club: { id: 2, nom: "C2" } },
    };
    prisma.competitionAccess.findMany.mockResolvedValue([
      { competition: compA },
    ]);
    prisma.userClub.findMany.mockResolvedValue([
      { club: { equipes: [{ competitions: [compB] }] } },
    ]);
    const res = await getUserCompetitions();
    expect(res.success).toBe(true);
    expect(res.data).toEqual([compA, compB]);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getUserCompetitions();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getUserCompetitions();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
