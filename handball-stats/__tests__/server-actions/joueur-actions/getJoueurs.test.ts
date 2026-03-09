// Tests pour getJoueurs
import { getJoueurs } from "../../../app/actions/joueur-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockEquipesFindFirst = jest.fn();
  const mockUserClubFindMany = jest.fn();
  const mockJoueursFindMany = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      equipes: { findFirst: mockEquipesFindFirst },
      userClub: { findMany: mockUserClubFindMany },
      joueurs: { findMany: mockJoueursFindMany },
    },
  };
});

const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("getJoueurs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne la liste des joueurs pour une équipe", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.equipes.findFirst.mockResolvedValue({
      id: 1,
      club: { userClubs: [{ userId: 42 }] },
    });
    const joueursMock = [
      {
        id: 1,
        nom_prenom: "Joueur1",
        num_maillot: 10,
        id_equipe: 1,
        poste_principal: "A",
        postes_secondaires: [],
        equipes: { id: 1, nom: "Equipe1", club: { nom: "Club1" } },
      },
      {
        id: 2,
        nom_prenom: "Joueur2",
        num_maillot: 11,
        id_equipe: 1,
        poste_principal: "B",
        postes_secondaires: [],
        equipes: { id: 1, nom: "Equipe1", club: { nom: "Club1" } },
      },
    ];
    prisma.joueurs.findMany.mockResolvedValue(joueursMock);
    const res = await getJoueurs("1");
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(2);
    expect(res.data[0].nom_prenom).toBe("Joueur1");
  });

  it("retourne la liste des joueurs pour tous les clubs de l'utilisateur", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.userClub.findMany.mockResolvedValue([
      { club: { equipes: [{ id: 1 }, { id: 2 }] } },
    ]);
    const joueursMock = [
      {
        id: 1,
        nom_prenom: "Joueur1",
        num_maillot: 10,
        id_equipe: 1,
        poste_principal: "A",
        postes_secondaires: [],
        equipes: { id: 1, nom: "Equipe1", club: { nom: "Club1" } },
      },
    ];
    prisma.joueurs.findMany.mockResolvedValue(joueursMock);
    const res = await getJoueurs();
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
  });

  it("retourne une liste vide si l'utilisateur n'a aucun club", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.userClub.findMany.mockResolvedValue([]);
    const res = await getJoueurs();
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getJoueurs();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non authentifié/i);
  });

  it("refuse si utilisateur introuvable", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await getJoueurs();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/utilisateur introuvable/i);
  });

  it("refuse si équipe non autorisée", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.equipes.findFirst.mockResolvedValue(null);
    const res = await getJoueurs("1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/équipe non autorisée/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getJoueurs();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
