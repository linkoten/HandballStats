import * as joueurActions from "../app/actions/joueur-actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    joueurs: {
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
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

describe("Joueur actions - update/delete droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuse la modification de joueur si non coach/admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.joueurs.findUnique.mockResolvedValue({
      id: 1,
      equipes: { club: { id: 1 } },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isCoach: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const res = await joueurActions.updateJoueur(1, { nom_prenom: "Modif" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/accès|refusé|coach|admin|server/i);
  });

  it("autorise la modification de joueur si coach", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.joueurs.findUnique.mockResolvedValue({
      id: 1,
      equipes: { club: { id: 1 } },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isCoach: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    require("../lib/prisma").default.joueurs.update.mockResolvedValue({
      id: 1,
      nom_prenom: "Modif",
      id_equipe: 1,
    });
    const res = await joueurActions.updateJoueur(1, { nom_prenom: "Modif" });
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("refuse la suppression de joueur si non coach/admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.joueurs.findUnique.mockResolvedValue({
      id: 1,
      equipes: { club: { id: 1 } },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isCoach: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const res = await joueurActions.deleteJoueur(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/accès|refusé|coach|admin|server/i);
  });

  it("autorise la suppression de joueur si coach", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.joueurs.findUnique.mockResolvedValue({
      id: 1,
      equipes: { club: { id: 1 } },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isCoach: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    require("../lib/prisma").default.joueurs.delete.mockResolvedValue({
      id: 1,
      nom_prenom: "Supprimé",
      id_equipe: 1,
    });
    const res = await joueurActions.deleteJoueur(1);
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
