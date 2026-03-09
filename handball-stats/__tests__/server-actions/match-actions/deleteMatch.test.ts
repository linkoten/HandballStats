// Tests pour deleteMatch
import { deleteMatch } from "../../../app/actions/match-actions";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockUserFindUnique = jest.fn();
  const mockMatchsFindFirst = jest.fn();
  const mockMatchsDelete = jest.fn();
  return {
    __esModule: true,
    default: {
      user: { findUnique: mockUserFindUnique },
      matchs: { findFirst: mockMatchsFindFirst, delete: mockMatchsDelete },
    },
  };
});
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;

describe("deleteMatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("supprime un match existant", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      clerkId: "user-1",
    });
    prisma.matchs.findFirst.mockResolvedValue({
      id: 1,
      equipe_recevant_id: 1,
      equipe_exterieur_id: 2,
    });
    prisma.matchs.delete.mockResolvedValue({ id: 1 });
    const res = await deleteMatch(1);
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ message: expect.stringMatching(/succès/i) });
    expect(prisma.matchs.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await deleteMatch(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non authentifié/i);
  });

  it("refuse si match inexistant", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      clerkId: "user-1",
    });
    prisma.matchs.findFirst.mockResolvedValue(null);
    const res = await deleteMatch(999);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable|autorisé/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.user.findUnique.mockImplementation(() => {
      throw new Error("fail interne");
    });
    const res = await deleteMatch(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail interne/);
  });
});
