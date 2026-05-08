"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type MatchFormData = {
  date_match: Date;
  equipe_recevant_id: number;
  equipe_exterieur_id: number;
  score_recevant?: number;
  score_exterieur?: number;
  journee?: number;
  lieu?: string;
  statut?: string;
};

export type MatchResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Récupère les matchs avec filtrage optionnel
 */
export async function getMatchs(params?: {
  equipeId?: string;
  competitionId?: string;
  saison?: string;
  limit?: number;
}): Promise<MatchResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    let whereClause: any = {};
    let accessibleEquipeIds: number[] = [];

    // 1. Récupérer les équipes accessibles via les clubs de l'utilisateur
    const userClubs = await prisma.userClub.findMany({
      where: { userId: user.id },
      include: {
        club: {
          include: { equipes: true },
        },
      },
    });

    accessibleEquipeIds = userClubs.flatMap((uc) =>
      uc.club.equipes.map((eq) => eq.id),
    );

    // 2. Récupérer aussi les équipes accessibles via les compétitions (accès direct)
    const userCompetitions = await prisma.competitionAccess.findMany({
      where: { userId: user.id },
      include: {
        competition: {
          select: { equipeId: true },
        },
      },
    });

    const competitionEquipeIds = userCompetitions
      .map((uc) => uc.competition.equipeId)
      .filter(Boolean) as number[];

    // Fusionner et dédoublonner les IDs d'équipes accessibles
    accessibleEquipeIds = [
      ...new Set([...accessibleEquipeIds, ...competitionEquipeIds]),
    ];

    if (accessibleEquipeIds.length === 0) {
      return { success: true, data: [] };
    }

    // 3. Construction de la clause WHERE
    if (params?.equipeId) {
      const equipeId = parseInt(params.equipeId);
      if (!accessibleEquipeIds.includes(equipeId)) {
        throw new Error("Accès refusé pour cette équipe");
      }
      whereClause.OR = [
        { equipe_recevant_id: equipeId },
        { equipe_exterieur_id: equipeId },
      ];
    } else {
      // Par défaut, tous les matchs des équipes auxquelles j'ai accès
      whereClause.OR = [
        { equipe_recevant_id: { in: accessibleEquipeIds } },
        { equipe_exterieur_id: { in: accessibleEquipeIds } },
      ];
    }

    if (params?.competitionId) {
      const competitionId = parseInt(params.competitionId);
      // Vérification stricte d'accès à la compétition
      const access = await prisma.competitionAccess.findFirst({
        where: { userId: user.id, competitionId },
      });
      if (!access) {
        return { success: false, error: "Accès refusé à la compétition" };
      }
      whereClause.competitionId = competitionId;
    }

    if (params?.saison) {
      whereClause.competition = { saison: params.saison };
    }

    // 4. Requête Prisma avec toutes les relations nécessaires pour l'UI
    const matchs = await prisma.matchs.findMany({
      where: whereClause,
      include: {
        equipes_matchs_equipe_recevant_idToequipes: {
          include: { club: true },
        },
        equipes_matchs_equipe_exterieur_idToequipes: {
          include: { club: true },
        },
        competition: true,
        // CRUCIAL : On récupère les stats pour le top buteur
        statistiques_joueur: {
          include: {
            joueurs: true,
          },
        },
      },
      orderBy: [{ date_match: "desc" }],
      take: params?.limit || undefined,
    });

    // 5. Formatage des données pour le composant React
    const formattedMatchs = matchs.map((match) => {
      // Déterminer si l'équipe à domicile est celle de l'utilisateur
      const isHomeOwner = accessibleEquipeIds.includes(
        match.equipe_recevant_id || 0,
      );

      return {
        id: match.id,
        date_match: match.date_match,
        competition_name: match.competition_name || match.competition?.nom,
        score_final: match.score_final,
        recevant_nom_display: match.recevant_nom_display,
        exterieur_nom_display: match.exterieur_nom_display,
        isHomeOwner, // Flag pour les couleurs Victoire/Défaite

        // On passe les stats nettoyées
        stats_joueurs: match.statistiques_joueur.map((s) => ({
          buts: s.buts,
          joueur: { nom: s.joueurs?.nom_prenom },
        })),

        equipe_recevant: match.equipes_matchs_equipe_recevant_idToequipes
          ? {
              id: match.equipes_matchs_equipe_recevant_idToequipes.id,
              nom: match.equipes_matchs_equipe_recevant_idToequipes.nom,
              clubId: match.equipes_matchs_equipe_recevant_idToequipes.clubId,
              club: match.equipes_matchs_equipe_recevant_idToequipes.club?.nom,
            }
          : null,

        equipe_exterieur: match.equipes_matchs_equipe_exterieur_idToequipes
          ? {
              id: match.equipes_matchs_equipe_exterieur_idToequipes.id,
              nom: match.equipes_matchs_equipe_exterieur_idToequipes.nom,
              clubId: match.equipes_matchs_equipe_exterieur_idToequipes.clubId,
              club: match.equipes_matchs_equipe_exterieur_idToequipes.club?.nom,
            }
          : null,

        competition: match.competition
          ? {
              id: match.competition.id,
              nom: match.competition.nom,
              saison: match.competition.saison,
              niveau: match.competition.niveau,
            }
          : null,
      };
    });

    return {
      success: true,
      data: formattedMatchs,
    };
  } catch (error) {
    console.error("Erreur getMatchs:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la récupération des matchs",
    };
  }
}

/**
 * Récupère un match spécifique par son ID
 */
export async function getMatchById(matchId: number): Promise<MatchResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Récupérer le match avec vérification d'accès
    const match = await prisma.matchs.findFirst({
      where: {
        id: matchId,
        OR: [
          {
            equipes_matchs_equipe_recevant_idToequipes: {
              club: {
                userClubs: {
                  some: { userId: user.id },
                },
              },
            },
          },
          {
            equipes_matchs_equipe_exterieur_idToequipes: {
              club: {
                userClubs: {
                  some: { userId: user.id },
                },
              },
            },
          },
          {
            competition: {
              competitionAccess: {
                some: { userId: user.id },
              },
            },
          },
        ],
      },
      include: {
        equipes_matchs_equipe_recevant_idToequipes: {
          include: { club: true },
        },
        equipes_matchs_equipe_exterieur_idToequipes: {
          include: { club: true },
        },
        competition: true,
        statistiques_joueur: {
          include: {
            joueurs: true,
          },
        },
      },
    });

    if (!match) {
      throw new Error("Match introuvable ou non autorisé");
    }

    return {
      success: true,
      data: {
        ...match,
        date_match: match.date_match?.toISOString() ?? null,
      },
    };
  } catch (error) {
    console.error("Erreur récupération match:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Crée un nouveau match
 */

/**
 * Met à jour un match existant
 */
export async function updateMatch(
  matchId: number,
  data: Partial<MatchFormData>,
): Promise<MatchResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Vérifier l'accès avant la mise à jour
    const accessCheck = await getMatchById(matchId);
    if (!accessCheck.success) {
      throw new Error(accessCheck.error || "Accès refusé");
    }

    const matchData = accessCheck.data;

    // Vérifications supplémentaires si les équipes changent
    if (data.equipe_recevant_id || data.equipe_exterieur_id) {
      const newEquipeRecevantId =
        data.equipe_recevant_id || matchData.equipe_recevant_id;
      const newEquipeExterieurId =
        data.equipe_exterieur_id || matchData.equipe_exterieur_id;

      if (newEquipeRecevantId === newEquipeExterieurId) {
        throw new Error("Une équipe ne peut pas jouer contre elle-même");
      }

      // Vérifier l'accès aux nouvelles équipes si elles changent
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });

      if (!user) {
        throw new Error("Utilisateur introuvable");
      }

      const changedEquipeIds = [];
      if (
        data.equipe_recevant_id &&
        data.equipe_recevant_id !== matchData.equipe_recevant_id
      ) {
        changedEquipeIds.push(data.equipe_recevant_id);
      }
      if (
        data.equipe_exterieur_id &&
        data.equipe_exterieur_id !== matchData.equipe_exterieur_id
      ) {
        changedEquipeIds.push(data.equipe_exterieur_id);
      }

      if (changedEquipeIds.length > 0) {
        const accessibleEquipes = await prisma.equipes.findMany({
          where: {
            id: { in: changedEquipeIds },
            club: {
              userClubs: {
                some: { userId: user.id },
              },
            },
          },
        });

        if (accessibleEquipes.length !== changedEquipeIds.length) {
          throw new Error("Accès refusé aux nouvelles équipes");
        }
      }
    }

    // Mettre à jour le match
    const match = await prisma.matchs.update({
      where: { id: matchId },
      data: {
        ...(data.date_match && { date_match: data.date_match }),
        ...(data.equipe_recevant_id && {
          equipe_recevant_id: data.equipe_recevant_id,
        }),
        ...(data.equipe_exterieur_id && {
          equipe_exterieur_id: data.equipe_exterieur_id,
        }),
        ...(data.score_recevant !== undefined && {
          score_recevant: data.score_recevant,
        }),
        ...(data.score_exterieur !== undefined && {
          score_exterieur: data.score_exterieur,
        }),
        ...(data.journee !== undefined && { journee: data.journee }),
        ...(data.lieu !== undefined && { lieu: data.lieu }),
        ...(data.statut && { statut: data.statut }),
      },
      include: {
        equipes_matchs_equipe_recevant_idToequipes: {
          include: { club: true },
        },
        equipes_matchs_equipe_exterieur_idToequipes: {
          include: { club: true },
        },
      },
    });

    // Revalider les pages qui affichent les matchs
    revalidatePath("/matchs");
    revalidatePath(`/matchs/${matchId}`);
    revalidatePath(`/equipes/${match.equipe_recevant_id}`);
    revalidatePath(`/equipes/${match.equipe_exterieur_id}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: match,
    };
  } catch (error) {
    console.error("Erreur mise à jour match:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Supprime un match
 */
export async function deleteMatch(matchId: number): Promise<MatchResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Vérifier l'accès avant la suppression
    const accessCheck = await getMatchById(matchId);
    if (!accessCheck.success) {
      throw new Error(accessCheck.error || "Accès refusé");
    }

    const matchData = accessCheck.data;
    const equipeRecevantId = matchData.equipe_recevant_id;
    const equipeExterieurId = matchData.equipe_exterieur_id;

    // Supprimer le match (avec cascade automatique selon le schéma Prisma)
    await prisma.matchs.delete({
      where: { id: matchId },
    });

    // Revalider les pages qui affichent les matchs
    revalidatePath("/matchs");
    revalidatePath(`/equipes/${equipeRecevantId}`);
    revalidatePath(`/equipes/${equipeExterieurId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { message: "Match supprimé avec succès" },
    };
  } catch (error) {
    console.error("Erreur suppression match:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupère tous les matchs accessibles par l'utilisateur (pour la page principale)
 */
export async function getMatchsByUser(): Promise<MatchResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Récupérer les compétitions auxquelles l'utilisateur a accès
    const competitionAccess = await prisma.competitionAccess.findMany({
      where: { userId: user.id },
      select: { competitionId: true },
    });

    const competitionIds = competitionAccess.map(
      (access) => access.competitionId,
    );

    if (competitionIds.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Récupérer les matchs pour ces compétitions
    const matchs = await prisma.matchs.findMany({
      where: {
        competitionId: {
          in: competitionIds,
        },
      },
      include: {
        equipes_matchs_equipe_recevant_idToequipes: {
          select: { id: true, nom: true, ville: true },
        },
        equipes_matchs_equipe_exterieur_idToequipes: {
          select: { id: true, nom: true, ville: true },
        },
        competition: {
          select: { id: true, nom: true, saison: true },
        },
      },
      orderBy: {
        date_match: "desc",
      },
      take: 50,
    });

    return {
      success: true,
      data: matchs,
    };
  } catch (error) {
    console.error("Erreur récupération matchs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Met à jour les statistiques individuelles d'un joueur pour un match.
 * Réservé aux rôles : ENTRAINEUR, ADMIN_CLUB, ADMIN_GENERAL.
 */
export async function updateStatistiquesJoueur(
  statId: number,
  data: {
    buts?: number;
    tirs?: number;
    arrets?: number;
    exclusions_2min?: number;
    avertissements?: number;
    discipline?: number;
    sept_metres?: number;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) throw new Error("Utilisateur introuvable");

    const allowedRoles = ["ENTRAINEUR", "ADMIN_CLUB", "ADMIN_GENERAL"];
    if (!allowedRoles.includes(user.role)) {
      throw new Error("Accès non autorisé — rôle insuffisant");
    }

    // Vérifier que la stat existe et que l'utilisateur a accès via son club
    const stat = await prisma.statistiques_joueur.findUnique({
      where: { id: statId },
      include: {
        matchs: {
          include: {
            equipes_matchs_equipe_recevant_idToequipes: {
              select: { clubId: true },
            },
          },
        },
      },
    });

    if (!stat) throw new Error("Statistique introuvable");

    if (user.role !== "ADMIN_GENERAL") {
      const clubId =
        stat.matchs?.equipes_matchs_equipe_recevant_idToequipes?.clubId;
      if (clubId) {
        const membership = await prisma.userClub.findFirst({
          where: { userId: user.id, clubId },
        });
        if (!membership) throw new Error("Accès refusé à ce match");
      }
    }

    // Valider que les valeurs sont positives ou nulles
    const clean: {
      buts?: number;
      tirs?: number;
      arrets?: number;
      exclusions_2min?: number;
      avertissements?: number;
      discipline?: number;
      sept_metres?: number;
    } = {};
    if (data.buts !== undefined) clean.buts = Math.max(0, data.buts);
    if (data.tirs !== undefined) clean.tirs = Math.max(0, data.tirs);
    if (data.arrets !== undefined) clean.arrets = Math.max(0, data.arrets);
    if (data.exclusions_2min !== undefined)
      clean.exclusions_2min = Math.max(0, data.exclusions_2min);
    if (data.avertissements !== undefined)
      clean.avertissements = Math.max(0, data.avertissements);
    if (data.discipline !== undefined)
      clean.discipline = Math.max(0, data.discipline);
    if (data.sept_metres !== undefined)
      clean.sept_metres = Math.max(0, data.sept_metres);

    await prisma.statistiques_joueur.update({
      where: { id: statId },
      data: clean,
    });

    const matchId = stat.id_match;
    if (matchId) {
      revalidatePath(`/dashboard/clubs`);
      revalidatePath(`/dashboard/matchs/${matchId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur mise à jour statistiques joueur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
