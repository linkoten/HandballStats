// Tests pour createEquipe
import { createEquipe } from "../../../app/actions/equipe-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockEquipesCreate = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      equipes: { create: mockEquipesCreate },
    },
  };
});
jest.mock("@/lib/access-control", () => ({
  checkUserClubRole: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("@/lib/sequence-safety", () => ({
  safeCreate: jest.fn((fn) => fn()),
}));

const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;
const { checkUserClubRole } = require("@/lib/access-control");

describe("createEquipe", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("crée une équipe avec des données valides", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    // Le club retourné pour pré-remplir les champs
    prisma.club = {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          ville: "Paris",
          region: "IDF",
          departement: "75",
        }),
    };
    const equipeMock = {
      id: 1,
      nom: "Equipe1",
      ville: "Paris",
      region: "IDF",
      departement: "75",
      clubId: 10,
    };
    prisma.equipes.create.mockResolvedValue(equipeMock);
    const data = {
      nom: "Equipe1",
      clubId: 10,
    };
    const res = await createEquipe(data);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(equipeMock);
    expect(prisma.equipes.create).toHaveBeenCalledWith({
      data: {
        nom: "Equipe1",
        ville: "Paris",
        region: "IDF",
        departement: "75",
        clubId: 10,
      },
    });
  });

  it("refuse si données invalides (nom ou clubId manquant)", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    // Test nom vide
    let res = await createEquipe({ nom: "", clubId: 10 });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/nom et club requis/i);
    // Test clubId manquant (on omet la propriété)
    // @ts-expect-error test champ manquant
    res = await createEquipe({ nom: "Equipe1" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/nom et club requis/i);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await createEquipe({
      nom: "Equipe1",
      clubId: 10,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non authentifié/i);
  });

  it("refuse si utilisateur introuvable", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await createEquipe({
      nom: "Equipe1",
      clubId: 10,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/utilisateur introuvable/i);
  });

  it("refuse si pas admin ni admin général", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const res = await createEquipe({
      nom: "Equipe1",
      clubId: 10,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin du club/i);
  });

  it("refuse si pas d'accès au club", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isGeneralAdmin: false,
      hasAccess: false,
    });
    const res = await createEquipe({
      nom: "Equipe1",
      clubId: 10,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin du club/i);
  });

  it("gère les erreurs internes (safeCreate)", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    prisma.equipes.create.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await createEquipe({
      nom: "Equipe1",
      clubId: 10,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/i);
  });
});
