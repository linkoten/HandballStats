// Tests pour createJoueur
import { createJoueur } from "../../../app/actions/joueur-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockEquipesFindUnique = jest.fn();
  const mockJoueursCreate = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      equipes: { findUnique: mockEquipesFindUnique },
      joueurs: { create: mockJoueursCreate },
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

describe("createJoueur", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("crée un joueur avec des données valides", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    const equipeMock = { id: 1, club: { id: 10 } };
    prisma.equipes.findUnique.mockResolvedValue(equipeMock);
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isCoach: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const joueurMock = {
      id: 1,
      nom_prenom: "Joueur1",
      id_equipe: 1,
      equipes: { id: 1, nom: "Equipe1", club: { nom: "Club1" } },
    };
    prisma.joueurs.create.mockResolvedValue(joueurMock);
    const data = {
      nom_prenom: "Joueur1",
      num_maillot: 10,
      id_equipe: 1,
      poste_principal: "A",
      postes_secondaires: [],
    };
    const res = await createJoueur(data);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(joueurMock);
    expect(prisma.joueurs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ nom_prenom: "Joueur1", id_equipe: 1 }),
      include: expect.any(Object),
    });
  });

  it("refuse si données invalides (nom_prenom ou id_equipe manquant)", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    const res = await createJoueur({ nom_prenom: "", id_equipe: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/nom\/prénom et équipe requis/i);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await createJoueur({ nom_prenom: "Joueur1", id_equipe: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non authentifié/i);
  });

  it("refuse si utilisateur introuvable", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await createJoueur({ nom_prenom: "Joueur1", id_equipe: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/utilisateur introuvable/i);
  });

  it("refuse si équipe ou club introuvable", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.equipes.findUnique.mockResolvedValue(null);
    const res = await createJoueur({ nom_prenom: "Joueur1", id_equipe: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/équipe ou club introuvable/i);
  });

  it("refuse si pas admin, coach ni admin général", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.equipes.findUnique.mockResolvedValue({ id: 1, club: { id: 10 } });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isCoach: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const res = await createJoueur({ nom_prenom: "Joueur1", id_equipe: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/coach, admin du club ou admin général/i);
  });

  it("refuse si pas d'accès au club", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.equipes.findUnique.mockResolvedValue({ id: 1, club: { id: 10 } });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isCoach: false,
      isGeneralAdmin: false,
      hasAccess: false,
    });
    const res = await createJoueur({ nom_prenom: "Joueur1", id_equipe: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/coach, admin du club ou admin général/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await createJoueur({ nom_prenom: "Joueur1", id_equipe: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
