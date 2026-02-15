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

    // Récupérer les équipes accessibles via les clubs de l'utilisateur
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

    // Récupérer aussi les équipes accessibles via les compétitions
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

    accessibleEquipeIds = [
      ...new Set([...accessibleEquipeIds, ...competitionEquipeIds]),
    ];

    if (accessibleEquipeIds.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Filtrer les matchs où l'utilisateur a accès à au moins une des équipes
    whereClause.OR = [
      { equipe_recevant_id: { in: accessibleEquipeIds } },
      { equipe_exterieur_id: { in: accessibleEquipeIds } },
    ];

    // Appliquer les filtres supplémentaires
    if (params?.equipeId) {
      const equipeId = parseInt(params.equipeId);
      if (!accessibleEquipeIds.includes(equipeId)) {
        throw new Error("Équipe non autorisée");
      }
      whereClause.OR = [
        { equipe_recevant_id: equipeId },
        { equipe_exterieur_id: equipeId },
      ];
    }

    if (params?.competitionId) {
      // Vérifier l'accès à la compétition
      const competitionAccess = await prisma.competitionAccess.findFirst({
        where: {
          competitionId: parseInt(params.competitionId),
          userId: user.id,
        },
      });

      if (!competitionAccess) {
        throw new Error("Compétition non autorisée");
      }

      whereClause.competition_id = parseInt(params.competitionId);
    }

    // Récupérer les matchs
    const matchs = await prisma.matchs.findMany({
      where: whereClause,
      include: {
        equipes_matchs_equipe_recevant_idToequipes: {
          include: { club: true },
        },
        equipes_matchs_equipe_exterieur_idToequipes: {
          include: { club: true },
        },
        competitions: true,
      },
      orderBy: [{ date_match: "desc" }, { journee: "asc" }],
      take: params?.limit || undefined,
    });

    // Formater pour correspondre à l'ancienne API
    const formattedMatchs = matchs.map((match) => ({
      id: match.id,
      date_match: match.date_match,
      equipe_recevant_id: match.equipe_recevant_id,
      equipe_exterieur_id: match.equipe_exterieur_id,
      score_recevant: match.score_recevant,
      score_exterieur: match.score_exterieur,
      journee: match.journee,
      lieu: match.lieu,
      statut: match.statut,
      competition_id: match.competition_id,
      equipe_recevant: match.equipes_matchs_equipe_recevant_idToequipes
        ? {
            id: match.equipes_matchs_equipe_recevant_idToequipes.id,
            nom: match.equipes_matchs_equipe_recevant_idToequipes.nom,
            ville: match.equipes_matchs_equipe_recevant_idToequipes.ville,
            club:
              match.equipes_matchs_equipe_recevant_idToequipes.club?.nom || "",
          }
        : null,
      equipe_exterieur: match.equipes_matchs_equipe_exterieur_idToequipes
        ? {
            id: match.equipes_matchs_equipe_exterieur_idToequipes.id,
            nom: match.equipes_matchs_equipe_exterieur_idToequipes.nom,
            ville: match.equipes_matchs_equipe_exterieur_idToequipes.ville,
            club:
              match.equipes_matchs_equipe_exterieur_idToequipes.club?.nom || "",
          }
        : null,
      competition: match.competitions
        ? {
            id: match.competitions.id,
            nom: match.competitions.nom,
            niveau: match.competitions.niveau,
            genre: match.competitions.genre,
          }
        : null,
    }));

    return {
      success: true,
      data: formattedMatchs,
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
            competitions: {
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
        competitions: true,
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
      data: match,
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
export async function createMatch(data: MatchFormData): Promise<MatchResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const {
      date_match,
      equipe_recevant_id,
      equipe_exterieur_id,
      score_recevant,
      score_exterieur,
      journee,
      lieu,
      statut,
    } = data;

    if (!date_match || !equipe_recevant_id || !equipe_exterieur_id) {
      throw new Error("Date, équipe recevante et équipe extérieure requis");
    }

    if (equipe_recevant_id === equipe_exterieur_id) {
      throw new Error("Une équipe ne peut pas jouer contre elle-même");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Vérifier l'accès aux équipes
    const accessibleEquipes = await prisma.equipes.findMany({
      where: {
        id: { in: [equipe_recevant_id, equipe_exterieur_id] },
        club: {
          userClubs: {
            some: { userId: user.id },
          },
        },
      },
    });

    if (accessibleEquipes.length !== 2) {
      throw new Error("Accès refusé à une ou plusieurs équipes");
    }

    // Créer le match
    const match = await prisma.matchs.create({
      data: {
        date_match,
        equipe_recevant_id,
        equipe_exterieur_id,
        score_recevant,
        score_exterieur,
        journee,
        lieu,
        statut: statut || "PROGRAMME",
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
    revalidatePath(`/equipes/${equipe_recevant_id}`);
    revalidatePath(`/equipes/${equipe_exterieur_id}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: match,
    };
  } catch (error) {
    console.error("Erreur création match:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

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
