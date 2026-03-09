"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { safeCreate } from "@/lib/sequence-safety";
import { revalidatePath } from "next/cache";

export type EquipeFormData = {
  nom: string;
  clubId: number;
};

export type EquipeResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Récupère toutes les équipes d'un club
 */
export async function getEquipesByClub(
  clubId: string,
  saison?: string,
): Promise<EquipeResponse> {
  try {
    if (!clubId) {
      throw new Error("club_id requis");
    }

    // Récupérer toutes les équipes du club
    const equipes = await prisma.equipes.findMany({
      where: {
        clubId: parseInt(clubId),
      },
      include: {
        club: true,
      },
      orderBy: {
        nom: "asc",
      },
    });

    // Formater pour correspondre à l'ancienne API
    const formattedEquipes = equipes.map((equipe) => ({
      id: equipe.id,
      nom: equipe.nom,
      nom_competition: equipe.nom,
      ville: equipe.ville,
      club: equipe.club?.nom || "",
      region: equipe.region,
      departement: equipe.departement,
    }));

    return {
      success: true,
      data: formattedEquipes,
    };
  } catch (error) {
    console.error("Erreur récupération équipes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupère une équipe par son ID avec vérification d'accès
 */
export async function getEquipeById(equipeId: number): Promise<EquipeResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    if (isNaN(equipeId)) {
      throw new Error("ID d'équipe invalide");
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Récupérer l'équipe avec vérification d'accès via club OU compétition
    const equipe = await prisma.equipes.findUnique({
      where: { id: equipeId },
      include: {
        club: true,
        competitions: {
          include: {
            competitionAccess: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!equipe) {
      throw new Error("Équipe introuvable");
    }

    // Vérifier l'accès via club
    const hasClubAccess = await prisma.userClub.findFirst({
      where: {
        userId: user.id,
        clubId: equipe.clubId || undefined,
      },
    });

    // Vérifier l'accès via compétitions
    const hasCompetitionAccess = equipe.competitions.some(
      (comp) => comp.competitionAccess.length > 0,
    );

    if (!hasClubAccess && !hasCompetitionAccess) {
      throw new Error("Accès refusé à cette équipe");
    }

    return {
      success: true,
      data: equipe,
    };
  } catch (error) {
    console.error("Erreur récupération équipe:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Crée une nouvelle équipe
 */
export async function createEquipe(
  data: EquipeFormData,
): Promise<EquipeResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const { nom, clubId } = data;

    if (!nom || !clubId) {
      throw new Error("Nom et club requis");
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Guard d'accès : seul admin du club ou ADMIN_GENERAL peut créer une équipe
    const { isAdmin, isGeneralAdmin, hasAccess } =
      await require("@/lib/access-control").checkUserClubRole({
        userId,
        clubId,
      });
    if (!hasAccess || (!isAdmin && !isGeneralAdmin)) {
      throw new Error(
        "Seul l'admin du club ou l'admin général peut créer une équipe",
      );
    }

    // Récupérer les infos du club pour pré-remplir région/département/ville
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { region: true, departement: true, ville: true },
    });
    if (!club) {
      throw new Error("Club introuvable");
    }

    // Créer l'équipe avec les infos du club
    const equipe = await safeCreate(
      () =>
        prisma.equipes.create({
          data: {
            nom,
            ville: club.ville || null,
            region: club.region || null,
            departement: club.departement || null,
            clubId: clubId,
          },
        }),
      "equipes",
    );

    // Revalider les pages qui affichent les équipes
    revalidatePath("/equipes");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: equipe,
    };
  } catch (error) {
    console.error("Erreur création équipe:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Met à jour une équipe existante
 */
export async function updateEquipe(
  equipeId: number,
  data: Partial<EquipeFormData>,
): Promise<EquipeResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Vérifier l'accès avant la mise à jour
    const equipe = await prisma.equipes.findUnique({ where: { id: equipeId } });
    if (!equipe) {
      throw new Error("Équipe introuvable");
    }
    const { isAdmin, isGeneralAdmin, hasAccess } =
      await require("@/lib/access-control").checkUserClubRole({
        userId,
        clubId: equipe.clubId!,
      });
    if (!hasAccess || (!isAdmin && !isGeneralAdmin)) {
      throw new Error(
        "Seul l'admin du club ou l'admin général peut modifier une équipe",
      );
    }

    // Mettre à jour l'équipe (seul le nom et clubId peuvent être modifiés via ce formulaire)
    const updatedEquipe = await prisma.equipes.update({
      where: { id: equipeId },
      data: {
        ...(data.nom && { nom: data.nom }),
        ...(data.clubId && { clubId: data.clubId }),
      },
    });

    // Revalider les pages qui affichent les équipes
    revalidatePath("/equipes");
    revalidatePath(`/equipes/${equipeId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: updatedEquipe,
    };
  } catch (error) {
    console.error("Erreur mise à jour équipe:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Supprime une équipe
 */
export async function deleteEquipe(equipeId: number): Promise<EquipeResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Vérifier l'accès avant la suppression
    const equipe = await prisma.equipes.findUnique({ where: { id: equipeId } });
    if (!equipe) {
      throw new Error("Équipe introuvable");
    }
    const { isAdmin, isGeneralAdmin, hasAccess } =
      await require("@/lib/access-control").checkUserClubRole({
        userId,
        clubId: equipe.clubId!,
      });
    if (!hasAccess || (!isAdmin && !isGeneralAdmin)) {
      throw new Error(
        "Seul l'admin du club ou l'admin général peut supprimer une équipe",
      );
    }

    await prisma.equipes.delete({ where: { id: equipeId } });

    // Revalider les pages qui affichent les équipes
    revalidatePath("/equipes");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { message: "Équipe supprimée avec succès" },
    };
  } catch (error) {
    console.error("Erreur suppression équipe:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

export async function getEquipesWithStatsByClub(
  clubId: string,
  saison?: string,
): Promise<EquipeResponse> {
  try {
    if (!clubId) throw new Error("club_id requis");

    const equipes = await prisma.equipes.findMany({
      where: {
        clubId: parseInt(clubId),
      },
      include: {
        club: true,
        _count: {
          select: {
            joueurs: true,
            competitions: true, // Vérifie bien le nom dans ton schéma
          },
        },
      },
      orderBy: {
        nom: "asc",
      },
    });

    const formattedEquipes = equipes.map((equipe) => ({
      id: equipe.id,
      nom: equipe.nom,
      nom_competition: equipe.nom,
      ville: equipe.ville,
      club: equipe.club?.nom || "",
      region: equipe.region,
      departement: equipe.departement,
      _count: equipe._count, // On transmet les stats à l'UI
    }));

    return {
      success: true,
      data: formattedEquipes,
    };
  } catch (error) {
    console.error("Erreur récupération équipes avec stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

export async function getEquipeDetails(equipeId: string) {
  try {
    const id = parseInt(equipeId);
    if (isNaN(id)) throw new Error("ID d'équipe invalide");

    const equipe = await prisma.equipes.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            joueurs: true,
            competitions: true,
          },
        },
        // On récupère les compétitions liées pour avoir les derniers matchs
        competitions: {
          include: {
            matchs: {
              orderBy: { date_match: "desc" },
              include: {
                equipes_matchs_equipe_recevant_idToequipes: true,
                equipes_matchs_equipe_exterieur_idToequipes: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data: equipe };
  } catch (error) {
    return {
      success: false,
      error: "Erreur lors de la récupération des détails",
    };
  }
}

/**
 * Compte les joueurs distincts d'un club (ne compte qu'une fois chaque joueur par nom_prenom)
 */
export async function getDistinctPlayersCountByClub(
  clubId: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    if (!clubId) {
      throw new Error("club_id requis");
    }

    // Récupérer le nombre de noms distincts de joueurs dans ce club
    const distinctNamesCount = await prisma.joueurs.groupBy({
      by: ["nom_prenom"],
      where: {
        equipes: {
          clubId: parseInt(clubId),
        },
      },
      _count: {
        nom_prenom: true,
      },
    });

    return {
      success: true,
      count: distinctNamesCount.length,
    };
  } catch (error) {
    console.error("Erreur comptage joueurs distincts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
