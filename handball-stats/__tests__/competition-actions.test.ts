jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock Prisma, server-only, and Clerk
jest.mock("../lib/prisma", () => {
  const mockCompetitionCreate = jest.fn();
  const mockEquipesFindUnique = jest.fn();
  const mockUserFindUnique = jest.fn();
  const mockTransaction = jest.fn(async (fn: (arg: any) => any) => {
    return fn({
      competition: {
        create: mockCompetitionCreate,
      },
    });
  });
  return {
    __esModule: true,
    default: {
      competition: { create: mockCompetitionCreate },
      equipes: { findUnique: mockEquipesFindUnique },
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
import * as competitionActions from "../app/actions/competition-actions";

describe("Competition actions - droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuse la création de compétition si non admin", async () => {
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
    const res = await competitionActions.createCompetition({
      nom: "Compétition",
      saison: "2025-2026",
      genre: "MASCULIN",
      equipeId: 1,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/accès|refusé|admin|server/i);
  });

  it("autorise la création de compétition si admin", async () => {
    const prisma = require("../lib/prisma").default;
    prisma.user.findUnique.mockResolvedValue({ id: 1 });
    prisma.equipes.findUnique.mockResolvedValue({ id: 1, club: { id: 1 } });
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    // Mock $transaction pour inclure competitionAccess.create
    prisma.$transaction = jest.fn(async (fn) => {
      const tx = {
        competition: {
          create: jest.fn().mockResolvedValue({ id: 1, nom: "Compétition" }),
        },
        competitionAccess: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });
    const res = await competitionActions.createCompetition({
      nom: "Compétition",
      saison: "2025-2026",
      genre: "MASCULIN",
      equipeId: 1,
    });
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
