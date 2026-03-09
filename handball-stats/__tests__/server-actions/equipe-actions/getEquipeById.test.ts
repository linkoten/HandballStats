import { getEquipeById } from "../../../app/actions/equipe-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockEquipesFindUnique = jest.fn();
  const mockUserClubFindFirst = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      equipes: { findUnique: mockEquipesFindUnique },
      userClub: { findFirst: mockUserClubFindFirst },
    },
  };
});
const { auth } = require("@clerk/nextjs/server");

const prisma = require("../../../lib/prisma").default;

describe("getEquipeById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne l'équipe demandée", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    const equipeMock = {
      id: 1,
      nom: "Equipe1",
      club: { nom: "Club1" },
      clubId: 10,
      competitions: [{ competitionAccess: [] }],
    };
    prisma.equipes.findUnique.mockResolvedValue(equipeMock);
    prisma.userClub.findFirst.mockResolvedValue({}); // Simule un accès club OK
    const res = await getEquipeById(1);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(equipeMock);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getEquipeById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });

  it("refuse si équipe inexistante", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.equipes.findUnique.mockResolvedValue(null);
    const res = await getEquipeById(999);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getEquipeById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
