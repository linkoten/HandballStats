jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock Prisma, server-only, and Clerk
jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    joueurs: {
      create: jest.fn(),
    },
    equipes: {
      findUnique: jest.fn(),
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
  checkUserClubRole: jest.fn(),
}));

const { checkUserClubRole } = require("../lib/access-control");
import * as joueurActions from "../app/actions/joueur-actions";

describe("Joueur actions - droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuse la création de joueur si non coach/admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.equipes.findUnique.mockResolvedValue({
      id: 1,
      club: { id: 1 },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isCoach: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const res = await joueurActions.createJoueur({
      nom_prenom: "Test",
      id_equipe: 1,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/accès|refusé|coach|admin|server/i);
  });

  it("autorise la création de joueur si coach", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.equipes.findUnique.mockResolvedValue({
      id: 1,
      club: { id: 1 },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isCoach: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    require("../lib/prisma").default.joueurs.create.mockResolvedValue({
      id: 1,
      nom_prenom: "Test",
      id_equipe: 1,
    });
    const res = await joueurActions.createJoueur({
      nom_prenom: "Test",
      id_equipe: 1,
    });
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
