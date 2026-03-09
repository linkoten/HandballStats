import * as joueurActions from "../app/actions/joueur-actions";

jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    joueurs: {
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

describe("Joueur actions - lecture droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne une liste vide si pas d'accès", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.equipes = {
      findFirst: jest.fn().mockResolvedValue({ id: 1 }),
    };
    getUserAccessibleEquipeIds.mockResolvedValue([]);
    require("../lib/prisma").default.joueurs.findMany.mockResolvedValue([]);
    const res = await joueurActions.getJoueurs("1");
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("autorise la lecture des joueurs si accès", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.equipes = {
      findFirst: jest.fn().mockResolvedValue({ id: 1 }),
    };
    getUserAccessibleEquipeIds.mockResolvedValue([1, 2]);
    require("../lib/prisma").default.joueurs.findMany.mockResolvedValue([
      { id: 1, nom_prenom: "A", id_equipe: 1 },
      { id: 2, nom_prenom: "B", id_equipe: 1 },
    ]);
    const res = await joueurActions.getJoueurs("1");
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
  });
});
