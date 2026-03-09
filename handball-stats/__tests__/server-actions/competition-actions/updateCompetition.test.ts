import { updateCompetition } from "../../../app/actions/competition-actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockCompetitionFindUnique = jest.fn();
  const mockCompetitionUpdate = jest.fn();
  const mockUserFindUnique = jest.fn();
  const mockEquipesFindFirst = jest.fn();
  return {
    __esModule: true,
    default: {
      competition: {
        findUnique: mockCompetitionFindUnique,
        update: mockCompetitionUpdate,
      },
      user: { findUnique: mockUserFindUnique },
      equipes: { findFirst: mockEquipesFindFirst },
    },
  };
});
jest.mock("../../../lib/access-control", () => ({
  checkUserClubRole: jest.fn(),
}));
const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;
const { checkUserClubRole } = require("../../../lib/access-control");

describe("updateCompetition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("met à jour une compétition existante", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.competition.findUnique.mockResolvedValue({
      id: 1,
      equipe: { club: { id: 2 } },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const updatedMock = {
      id: 1,
      nom: "Compétition MAJ",
      equipe: { club: { id: 2 } },
    };
    prisma.competition.update.mockResolvedValue(updatedMock);
    const res = await updateCompetition(1, { nom: "Compétition MAJ" });
    expect(res.success).toBe(true);
    expect(res.data).toEqual(updatedMock);
    expect(prisma.competition.update).toHaveBeenCalled();
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await updateCompetition(1, { nom: "Compétition MAJ" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });

  it("refuse si compétition inexistante", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.competition.findUnique.mockResolvedValue(null);
    const res = await updateCompetition(999, { nom: "Compétition MAJ" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.competition.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await updateCompetition(1, { nom: "Compétition MAJ" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
