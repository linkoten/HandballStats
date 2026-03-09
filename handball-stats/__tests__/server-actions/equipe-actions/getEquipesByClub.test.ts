import { getEquipesByClub } from "../../../app/actions/equipe-actions";

jest.mock("../../../lib/prisma", () => {
  const mockEquipesFindMany = jest.fn();
  return {
    __esModule: true,
    default: {
      equipes: { findMany: mockEquipesFindMany },
    },
  };
});
const prisma = require("../../../lib/prisma").default;

describe("getEquipesByClub", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne les équipes d'un club", async () => {
    const equipesMock = [
      {
        id: 1,
        nom: "Equipe1",
        ville: "Paris",
        club: { nom: "Club1" },
        region: "IDF",
        departement: "75",
      },
      {
        id: 2,
        nom: "Equipe2",
        ville: "Lyon",
        club: { nom: "Club1" },
        region: "ARA",
        departement: "69",
      },
    ];
    prisma.equipes.findMany.mockResolvedValue(equipesMock);
    const res = await getEquipesByClub("1");
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(2);
    expect(res.data[0].nom).toBe("Equipe1");
  });

  it("refuse si clubId manquant", async () => {
    const res = await getEquipesByClub("");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/club_id/i);
  });

  it("gère les erreurs internes", async () => {
    prisma.equipes.findMany.mockImplementation(() => {
      throw new Error("fail");
    });
    const res = await getEquipesByClub("1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fail/);
  });
});
