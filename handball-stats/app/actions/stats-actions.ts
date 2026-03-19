"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export type StatsData = {
  equipes: { id: number; nom: string }[];
  joueurs: { id: number; nom_prenom: string; poste_principal: string | null; postes_secondaires: string[]; id_equipe: number | null }[];
  competitions: { id: number; nom: string; saison: string }[];
  matchs: {
    id: number;
    date_match: string | null;
    score_final: string | null;
    equipe_recevant_id: number | null;
    equipe_exterieur_id: number | null;
    competition_name: string | null;
    competitionId: number | null;
    exclusions_2min_adversaire: number | null;
    sept_metres_adversaire: number | null;
  }[];
  statsJoueurs: {
    id: number;
    id_match: number | null;
    id_joueur: number | null;
    buts: number | null;
    tirs: number | null;
    arrets: number | null;
    exclusions_2min: number | null;
    sept_metres: number | null;
    id_equipe_adverse: number | null;
  }[];
};

export async function getStatsData(clubId: number): Promise<{ success: boolean; data?: StatsData; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    // Récupérer toutes les équipes du club
    const equipes = await prisma.equipes.findMany({
      where: { clubId },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    });

    if (equipes.length === 0) return { success: true, data: { equipes: [], joueurs: [], competitions: [], matchs: [], statsJoueurs: [] } };

    const equipeIds = equipes.map((e) => e.id);

    // Joueurs, compétitions, matchs et stats en parallèle
    const [joueurs, competitions, matchsRaw, statsRaw] = await Promise.all([
      prisma.joueurs.findMany({
        where: { id_equipe: { in: equipeIds } },
        select: { id: true, nom_prenom: true, poste_principal: true, postes_secondaires: true, id_equipe: true },
        orderBy: { nom_prenom: "asc" },
      }),
      prisma.competition.findMany({
        where: { equipeId: { in: equipeIds } },
        select: { id: true, nom: true, saison: true },
        orderBy: [{ saison: "desc" }, { nom: "asc" }],
      }),
      prisma.matchs.findMany({
        where: {
          OR: [
            { equipe_recevant_id: { in: equipeIds } },
            { equipe_exterieur_id: { in: equipeIds } },
          ],
        },
        select: {
          id: true,
          date_match: true,
          score_final: true,
          equipe_recevant_id: true,
          equipe_exterieur_id: true,
          competition_name: true,
          competitionId: true,
          exclusions_2min_adversaire: true,
          sept_metres_adversaire: true,
        },
        orderBy: { date_match: "asc" },
      }),
      prisma.statistiques_joueur.findMany({
        where: { joueurs: { id_equipe: { in: equipeIds } } },
        select: {
          id: true,
          id_match: true,
          id_joueur: true,
          buts: true,
          tirs: true,
          arrets: true,
          exclusions_2min: true,
          sept_metres: true,
          id_equipe_adverse: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        equipes,
        joueurs,
        competitions,
        matchs: matchsRaw.map((m) => ({
          ...m,
          date_match: m.date_match?.toISOString() ?? null,
        })),
        statsJoueurs: statsRaw,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur serveur" };
  }
}
