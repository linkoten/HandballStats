import { getClubs } from "../../../app/actions/club-actions";

jest.mock("../../../lib/prisma", () => {
  const mockClubFindMany = jest.fn();
  return {
    __esModule: true,
    default: {
      club: { findMany: mockClubFindMany },
    },
  };
});
const prisma = require("../../../lib/prisma").default;

describe("getClubs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne la liste des clubs", async () => {
    const clubsMock = [
      { id: 1, nom: "Club1", _count: { equipes: 2 } },
      { id: 2, nom: "Club2", _count: { equipes: 1 } },
    ];
    prisma.club.findMany.mockResolvedValue(clubsMock);
    const res = await getClubs();
    expect(res.success).toBe(true);
    expect(res.data).toEqual(clubsMock);
  });

  it("gère les erreurs internes", async () => {
    prisma.club.findMany.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getClubs();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
