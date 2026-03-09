import * as competitionActions from "../app/actions/competition-actions";

jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    competition: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));
jest.mock("server-only", () => ({}));
jest.mock("@clerk/nextjs", () => ({
  auth: jest.fn(() => ({ userId: "test-user" })),
}));
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(() => ({ userId: "test-user" })),
}));
jest.mock("../lib/access-control", () => ({
  getUserAccessibleEquipeIds: jest.fn(),
}));
const { getUserAccessibleEquipeIds } = require("../lib/access-control");

describe("Competition actions - lecture droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne une liste vide si pas d'accès", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    getUserAccessibleEquipeIds.mockResolvedValue([]);
    require("../lib/prisma").default.competition.findMany.mockResolvedValue([]);
    const res = await competitionActions.getCompetitionsByEquipes([1]);
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("autorise la lecture des compétitions si accès", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    getUserAccessibleEquipeIds.mockResolvedValue([1, 2]);
    require("../lib/prisma").default.competition.findMany.mockResolvedValue([
      { id: 1, nom: "A", equipeId: 1 },
      { id: 2, nom: "B", equipeId: 2 },
    ]);
    const res = await competitionActions.getCompetitionsByEquipes([1, 2]);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
  });
});
