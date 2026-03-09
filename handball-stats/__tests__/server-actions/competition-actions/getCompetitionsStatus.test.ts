import { getCompetitionsStatus } from "../../../app/actions/competition-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockCompetitionFindMany = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      competition: { findMany: mockCompetitionFindMany },
    },
  };
});
const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("getCompetitionsStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne le statut des compétitions", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    const competitionsMock = [
      {
        id: 1,
        nom: "Comp1",
        saison: "2025",
        niveau: "N1",
        equipe: { nom: "E1", club: { nom: "C1" } },
        scrapingStatus: "COMPLETED",
        scrapingProgress: 100,
        scrapingStep: null,
        scrapingError: null,
        lastScrapedAt: new Date(),
        matchs: [
          { id: 1, _count: { statistiques_joueur: 2 } },
          { id: 2, _count: { statistiques_joueur: 0 } },
        ],
      },
    ];
    prisma.competition.findMany.mockResolvedValue(competitionsMock);
    const res = await getCompetitionsStatus([1]);
    expect(res.success).toBe(true);
    expect(res.data.competitions[0].id).toBe(1);
    expect(res.data.summary.total).toBe(1);
    expect(res.data.globalStatus).toBe("COMPLETED");
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getCompetitionsStatus([1]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });

  it("refuse si pas d'IDs de compétitions", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    const res = await getCompetitionsStatus([]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/id/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getCompetitionsStatus([1]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
