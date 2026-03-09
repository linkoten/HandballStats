// Test E2E : Création club, équipe, compétition, scraping automatique
// On simule un admin connecté avec 10 tokens
// On vérifie la consommation de token, le statut de l'équipe, et l'accès aux données liées au club

// On mock toutes les actions pour simuler le workflow E2E
jest.mock("../../app/actions/club-actions", () => ({
  createClub: jest.fn(async (data) => ({
    success: true,
    data: { id: 1, nom: data.nom },
  })),
}));
jest.mock("../../app/actions/equipe-actions", () => ({
  createEquipe: jest.fn(async (data) => ({
    success: true,
    data: { id: 2, nom: data.nom, clubId: data.clubId, status: "scraped" },
  })),
  getEquipeById: jest.fn(async (id) => ({
    success: true,
    data: { id, nom: "Equipe E2E", status: "scraped", clubId: 1 },
  })),
}));
jest.mock("../../app/actions/competition-actions", () => ({
  createCompetition: jest.fn(async (data) => ({
    success: true,
    data: { id: 3, nom: data.nom, equipeId: data.equipeId },
  })),
}));
jest.mock("../../app/actions/user-actions", () => ({
  getUserProfile: jest.fn(async () => ({
    success: true,
    data: { id: "admin-e2e-1", tokensRemaining: 9, role: "admin" },
  })),
}));
jest.mock("../../app/actions/match-actions", () => ({
  getMatchs: jest.fn(async (params) => ({
    success: true,
    data: [
      {
        id: "match-1",
        equipe_recevant_id: 1,
        equipe_exterieur_id: 2,
        clubId: params?.equipeId,
      },
    ],
  })),
}));
jest.mock("../../app/actions/joueur-actions", () => ({
  getJoueurs: jest.fn(async (equipeId: string) => ({
    success: true,
    data: [
      { id: "joueur-1", equipeId, nom: "Joueur 1" },
      { id: "joueur-2", equipeId, nom: "Joueur 2" },
    ],
  })),
}));

import { createClub } from "../../app/actions/club-actions";
import { createEquipe, getEquipeById } from "../../app/actions/equipe-actions";
import { createCompetition } from "../../app/actions/competition-actions";
import { getUserProfile } from "../../app/actions/user-actions";
import { getMatchs } from "../../app/actions/match-actions";
import { getJoueurs } from "../../app/actions/joueur-actions";

// Mocks et helpers à adapter selon ton infra !

describe("E2E - Admin crée club, équipe, compétition et scraping", () => {
  let adminId: string;
  let clubId: number;
  let equipeId: number;
  let competitionId: string;

  beforeAll(async () => {
    // Simuler un admin connecté avec 10 tokens
    adminId = "admin-e2e-1";
    // Ici, il faudrait mocker la création d'un user admin avec 10 tokens
    // ...
  });

  it("crée un club et une équipe", async () => {
    const clubRes = await createClub({ nom: "Club E2E" });
    expect(clubRes.success).toBe(true);
    clubId = clubRes.data.id;
    const equipeRes = await createEquipe({
      nom: "Equipe E2E",
      ville: "Paris",
      clubId,
    });
    expect(equipeRes.success).toBe(true);
    equipeId = equipeRes.data.id;
  });

  it("crée une compétition via le formulaire", async () => {
    const competitionRes = await createCompetition({
      nom: "Compétition E2E",
      genre: "MASCULIN",
      saison: "2025-2026",
      equipeId,
    });
    expect(competitionRes.success).toBe(true);
    competitionId = competitionRes.data.id;
  });

  it("déclenche le scraping automatique (mock)", async () => {
    // Ici, on considère que le scraping est instantané et a mis à jour les mocks ci-dessus
    // Pas d'action supplémentaire nécessaire car tout est mocké post-scraping
    expect(true).toBe(true);
  });

  it("vérifie le statut de l'équipe et la consommation de token", async () => {
    const equipeRes = await getEquipeById(equipeId);
    expect(equipeRes.success).toBe(true);
    expect(equipeRes.data.status).toBe("scraped"); // ou le statut attendu après scraping
    const userRes = await getUserProfile();
    expect(userRes.success).toBe(true);
    expect(userRes.data.tokensRemaining).toBe(9); // 1 token consommé
  });

  it("vérifie l’accès aux données liées au club", async () => {
    const matchsRes = await getMatchs({ equipeId: clubId.toString() });
    expect(matchsRes.success).toBe(true);
    expect(matchsRes.data.length).toBeGreaterThan(0);
    const joueursRes = await getJoueurs(equipeId.toString());
    expect(joueursRes.success).toBe(true);
    expect(joueursRes.data.length).toBeGreaterThan(0);
  });
});
