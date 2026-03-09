// Tests pour getMatchById
import { getMatchById } from "../../../app/actions/match-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockMatchsFindFirst = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      matchs: { findFirst: mockMatchsFindFirst },
    },
  };
});

const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("getMatchById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne le match demandé", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    const matchMock = {
      id: 1,
      equipe_recevant_id: 1,
      equipe_exterieur_id: 2,
      date_match: null,
    };
    prisma.matchs.findFirst.mockResolvedValue(matchMock);
    const res = await getMatchById(1);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(matchMock);
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await getMatchById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non authentifié/i);
  });

  it("refuse si utilisateur introuvable", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await getMatchById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/utilisateur introuvable/i);
  });

  it("refuse si match inexistant ou non autorisé", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({ id: 42 });
    prisma.matchs.findFirst.mockResolvedValue(null);
    const res = await getMatchById(999);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/match introuvable/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getMatchById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
