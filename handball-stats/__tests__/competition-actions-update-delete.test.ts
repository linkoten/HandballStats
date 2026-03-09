import * as competitionActions from "../app/actions/competition-actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("../lib/prisma", () => {
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockFindUnique = jest.fn();
  const mockUserFindUnique = jest.fn();
  const mockTransaction = jest.fn(async (fn) => {
    const tx = {
      competition: { update: mockUpdate, delete: mockDelete },
    };
    return fn(tx);
  });
  return {
    __esModule: true,
    default: {
      competition: {
        update: mockUpdate,
        delete: mockDelete,
        findUnique: mockFindUnique,
      },
      equipes: { findUnique: jest.fn() },
      user: { findUnique: mockUserFindUnique },
      $transaction: mockTransaction,
    },
  };
});
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

describe("Competition actions - update/delete droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuse la modification de compétition si non admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.competition.findUnique.mockResolvedValue({
      id: 1,
      equipe: { club: { id: 1 } },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const res = await competitionActions.updateCompetition(1, { nom: "Modif" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/accès|refusé|admin|server/i);
  });

  it("autorise la modification de compétition si admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.competition.findUnique.mockResolvedValue({
      id: 1,
      equipe: { club: { id: 1 } },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    require("../lib/prisma").default.competition.update.mockResolvedValue({
      id: 1,
      nom: "Modif",
      equipeId: 1,
    });
    const res = await competitionActions.updateCompetition(1, { nom: "Modif" });
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("refuse la suppression de compétition si non admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.competition.findUnique.mockResolvedValue({
      id: 1,
      equipe: { club: { id: 1 } },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const res = await competitionActions.deleteCompetition(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/accès|refusé|admin|server/i);
  });

  it("autorise la suppression de compétition si admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.competition.findUnique.mockResolvedValue({
      id: 1,
      equipe: { club: { id: 1 } },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    require("../lib/prisma").default.competition.delete.mockResolvedValue({
      id: 1,
      nom: "Supprimée",
      equipeId: 1,
    });
    const res = await competitionActions.deleteCompetition(1);
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
