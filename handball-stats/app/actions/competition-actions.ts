"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CompetitionFormData = {
  nom: string;
  niveau?: string;
  genre: "MASCULIN" | "FEMININ" | "MIXTE";
  saison: string;
  equipeId: number;
  idChamp?: string;
  poule?: string;
  journeeDebut?: number;
  journeeFin?: number;
  urlBase?: string;
};

export type CompetitionResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Récupère les compétitions pour des équipes données
 */
export async function getCompetitionsByEquipes(
  equipeIds: number[],
): Promise<CompetitionResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    if (!equipeIds || equipeIds.length === 0) {
      throw new Error("IDs d'équipes requis");
    }

    // Récupérer les compétitions pour ces équipes
    const competitions = await prisma.competition.findMany({
      where: {
        equipeId: {
          in: equipeIds,
        },
      },
      include: {
        equipe: {
          select: {
            id: true,
            nom: true,
            ville: true,
          },
        },
      },
      orderBy: [{ saison: "desc" }, { nom: "asc" }],
    });

    return {
      success: true,
      data: competitions,
    };
  } catch (error) {
    console.error("Erreur récupération compétitions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupère toutes les compétitions accessibles à l'utilisateur
 */
export async function getUserCompetitions(): Promise<CompetitionResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Récupérer les compétitions via les accès directs
    const competitionAccess = await prisma.competitionAccess.findMany({
      where: { userId: user.id },
      include: {
        competition: {
          include: {
            equipe: {
              select: {
                id: true,
                nom: true,
                ville: true,
                club: {
                  select: {
                    id: true,
                    nom: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Récupérer aussi les compétitions via les clubs
    const userClubs = await prisma.userClub.findMany({
      where: { userId: user.id },
      include: {
        club: {
          include: {
            equipes: {
              include: {
                competitions: {
                  include: {
                    equipe: {
                      select: {
                        id: true,
                        nom: true,
                        ville: true,
                        club: {
                          select: {
                            id: true,
                            nom: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Combiner toutes les compétitions
    const allCompetitions = [
      ...competitionAccess.map((ca) => ca.competition),
      ...userClubs.flatMap((uc) =>
        uc.club.equipes.flatMap((eq) => eq.competitions),
      ),
    ];

    // Dédoublonner par ID
    const uniqueCompetitions = allCompetitions.filter(
      (comp, index, self) => self.findIndex((c) => c.id === comp.id) === index,
    );

    // Trier par saison et nom
    uniqueCompetitions.sort((a, b) => {
      if (a.saison !== b.saison) {
        return b.saison.localeCompare(a.saison); // Plus récent en premier
      }
      return a.nom.localeCompare(b.nom);
    });

    return {
      success: true,
      data: uniqueCompetitions,
    };
  } catch (error) {
    console.error("Erreur récupération compétitions utilisateur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupère une compétition spécifique par son ID
 */
export async function getCompetitionById(
  competitionId: number,
): Promise<CompetitionResponse> {
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

    // Récupérer la compétition avec vérification d'accès
    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId,
        OR: [
          // Accès direct à la compétition
          {
            competitionAccess: {
              some: { userId: user.id },
            },
          },
          // Accès via le club de l'équipe
          {
            equipe: {
              club: {
                userClubs: {
                  some: { userId: user.id },
                },
              },
            },
          },
        ],
      },
      include: {
        equipe: {
          include: {
            club: true,
          },
        },
        competitionAccess: {
          where: { userId: user.id },
        },
        matchs: {
          include: {
            equipes_matchs_equipe_recevant_idToequipes: true,
            equipes_matchs_equipe_exterieur_idToequipes: true,
          },
          orderBy: [{ journee: "asc" }, { date_match: "asc" }],
        },
      },
    });

    if (!competition) {
      throw new Error("Compétition introuvable ou non autorisée");
    }

    return {
      success: true,
      data: competition,
    };
  } catch (error) {
    console.error("Erreur récupération compétition:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Crée une nouvelle compétition
 */
export async function createCompetition(
  data: CompetitionFormData,
): Promise<CompetitionResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const {
      nom,
      niveau,
      genre,
      saison,
      equipeId,
      idChamp,
      poule,
      journeeDebut,
      journeeFin,
      urlBase,
    } = data;

    if (!nom || !genre || !saison || !equipeId) {
      throw new Error("Nom, genre, saison et équipe requis");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Vérifier l'accès à l'équipe
    const equipe = await prisma.equipes.findFirst({
      where: {
        id: equipeId,
        club: {
          userClubs: {
            some: { userId: user.id },
          },
        },
      },
    });

    if (!equipe) {
      throw new Error("Vous n'avez pas accès à cette équipe");
    }

    // Créer la compétition et l'accès en transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer la compétition
      const competition = await tx.competition.create({
        data: {
          nom,
          niveau,
          genre,
          saison,
          equipeId,
          idChamp,
          poule,
          journeeDebut,
          journeeFin,
          urlBase,
        },
        include: {
          equipe: {
            include: { club: true },
          },
        },
      });

      // Créer l'accès pour l'utilisateur
      await tx.competitionAccess.create({
        data: {
          userId: user.id,
          competitionId: competition.id,
        },
      });

      return competition;
    });

    // Revalider les pages qui affichent les compétitions
    revalidatePath("/competitions");
    revalidatePath("/dashboard");
    revalidatePath(`/equipes/${equipeId}`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Erreur création compétition:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Met à jour une compétition existante
 */
export async function updateCompetition(
  competitionId: number,
  data: Partial<CompetitionFormData>,
): Promise<CompetitionResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Vérifier l'accès avant la mise à jour
    const accessCheck = await getCompetitionById(competitionId);
    if (!accessCheck.success) {
      throw new Error(accessCheck.error || "Accès refusé");
    }

    // Vérifier l'accès à la nouvelle équipe si elle change
    if (data.equipeId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });

      if (!user) {
        throw new Error("Utilisateur introuvable");
      }

      const equipe = await prisma.equipes.findFirst({
        where: {
          id: data.equipeId,
          club: {
            userClubs: {
              some: { userId: user.id },
            },
          },
        },
      });

      if (!equipe) {
        throw new Error("Vous n'avez pas accès à cette équipe");
      }
    }

    // Mettre à jour la compétition
    const competition = await prisma.competition.update({
      where: { id: competitionId },
      data: {
        ...(data.nom && { nom: data.nom }),
        ...(data.niveau !== undefined && { niveau: data.niveau }),
        ...(data.genre && { genre: data.genre }),
        ...(data.saison && { saison: data.saison }),
        ...(data.equipeId && { equipeId: data.equipeId }),
        ...(data.idChamp !== undefined && { idChamp: data.idChamp }),
        ...(data.poule !== undefined && { poule: data.poule }),
        ...(data.journeeDebut !== undefined && {
          journeeDebut: data.journeeDebut,
        }),
        ...(data.journeeFin !== undefined && { journeeFin: data.journeeFin }),
        ...(data.urlBase !== undefined && { urlBase: data.urlBase }),
        lastScrape: new Date(), // Mettre à jour le timestamp de modification
      },
      include: {
        equipe: {
          include: { club: true },
        },
      },
    });

    // Revalider les pages qui affichent les compétitions
    revalidatePath("/competitions");
    revalidatePath(`/competitions/${competitionId}`);
    revalidatePath("/dashboard");
    if (competition.equipeId) {
      revalidatePath(`/equipes/${competition.equipeId}`);
    }

    return {
      success: true,
      data: competition,
    };
  } catch (error) {
    console.error("Erreur mise à jour compétition:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Supprime une compétition
 */
export async function deleteCompetition(
  competitionId: number,
): Promise<CompetitionResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Vérifier l'accès avant la suppression
    const accessCheck = await getCompetitionById(competitionId);
    if (!accessCheck.success) {
      throw new Error(accessCheck.error || "Accès refusé");
    }

    const competitionData = accessCheck.data;
    const equipeId = competitionData.equipeId;

    // Supprimer la compétition (avec cascade automatique selon le schéma Prisma)
    await prisma.competition.delete({
      where: { id: competitionId },
    });

    // Revalider les pages qui affichent les compétitions
    revalidatePath("/competitions");
    revalidatePath("/dashboard");
    if (equipeId) {
      revalidatePath(`/equipes/${equipeId}`);
    }

    return {
      success: true,
      data: { message: "Compétition supprimée avec succès" },
    };
  } catch (error) {
    console.error("Erreur suppression compétition:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Met à jour le statut de scraping d'une compétition
 */
export async function updateCompetitionScrapingStatus(
  competitionId: number,
  status: "EN_COURS" | "TERMINE" | "ERREUR",
  message?: string,
): Promise<CompetitionResponse> {
  try {
    const competition = await prisma.competition.update({
      where: { id: competitionId },
      data: {
        scrapingStatus: status,
        scrapingMessage: message,
        lastScrape: new Date(),
      },
    });

    // Revalider les pages de suivi
    revalidatePath("/competitions/suivi");
    revalidatePath(`/competitions/${competitionId}`);

    return {
      success: true,
      data: competition,
    };
  } catch (error) {
    console.error("Erreur mise à jour statut scraping:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupère le statut de scraping des compétitions spécifiées
 */
export async function getCompetitionsStatus(
  competitionIds: number[],
): Promise<CompetitionResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    if (!competitionIds || competitionIds.length === 0) {
      throw new Error("IDs de compétitions requis");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Récupérer les compétitions avec statut de scraping et statistiques
    const competitions = await prisma.competition.findMany({
      where: {
        id: { in: competitionIds },
        OR: [
          // Accès direct à la compétition
          {
            competitionAccess: {
              some: { userId: user.id },
            },
          },
          // Accès via le club de l'équipe
          {
            equipe: {
              club: {
                userClubs: {
                  some: { userId: user.id },
                },
              },
            },
          },
        ],
      },
      include: {
        equipe: {
          include: {
            club: true,
          },
        },
        matchs: {
          select: {
            id: true,
            _count: {
              select: {
                statistiques_joueur: true,
              },
            },
          },
        },
      },
    });

    // Formater les données pour correspondre au format attendu par le frontend
    const formattedCompetitions = competitions.map((comp) => {
      const matchsCount = comp.matchs.length;
      const matchsWithStatsCount = comp.matchs.filter(
        (match) => match._count.statistiques_joueur > 0,
      ).length;

      return {
        id: comp.id,
        nom: comp.nom,
        saison: comp.saison,
        phase: comp.niveau, // Mapping niveau -> phase pour backward compatibility
        equipe: {
          nom: comp.equipe?.nom || "Équipe inconnue",
          club: comp.equipe?.club?.nom || "Club inconnu",
        },
        scrapingStatus: comp.scrapingStatus || "PENDING",
        scrapingProgress: comp.scrapingProgress || 0,
        scrapingStep: comp.scrapingStep || null,
        scrapingError: comp.scrapingMessage || null,
        lastScrapedAt: comp.lastScrape,
        matchsCount,
        matchsWithStatsCount,
      };
    });

    // Calculer le résumé global
    const summary = {
      total: formattedCompetitions.length,
      completed: formattedCompetitions.filter(
        (c) => c.scrapingStatus === "TERMINE",
      ).length,
      inProgress: formattedCompetitions.filter(
        (c) => c.scrapingStatus === "EN_COURS",
      ).length,
      pending: formattedCompetitions.filter(
        (c) => c.scrapingStatus === "PENDING" || !c.scrapingStatus,
      ).length,
      failed: formattedCompetitions.filter((c) => c.scrapingStatus === "ERREUR")
        .length,
    };

    // Déterminer le statut global
    let globalStatus = "COMPLETED";
    if (summary.inProgress > 0) {
      globalStatus = "IN_PROGRESS";
    } else if (summary.failed > 0) {
      globalStatus = "ERROR";
    } else if (summary.pending > 0) {
      globalStatus = "PENDING";
    }

    return {
      success: true,
      data: {
        globalStatus,
        competitions: formattedCompetitions,
        summary,
      },
    };
  } catch (error) {
    console.error("Erreur récupération statut compétitions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
