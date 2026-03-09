// Tests pour deleteEquipe
import { deleteEquipe } from "../../../app/actions/equipe-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockEquipesFindUnique = jest.fn();
  const mockEquipesDelete = jest.fn();
  return {
    __esModule: true,
    default: {
      equipes: { findUnique: mockEquipesFindUnique, delete: mockEquipesDelete },
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

describe("deleteEquipe", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("supprime une équipe existante", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    const equipeMock = { id: 1, nom: "Equipe1", clubId: 10 };
    prisma.equipes.findUnique.mockResolvedValue(equipeMock);
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    prisma.equipes.delete.mockResolvedValue({});
    const res = await deleteEquipe(1);
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ message: expect.stringMatching(/succès/i) });
    expect(prisma.equipes.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await deleteEquipe(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non authentifié/i);
  });

  it("refuse si équipe inexistante", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.equipes.findUnique.mockResolvedValue(null);
    const res = await deleteEquipe(999);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable/i);
  });

  it("refuse si pas admin ni admin général", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    const equipeMock = { id: 1, nom: "Equipe1", clubId: 10 };
    prisma.equipes.findUnique.mockResolvedValue(equipeMock);
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const res = await deleteEquipe(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin du club/i);
  });

  it("refuse si pas d'accès au club", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    const equipeMock = { id: 1, nom: "Equipe1", clubId: 10 };
    prisma.equipes.findUnique.mockResolvedValue(equipeMock);
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isGeneralAdmin: false,
      hasAccess: false,
    });
    const res = await deleteEquipe(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin du club/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.equipes.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await deleteEquipe(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
