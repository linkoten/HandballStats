import * as clubActions from "../app/actions/club-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    club: { findMany: jest.fn(), findFirst: jest.fn() },
    userClub: { findFirst: jest.fn(), create: jest.fn() },
    $transaction: jest.fn((fn) =>
      fn({ user: { update: jest.fn() }, userClub: { create: jest.fn() } }),
    ),
  },
}));
jest.mock("server-only", () => ({}));
jest.mock("@clerk/nextjs", () => ({
  auth: jest.fn(() => ({ userId: "test-user" })),
}));
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(() => ({ userId: "test-user" })),
}));
jest.mock("../lib/access-control", () => ({ checkUserClubRole: jest.fn() }));
const { checkUserClubRole } = require("../lib/access-control");

describe("Club actions - droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuse getClubCodes si non admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
      role: "UTILISATEUR",
    });
    await expect(clubActions.getClubCodes()).resolves.toMatchObject({
      success: false,
    });
  });

  it("autorise getClubCodes si admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
      role: "ADMIN_CLUB",
    });
    require("../lib/prisma").default.club.findMany.mockResolvedValue([
      { id: 1, nom: "Club", ville: "Paris" },
    ]);
    const res = await clubActions.getClubCodes();
    expect(res.success).toBe(true);
    expect(res.data.clubs).toHaveLength(1);
  });

  it("refuse validateClubCode si code invalide", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.club.findFirst.mockResolvedValue(null);
    const res = await clubActions.validateClubCode("FAUXCODE");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalide|introuvable/i);
  });

  it("refuse validateClubCode si déjà membre", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.club.findFirst.mockResolvedValue({
      id: 1,
      nom: "Club",
      coachCode: "COACH",
      playerCode: "PLAYER",
    });
    require("../lib/prisma").default.userClub.findFirst.mockResolvedValue({
      id: 1,
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isGeneralAdmin: false,
    });
    const res = await clubActions.validateClubCode("PLAYER");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/déjà membre/i);
  });

  it("refuse validateClubCode si admin", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.club.findFirst.mockResolvedValue({
      id: 1,
      nom: "Club",
      coachCode: "COACH",
      playerCode: "PLAYER",
    });
    require("../lib/prisma").default.userClub.findFirst.mockResolvedValue(null);
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
    });
    const res = await clubActions.validateClubCode("PLAYER");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/déjà admin|admin général/i);
  });

  it("autorise validateClubCode si code valide et non membre", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.club.findFirst.mockResolvedValue({
      id: 1,
      nom: "Club",
      coachCode: "COACH",
      playerCode: "PLAYER",
    });
    require("../lib/prisma").default.userClub.findFirst.mockResolvedValue(null);
    checkUserClubRole.mockResolvedValue({
      isAdmin: false,
      isGeneralAdmin: false,
    });
    const res = await clubActions.validateClubCode("PLAYER");
    expect(res.success).toBe(true);
    expect(res.data.newRole).toBe("UTILISATEUR");
  });
});
