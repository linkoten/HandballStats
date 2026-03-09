import { getCompetitionsByEquipes } from "../../../app/actions/competition-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockCompetitionFindMany = jest.fn();
  return {
    __esModule: true,
    default: {
      competition: { findMany: mockCompetitionFindMany },
    },
  };
});
const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("getCompetitionsByEquipes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne les compétitions pour des équipes valides", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    const competitionsMock = [
      {
        id: 1,
        nom: "Compétition 1",
        equipe: { id: 1, nom: "Equipe 1", ville: "Paris" },
      },
    ];
    prisma.competition.findMany.mockResolvedValue(competitionsMock);
    const res = await getCompetitionsByEquipes([1]);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(competitionsMock);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getCompetitionsByEquipes([1]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });

  it("refuse si pas d'IDs d'équipes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    const res = await getCompetitionsByEquipes([]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/équipe/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.competition.findMany.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getCompetitionsByEquipes([1]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
