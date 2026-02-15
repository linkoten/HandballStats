"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ClubFormData = {
  nom: string;
  ville?: string;
  region?: string;
  departement?: string;
  email?: string;
  telephone?: string;
};

export type ClubResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Récupère les codes d'accès aux clubs pour un admin
 */
export async function getClubCodes(): Promise<ClubResponse> {
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

    // Vérifier si l'utilisateur est admin
    if (!["ADMIN_CLUB", "ADMIN_GENERAL"].includes(user.role)) {
      throw new Error("Accès refusé - Rôle admin requis");
    }

    // Récupérer les clubs avec leurs codes
    const clubs = await prisma.club.findMany({
      where: {
        userClubs: {
          some: {
            userId: user.id,
          },
        },
      },
      select: {
        id: true,
        nom: true,
        ville: true,
        coachCode: true,
        playerCode: true,
        _count: {
          select: {
            userClubs: true,
            equipes: true,
          },
        },
      },
      orderBy: {
        nom: "asc",
      },
    });

    return {
      success: true,
      data: { clubs },
    };
  } catch (error) {
    console.error("Erreur récupération codes clubs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Valide un code de club et ajoute l'utilisateur au club
 */
export async function validateClubCode(code: string): Promise<ClubResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    if (!code || code.trim().length === 0) {
      throw new Error("Code requis");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Chercher le club avec ce code d'accès (coach ou player)
    const club = await prisma.club.findFirst({
      where: {
        OR: [
          { coachCode: code.trim().toUpperCase() },
          { playerCode: code.trim().toUpperCase() },
        ],
      },
    });

    if (!club) {
      throw new Error("Code invalide ou club introuvable");
    }

    // Vérifier si l'utilisateur n'est pas déjà membre du club
    const existingMembership = await prisma.userClub.findFirst({
      where: {
        userId: user.id,
        clubId: club.id,
      },
    });

    if (existingMembership) {
      throw new Error("Vous êtes déjà membre de ce club");
    }

    // Déterminer le rôle selon le code utilisé
    const isCoachCode = club.coachCode === code.trim().toUpperCase();
    const newRole = isCoachCode ? "ENTRAINEUR" : "UTILISATEUR";

    // Ajouter l'utilisateur au club
    await prisma.$transaction(async (tx) => {
      // Mettre à jour le rôle de l'utilisateur
      await tx.user.update({
        where: { id: user.id },
        data: { role: newRole as any },
      });

      // Créer l'association user-club
      await tx.userClub.create({
        data: {
          userId: user.id,
          clubId: club.id,
          isPrincipal: false,
        },
      });

      return { newRole };
    });

    // Revalider les pages concernées
    revalidatePath("/dashboard");
    revalidatePath("/clubs");

    return {
      success: true,
      data: {
        message: `Vous avez rejoint le club ${club.nom} avec le rôle ${newRole}`,
        newRole,
        clubName: club.nom,
      },
    };
  } catch (error) {
    console.error("Erreur validation code club:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupère tous les clubs disponibles
 */
export async function getClubs(): Promise<ClubResponse> {
  try {
    const clubs = await prisma.club.findMany({
      include: {
        _count: {
          select: {
            equipes: true,
          },
        },
      },
      orderBy: [
        { region: "asc" },
        { departement: "asc" },
        { ville: "asc" },
        { nom: "asc" },
      ],
    });

    return {
      success: true,
      data: clubs,
    };
  } catch (error) {
    console.error("Erreur récupération clubs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Récupère tous les clubs de l'utilisateur
 */
export async function getUserClubs(): Promise<ClubResponse> {
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

    // Récupérer tous les clubs de l'utilisateur avec détails
    const userClubs = await prisma.userClub.findMany({
      where: {
        userId: user.id,
      },
      include: {
        club: {
          include: {
            _count: {
              select: {
                equipes: true,
                userClubs: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    return {
      success: true,
      data: userClubs,
    };
  } catch (error) {
    console.error("Erreur récupération clubs utilisateur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Crée un nouveau club
 */
export async function createClub(data: ClubFormData): Promise<ClubResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const { nom, ville, region, departement, email, telephone } = data;

    if (!nom) {
      throw new Error("Nom du club requis");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Générer des codes d'accès uniques
    const generateAccessCode = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    let coachCode = generateAccessCode();
    let playerCode = generateAccessCode();

    // Vérifier l'unicité des codes
    let existingCoach = await prisma.club.findFirst({
      where: { coachCode },
    });
    let existingPlayer = await prisma.club.findFirst({
      where: { playerCode },
    });

    while (existingCoach) {
      coachCode = generateAccessCode();
      existingCoach = await prisma.club.findFirst({
        where: { coachCode },
      });
    }

    while (existingPlayer) {
      playerCode = generateAccessCode();
      existingPlayer = await prisma.club.findFirst({
        where: { playerCode },
      });
    }

    // Créer le club et associer l'utilisateur comme admin
    const result = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          nom,
          ville,
          region,
          departement,
          email,
          telephone,
          coachCode,
          playerCode,
        },
      });

      // Ajouter l'utilisateur comme admin du club
      await tx.userClub.create({
        data: {
          userId: user.id,
          clubId: club.id,
          isPrincipal: true,
        },
      });

      // Mettre à jour le rôle de l'utilisateur
      await tx.user.update({
        where: { id: user.id },
        data: { role: "ADMIN_CLUB" as any },
      });

      return club;
    });

    // Revalider les pages concernées
    revalidatePath("/dashboard");
    revalidatePath("/clubs");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Erreur création club:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
