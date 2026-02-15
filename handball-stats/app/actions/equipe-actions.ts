"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { safeCreate } from "@/lib/sequence-safety";
import { revalidatePath } from "next/cache";

export type EquipeFormData = {
  nom: string;
  ville: string;
  region?: string;
  departement?: string;
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

    const { nom, ville, region, departement, clubId } = data;

    if (!nom || !ville || !clubId) {
      throw new Error("Nom, ville et club requis");
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Vérifier que l'utilisateur a accès au club
    const userClubAccess = await prisma.userClub.findFirst({
      where: {
        userId: user.id,
        clubId: clubId,
      },
    });

    if (!userClubAccess) {
      throw new Error("Vous n'avez pas accès à ce club");
    }

    // Créer l'équipe avec protection contre la désynchronisation
    const equipe = await safeCreate(
      () =>
        prisma.equipes.create({
          data: {
            nom,
            ville,
            region: region || null,
            departement: departement || null,
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
    const accessCheck = await getEquipeById(equipeId);
    if (!accessCheck.success) {
      throw new Error(accessCheck.error || "Accès refusé");
    }

    // Mettre à jour l'équipe
    const equipe = await prisma.equipes.update({
      where: { id: equipeId },
      data: {
        ...(data.nom && { nom: data.nom }),
        ...(data.ville && { ville: data.ville }),
        ...(data.region !== undefined && { region: data.region || null }),
        ...(data.departement !== undefined && {
          departement: data.departement || null,
        }),
        ...(data.clubId && { clubId: data.clubId }),
      },
    });

    // Revalider les pages qui affichent les équipes
    revalidatePath("/equipes");
    revalidatePath(`/equipes/${equipeId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: equipe,
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
    const accessCheck = await getEquipeById(equipeId);
    if (!accessCheck.success) {
      throw new Error(accessCheck.error || "Accès refusé");
    }

    // Supprimer l'équipe (avec cascade automatique selon le schéma Prisma)
    await prisma.equipes.delete({
      where: { id: equipeId },
    });

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
