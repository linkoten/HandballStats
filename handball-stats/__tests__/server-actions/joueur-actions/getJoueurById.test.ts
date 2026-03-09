// Tests pour getJoueurById
import { getJoueurById } from "../../../app/actions/joueur-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockJoueursFindFirst = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      joueurs: { findFirst: mockJoueursFindFirst },
    },
  };
});

const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("getJoueurById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne le joueur demandé", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    const joueurMock = {
      id: 1,
      nom_prenom: "Joueur1",
      equipes: { id: 1, nom: "Equipe1", club: { nom: "Club1" } },
    };
    prisma.joueurs.findFirst.mockResolvedValue(joueurMock);
    const res = await getJoueurById(1);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(joueurMock);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getJoueurById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non authentifié/i);
  });

  it("refuse si utilisateur introuvable", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await getJoueurById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/utilisateur introuvable/i);
  });

  it("refuse si joueur inexistant ou non autorisé", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.joueurs.findFirst.mockResolvedValue(null);
    const res = await getJoueurById(999);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/joueur introuvable/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getJoueurById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
