jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock Prisma, server-only, and Clerk
jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    equipes: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
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
import * as equipeActions from "../app/actions/equipe-actions";

describe("Equipe actions - droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuse la création d'équipe si non admin", async () => {
    // Mock user and club access
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
    const res = await equipeActions.createEquipe({
      nom: "Test",
      clubId: 1,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/accès|refusé|admin|server/i);
  });

  it("autorise la création d'équipe si admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.club = {
      findUnique: jest.fn().mockResolvedValue({
        ville: "Paris",
        region: "IDF",
        departement: "75",
      }),
    };
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    require("../lib/prisma").default.equipes.create.mockResolvedValue({
      id: 1,
      nom: "Test",
      ville: "Paris",
      region: "IDF",
      departement: "75",
      clubId: 1,
    });
    const res = await equipeActions.createEquipe({
      nom: "Test",
      clubId: 1,
    });
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
