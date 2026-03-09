import { createCompetition } from "../../../app/actions/competition-actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockEquipesFindUnique = jest.fn();
  const mockCompetitionCreate = jest.fn();
  const mockCompetitionAccessCreate = jest.fn();
  const mockTransaction = jest.fn(async (fn: any) => {
    return fn({
      competition: { create: mockCompetitionCreate },
      competitionAccess: { create: mockCompetitionAccessCreate },
      equipes: { findUnique: mockEquipesFindUnique },
      user: { findUnique: mockUserFindUnique },
    });
  });
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      equipes: { findUnique: mockEquipesFindUnique },
      competition: { create: mockCompetitionCreate },
      competitionAccess: { create: mockCompetitionAccessCreate },
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

describe("createCompetition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("crée une compétition avec des données valides", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.equipes.findUnique.mockResolvedValue({ id: 2, club: { id: 3 } });
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const competitionMock = {
      id: 1,
      nom: "Compétition Test",
      equipe: { id: 2, club: { id: 3 } },
    };
    prisma.competition.create.mockResolvedValue(competitionMock);
    prisma.competitionAccess.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    const res = await createCompetition({
      nom: "Compétition Test",
      genre: "MASCULIN",
      saison: "2025",
      equipeId: 2,
    });
    expect(res.success).toBe(true);
    expect(res.data).toEqual(competitionMock);
    expect(prisma.competition.create).toHaveBeenCalled();
    expect(prisma.competitionAccess.create).toHaveBeenCalled();
  });

  it("refuse si données invalides", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    // genre et equipeId doivent être valides, mais on teste les autres champs invalides
    const res = await createCompetition({
      nom: "",
      genre: "MASCULIN",
      saison: "",
      equipeId: 1,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/nom|genre|saison|équipe/i);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await createCompetition({
      nom: "Compétition Test",
      genre: "MASCULIN",
      saison: "2025",
      equipeId: 2,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });
});
