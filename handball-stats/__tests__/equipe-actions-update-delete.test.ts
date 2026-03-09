import * as equipeActions from "../app/actions/equipe-actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    equipes: {
      update: jest.fn(),
      delete: jest.fn(),
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

describe("Equipe actions - update/delete droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuse la modification d'équipe si non admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.equipes.findUnique.mockResolvedValue({
      id: 1,
      club: { id: 1 },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const res = await equipeActions.updateEquipe(1, { nom: "Modif" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/accès|refusé|admin|server/i);
  });

  it("autorise la modification d'équipe si admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.equipes.findUnique.mockResolvedValue({
      id: 1,
      club: { id: 1 },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    require("../lib/prisma").default.equipes.update.mockResolvedValue({
      id: 1,
      nom: "Modif",
      clubId: 1,
    });
    const res = await equipeActions.updateEquipe(1, { nom: "Modif" });
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("refuse la suppression d'équipe si non admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.equipes.findUnique.mockResolvedValue({
      id: 1,
      club: { id: 1 },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    const res = await equipeActions.deleteEquipe(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/accès|refusé|admin|server/i);
  });

  it("autorise la suppression d'équipe si admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.equipes.findUnique.mockResolvedValue({
      id: 1,
      club: { id: 1 },
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    require("../lib/prisma").default.equipes.delete.mockResolvedValue({
      id: 1,
      nom: "Supprimée",
      clubId: 1,
    });
    const res = await equipeActions.deleteEquipe(1);
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
