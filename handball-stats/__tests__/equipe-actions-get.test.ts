import * as equipeActions from "../app/actions/equipe-actions";

jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    equipes: {
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

describe("Equipe actions - lecture droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne une liste vide si pas d'accès", async () => {
    getUserAccessibleEquipeIds.mockResolvedValue([]);
    require("../lib/prisma").default.equipes.findMany.mockResolvedValue([]);
    const res = await equipeActions.getEquipesByClub("1");
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("autorise la lecture des équipes si accès", async () => {
    getUserAccessibleEquipeIds.mockResolvedValue([1, 2]);
    require("../lib/prisma").default.equipes.findMany.mockResolvedValue([
      { id: 1, nom: "A", clubId: 1 },
      { id: 2, nom: "B", clubId: 1 },
    ]);
    const res = await equipeActions.getEquipesByClub("1");
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
  });
});
