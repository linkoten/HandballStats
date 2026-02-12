// lib/api/client.ts - Client API pour communiquer avec les API Routes Next.js

// Pour les API Routes Next.js, on utilise toujours des chemins relatifs
function getApiUrl() {
  // Pour les API Routes Next.js, pas besoin de port ou d'hôte spécifique
  return "";
}

const API_URL = getApiUrl();

export interface Equipe {
  id: number;
  nom: string;
  ville: string;
}

export interface Joueur {
  id: number;
  nom_prenom: string;
  num_maillot: number | null;
  id_equipe: number;
  poste_principal: string | null;
  postes_secondaires: string[] | null;
}

export interface Match {
  id: number;
  match_url: string;
  pdf_url: string | null;
  competition_name: string;
  equipe_recevant_id: number;
  equipe_exterieur_id: number;
  score_final: string;
  date_match: string | null;
  arbitre_1: string | null;
  arbitre_2: string | null;
}

export interface StatistiqueJoueur {
  id: number;
  id_match: number;
  id_joueur: number;
  buts: number;
  sept_metres: number;
  tirs: number;
  arrets: number;
  avertissements: number;
  exclusions_2min: number;
  discipline: number;
  joueur?: Joueur;
}

export interface MatchDetailed extends Match {
  equipe_recevant: Equipe;
  equipe_exterieur: Equipe;
  statistiques: StatistiqueJoueur[];
}

// Équipes
export async function getEquipes(): Promise<Equipe[]> {
  try {
    const url = `/api/equipes/all`;
    console.log("[API] Fetching:", url);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur ${response.status}: ${error}`);
    }
    return response.json();
  } catch (error) {
    console.error("[API] Error in getEquipes:", error);
    throw error;
  }
}

export async function getEquipe(id: number): Promise<Equipe> {
  try {
    const url = `/api/equipes?club_id=${id}`;
    console.log("[API] Fetching:", url);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur ${response.status}: ${error}`);
    }
    const equipes = await response.json();
    return equipes[0] || null;
  } catch (error) {
    console.error("[API] Error in getEquipe:", error);
    throw error;
  }
}

// Joueurs
export async function getJoueurs(equipeId?: number): Promise<Joueur[]> {
  try {
    const url = equipeId
      ? `/api/joueurs?equipe_id=${equipeId}`
      : `/api/joueurs`;
    console.log("[API] Fetching:", url);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur ${response.status}: ${error}`);
    }
    return response.json();
  } catch (error) {
    console.error("[API] Error in getJoueurs:", error);
    throw error;
  }
}

// Matchs
export async function getMatchs(params?: {
  equipe_id?: number;
  competition?: string;
  limit?: number;
}): Promise<Match[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.equipe_id)
      searchParams.append("equipe_id", params.equipe_id.toString());
    if (params?.competition)
      searchParams.append("competition", params.competition);
    if (params?.limit) searchParams.append("limit", params.limit.toString());

    const url = `/api/matchs${
      searchParams.toString() ? "?" + searchParams.toString() : ""
    }`;
    console.log("[API] Fetching:", url);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur ${response.status}: ${error}`);
    }
    return response.json();
  } catch (error) {
    console.error("[API] Error in getMatchs:", error);
    throw error;
  }
}

export async function getMatchDetailed(id: number): Promise<MatchDetailed> {
  try {
    const url = `/api/matchs/${id}`;
    console.log("[API] Fetching:", url);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur ${response.status}: ${error}`);
    }
    return response.json();
  } catch (error) {
    console.error("[API] Error in getMatchDetailed:", error);
    throw error;
  }
}

// Statistiques
export async function getStatistiquesJoueur(joueurId: number) {
  const response = await fetch(
    `/api/statistiques/joueur/${joueurId}`
  );
  if (!response.ok)
    throw new Error("Erreur lors de la récupération des statistiques");
  return response.json();
}

export async function getStatistiquesEquipe(equipeId: number, saison?: string) {
  const url = saison
    ? `/api/statistiques/equipe/${equipeId}?saison=${saison}`
    : `/api/statistiques/equipe/${equipeId}`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error("Erreur lors de la récupération des statistiques");
  return response.json();
}

// Postes
export interface UpdatePostesRequest {
  joueur_ids: number[];
  poste_principal?: string | null;
  postes_secondaires?: string[] | null;
  operation?: "set" | "add";
}

export interface UpdatePostesResponse {
  message: string;
  updated_count: number;
  joueurs: Joueur[];
}

export async function updateJoueursPostesBatch(
  request: UpdatePostesRequest
): Promise<UpdatePostesResponse> {
  try {
    const url = `/api/joueurs/postes/batch`;
    console.log("[API] Updating postes:", url, request);
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur ${response.status}: ${error}`);
    }
    return response.json();
  } catch (error) {
    console.error("[API] Error in updateJoueursPostesBatch:", error);
    throw error;
  }
}
