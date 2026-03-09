import { deleteCompetition } from "../../../app/actions/competition-actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("../../../lib/prisma", () => {
  const mockCompetitionFindUnique = jest.fn();
  const mockCompetitionDelete = jest.fn();
  return {
    __esModule: true,
    default: {
      competition: {
        findUnique: mockCompetitionFindUnique,
        delete: mockCompetitionDelete,
      },
    },
  };
});
jest.mock("../../../lib/access-control", () => ({
  checkUserClubRole: jest.fn(),
}));
const { auth } = require("@clerk/nextjs/server");
const prisma = require("../../../lib/prisma").default;
const { checkUserClubRole } = require("../../../lib/access-control");

describe("deleteCompetition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("supprime une compétition existante", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.competition.findUnique.mockResolvedValue({
      id: 1,
      equipe: { club: { id: 2 }, id: 3 },
      equipeId: 3,
    });
    checkUserClubRole.mockResolvedValue({
      isAdmin: true,
      isGeneralAdmin: false,
      hasAccess: true,
    });
    prisma.competition.delete.mockResolvedValue({});
    const res = await deleteCompetition(1);
    expect(res.success).toBe(true);
    expect(res.data.message).toMatch(/succès/i);
    expect(prisma.competition.delete).toHaveBeenCalled();
  });

  it("refuse si non authentifié", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });
    const res = await deleteCompetition(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifi/i);
  });

  it("refuse si compétition inexistante", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.competition.findUnique.mockResolvedValue(null);
    const res = await deleteCompetition(999);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/introuvable/i);
  });

  it("gère les erreurs internes", async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: "user-1" });
    prisma.competition.findUnique.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await deleteCompetition(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
