import { updateCompetitionScrapingStatus } from "../../../app/actions/competition-actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockCompetitionUpdate = jest.fn();
  return {
    __esModule: true,
    default: {
      competition: { update: mockCompetitionUpdate },
    },
  };
});
const prisma = require("../../../lib/prisma").default;

describe("updateCompetitionScrapingStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("met à jour le statut de scraping d'une compétition", async () => {
    const competitionMock = { id: 1, scrapingStatus: "EN_COURS" };
    prisma.competition.update.mockResolvedValue(competitionMock);
    const res = await updateCompetitionScrapingStatus(1, "EN_COURS");
    expect(res.success).toBe(true);
    expect(res.data).toEqual(competitionMock);
    expect(prisma.competition.update).toHaveBeenCalled();
  });

  it("gère les erreurs internes", async () => {
    prisma.competition.update.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await updateCompetitionScrapingStatus(1, "EN_COURS");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
