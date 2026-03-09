import { getCompetitionById } from "../../../app/actions/competition-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockCompetitionFindFirst = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      competition: { findFirst: mockCompetitionFindFirst },
    },
  };
});
const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("getCompetitionById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne la compétition demandée", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    const competitionMock = { id: 1, nom: "Compétition 1" };
    prisma.competition.findFirst.mockResolvedValue(competitionMock);
    const res = await getCompetitionById(1);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(competitionMock);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getCompetitionById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });

  it("refuse si compétition inexistante", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.competition.findFirst.mockResolvedValue(null);
    const res = await getCompetitionById(999);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable|non autorisée/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getCompetitionById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
