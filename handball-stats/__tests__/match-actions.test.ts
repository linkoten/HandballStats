it("retourne les matchs accessibles si aucun paramètre n'est fourni", async () => {
  require("../lib/prisma").default.user.findUnique.mockResolvedValue({ id: 1 });
  require("../lib/prisma").default.userClub.findMany.mockResolvedValue([
    { club: { equipes: [{ id: 2 }, { id: 3 }] } },
  ]);
  require("../lib/prisma").default.competitionAccess.findMany.mockResolvedValue(
    [{ competition: { equipeId: 4 } }],
  );
  require("../lib/prisma").default.matchs.findMany.mockResolvedValue([
    {
      id: 10,
      equipe_recevant_id: 2,
      statistiques_joueur: [],
      competition: null,
      competition_name: undefined,
      score_final: undefined,
      recevant_nom_display: undefined,
      exterieur_nom_display: undefined,
      equipes_matchs_equipe_recevant_idToequipes: undefined,
      equipes_matchs_equipe_exterieur_idToequipes: undefined,
    },
    {
      id: 11,
      equipe_exterieur_id: 3,
      statistiques_joueur: [],
      competition: null,
      competition_name: undefined,
      score_final: undefined,
      recevant_nom_display: undefined,
      exterieur_nom_display: undefined,
      equipes_matchs_equipe_recevant_idToequipes: undefined,
      equipes_matchs_equipe_exterieur_idToequipes: undefined,
    },
    {
      id: 12,
      equipe_recevant_id: 4,
      statistiques_joueur: [],
      competition: null,
      competition_name: undefined,
      score_final: undefined,
      recevant_nom_display: undefined,
      exterieur_nom_display: undefined,
      equipes_matchs_equipe_recevant_idToequipes: undefined,
      equipes_matchs_equipe_exterieur_idToequipes: undefined,
    },
  ]);
  const res = await matchActions.getMatchs();
  expect(res.success).toBe(true);
  expect(Array.isArray(res.data)).toBe(true);
  expect(res.data).toHaveLength(3);
});

it("retourne les matchs pour une équipe accessible (equipeId)", async () => {
  require("../lib/prisma").default.user.findUnique.mockResolvedValue({ id: 1 });
  require("../lib/prisma").default.userClub.findMany.mockResolvedValue([
    { club: { equipes: [{ id: 2 }] } },
  ]);
  require("../lib/prisma").default.competitionAccess.findMany.mockResolvedValue(
    [],
  );
  require("../lib/prisma").default.matchs.findMany.mockResolvedValue([
    {
      id: 20,
      equipe_recevant_id: 2,
      statistiques_joueur: [],
      competition: null,
      competition_name: undefined,
      score_final: undefined,
      recevant_nom_display: undefined,
      exterieur_nom_display: undefined,
      equipes_matchs_equipe_recevant_idToequipes: undefined,
      equipes_matchs_equipe_exterieur_idToequipes: undefined,
    },
    {
      id: 21,
      equipe_exterieur_id: 2,
      statistiques_joueur: [],
      competition: null,
      competition_name: undefined,
      score_final: undefined,
      recevant_nom_display: undefined,
      exterieur_nom_display: undefined,
      equipes_matchs_equipe_recevant_idToequipes: undefined,
      equipes_matchs_equipe_exterieur_idToequipes: undefined,
    },
  ]);
  const res = await matchActions.getMatchs({ equipeId: "2" });
  expect(res.success).toBe(true);
  expect(Array.isArray(res.data)).toBe(true);
  expect(res.data).toHaveLength(2);
});

it("refuse getMatchs si équipeId non accessible", async () => {
  require("../lib/prisma").default.user.findUnique.mockResolvedValue({ id: 1 });
  require("../lib/prisma").default.userClub.findMany.mockResolvedValue([
    { club: { equipes: [{ id: 2 }] } },
  ]);
  require("../lib/prisma").default.competitionAccess.findMany.mockResolvedValue(
    [],
  );
  await expect(
    matchActions.getMatchs({ equipeId: "999" }),
  ).resolves.toMatchObject({ success: false });
});

it("refuse getMatchs si équipeId inexistant (non numérique)", async () => {
  require("../lib/prisma").default.user.findUnique.mockResolvedValue({ id: 1 });
  require("../lib/prisma").default.userClub.findMany.mockResolvedValue([
    { club: { equipes: [{ id: 2 }] } },
  ]);
  require("../lib/prisma").default.competitionAccess.findMany.mockResolvedValue(
    [],
  );
  await expect(
    matchActions.getMatchs({ equipeId: "notanumber" }),
  ).resolves.toMatchObject({ success: false });
});
import * as matchActions from "../app/actions/match-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    userClub: { findMany: jest.fn() },
    competitionAccess: { findMany: jest.fn(), findFirst: jest.fn() },
    equipes: { findUnique: jest.fn() },
    matchs: { findMany: jest.fn(), findFirst: jest.fn() },
  },
}));
jest.mock("server-only", () => ({}));
jest.mock("@clerk/nextjs", () => ({
  auth: jest.fn(() => ({ userId: "test-user" })),
}));
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(() => ({ userId: "test-user" })),
}));

describe("Match actions - droits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne une liste vide si aucune équipe accessible", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.userClub.findMany.mockResolvedValue([]);
    require("../lib/prisma").default.competitionAccess.findMany.mockResolvedValue(
      [],
    );
    const res = await matchActions.getMatchs();
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("refuse getMatchs si équipe non autorisée", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.userClub.findMany.mockResolvedValue([
      { club: { equipes: [{ id: 2 }] } },
    ]);
    require("../lib/prisma").default.competitionAccess.findMany.mockResolvedValue(
      [],
    );
    require("../lib/prisma").default.equipes.findUnique.mockResolvedValue(null);
    await expect(
      matchActions.getMatchs({ equipeId: "999" }),
    ).resolves.toMatchObject({ success: false });
  });

  it("refuse getMatchs si compétition non autorisée", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.userClub.findMany.mockResolvedValue([
      { club: { equipes: [{ id: 2 }] } },
    ]);
    require("../lib/prisma").default.competitionAccess.findMany.mockResolvedValue(
      [],
    );
    require("../lib/prisma").default.equipes.findUnique.mockResolvedValue({
      id: 2,
      club: { userClubs: [{ userId: 1 }] },
    });
    require("../lib/prisma").default.competitionAccess.findFirst.mockResolvedValue(
      null,
    );
    const res = await matchActions.getMatchs({ competitionId: "999" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/compétition/i);
  });

  it("refuse getMatchById si non authentifié", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue(null);
    const res = await matchActions.getMatchById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/authentifié|introuvable/i);
  });

  it("refuse getMatchById si pas accès", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.matchs.findFirst.mockResolvedValue(null);
    const res = await matchActions.getMatchById(1);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/accès|autorisé|introuvable/i);
  });

  it("autorise getMatchById si accès", async () => {
    require("../lib/prisma").default.user.findUnique.mockResolvedValue({
      id: 1,
    });
    require("../lib/prisma").default.matchs.findFirst.mockResolvedValue({
      id: 1,
      date_match: new Date(),
      equipe_recevant_id: 2,
      equipe_exterieur_id: 3,
      competition: null,
      equipes_matchs_equipe_recevant_idToequipes: {
        id: 2,
        nom: "A",
        ville: "Paris",
        club: { nom: "ClubA" },
      },
      equipes_matchs_equipe_exterieur_idToequipes: {
        id: 3,
        nom: "B",
        ville: "Lyon",
        club: { nom: "ClubB" },
      },
    });
    const res = await matchActions.getMatchById(1);
    expect(res.success).toBe(true);
    expect(res.data.id).toBe(1);
  });
});
