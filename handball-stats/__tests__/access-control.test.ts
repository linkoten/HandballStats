import { checkUserClubRole } from "../lib/access-control";

jest.mock("../lib/prisma", () => ({
  user: {
    findUnique: jest.fn(),
  },
  equipes: {
    findUnique: jest.fn(),
  },
}));

const prisma = require("../lib/prisma");

describe("checkUserClubRole", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("retourne isGeneralAdmin pour un ADMIN_GENERAL", async () => {
    prisma.user.findUnique.mockResolvedValue({
      role: "ADMIN_GENERAL",
      clubs: [],
    });
    const result = await checkUserClubRole({ userId: "user1" });
    expect(result).toEqual({
      isAdmin: true,
      isCoach: true,
      isJoueur: true,
      isGeneralAdmin: true,
      hasAccess: true,
    });
  });

  it("retourne isAdmin pour un admin de club", async () => {
    prisma.user.findUnique.mockResolvedValue({
      role: "ADMIN_CLUB",
      clubs: [{ clubId: 1, isPrincipal: true }],
    });
    const result = await checkUserClubRole({ userId: "user2", clubId: 1 });
    expect(result.isAdmin).toBe(true);
    expect(result.hasAccess).toBe(true);
  });

  it("retourne isCoach pour un coach", async () => {
    prisma.user.findUnique.mockResolvedValue({
      role: "ENTRAINEUR",
      clubs: [{ clubId: 2, isPrincipal: false }],
    });
    const result = await checkUserClubRole({ userId: "user3", clubId: 2 });
    expect(result.isCoach).toBe(true);
    expect(result.hasAccess).toBe(true);
  });

  it("refuse l'accès si pas membre du club", async () => {
    prisma.user.findUnique.mockResolvedValue({
      role: "UTILISATEUR",
      clubs: [{ clubId: 3, isPrincipal: false }],
    });
    const result = await checkUserClubRole({ userId: "user4", clubId: 99 });
    expect(result.hasAccess).toBe(false);
  });
});
