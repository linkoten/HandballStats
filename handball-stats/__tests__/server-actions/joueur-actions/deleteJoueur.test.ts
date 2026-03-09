// Tests pour deleteJoueur
import { deleteJoueur } from "../../../app/actions/joueur-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockJoueursFindUnique = jest.fn();
  const mockJoueursDelete = jest.fn();
  return {
    __esModule: true,
    default: {
      joueurs: { findUnique: mockJoueursFindUnique, delete: mockJoueursDelete },
    },
  };
});
jest.mock("@/lib/access-control", () => ({
  checkUserClubRole: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;
const { checkUserClubRole } = require("@/lib/access-control");

describe("deleteJoueur", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("supprime un joueur existant", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    const joueurMock = {
      id: 1,
      nom_prenom: "Joueur1",
      equipes: { id: 1, club: { id: 10 } },
    };
    prisma.joueurs.findUnique.mockResolvedValue(joueurMock);
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isCoach: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    prisma.joueurs.delete.mockResolvedValue({});
    const res = await deleteJoueur(1);
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ message: expect.stringMatching(/succès/i) });
    expect(prisma.joueurs.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await deleteJoueur(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non authentifié/i);
  });

  it("refuse si joueur ou club inexistant", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.joueurs.findUnique.mockResolvedValue(null);
    const res = await deleteJoueur(999);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/joueur ou club introuvable/i);
  });

  it("refuse si pas admin, coach ni admin général", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    const joueurMock = {
      id: 1,
      nom_prenom: "Joueur1",
      equipes: { id: 1, club: { id: 10 } },
    };
    prisma.joueurs.findUnique.mockResolvedValue(joueurMock);
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isCoach: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const res = await deleteJoueur(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/coach, admin du club ou admin général/i);
  });

  it("refuse si pas d'accès au club", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    const joueurMock = {
      id: 1,
      nom_prenom: "Joueur1",
      equipes: { id: 1, club: { id: 10 } },
    };
    prisma.joueurs.findUnique.mockResolvedValue(joueurMock);
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isCoach: false,
      isGeneralAdmin: false,
      hasAccess: false,
    });
    const res = await deleteJoueur(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/coach, admin du club ou admin général/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.joueurs.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await deleteJoueur(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
