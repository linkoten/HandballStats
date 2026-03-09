"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getUserClubs } from "./club-actions";
import { SubscriptionType, UserRole } from "@prisma/client";

export type UserProfileResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

export async function syncUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Non authentifié");
  }

  // Récupérer les infos de Clerk
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Utilisateur Clerk introuvable");
  }
  const email = clerkUser.emailAddresses[0].emailAddress;

  // 1. Chercher un utilisateur existant avec ce mail
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    // Si le clerkId n'est pas le bon, le mettre à jour
    if (user.clerkId !== userId) {
      user = await prisma.user.update({
        where: { email },
        data: {
          clerkId: userId,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        },
        include: { clubs: true },
      });
    } else {
      // Mettre à jour les infos si besoin
      user = await prisma.user.update({
        where: { email },
        data: {
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        },
        include: { clubs: true },
      });
    }
    return user;
  }

  // 2. Sinon, faire l'upsert classique par clerkId
  user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {
      email: email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    },
    create: {
      clerkId: userId,
      email: email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      subscription: SubscriptionType.GRATUIT,
      role: UserRole.UTILISATEUR,
    },
    include: { clubs: true },
  });
  return user;
}

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { clubs: true },
  });

  return user;
}

/**
 * Récupère le profil complet de l'utilisateur connecté
 */
export async function getUserProfile(): Promise<UserProfileResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        subscription: true,
        role: true,
        tokensRemaining: true,
        tokensUsed: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
        createdAt: true,
        updatedAt: true,
        clubs: {
          include: {
            club: {
              select: {
                id: true,
                nom: true,
                ville: true,
                coachCode: true,
                playerCode: true,
              },
            },
          },
        },
        competitionAccess: {
          include: {
            competition: {
              select: {
                id: true,
                nom: true,
                saison: true,
                equipe: {
                  select: {
                    nom: true,
                    club: {
                      select: {
                        nom: true,
                      },
                    },
                  },
                },
              },
            },
          },
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
      // Essayer de synchroniser l'utilisateur s'il n'existe pas
      const syncedUser = await syncUser();
      return {
        success: true,
        data: {
          ...syncedUser,
          clubs: [],
          competitionAccess: [],
        },
      };
    }

    // Formater les données pour correspondre au format attendu
    const clubs = user.clubs.map((uc) => ({ ...uc.club }));
    const formattedUser = {
      ...user,
      stripeCurrentPeriodEnd:
        user.stripeCurrentPeriodEnd?.toISOString() || null,
      clubs,
      club: clubs[0] || null,
      recentCompetitions: user.competitionAccess.map((ca) => ca.competition),
    };

    return {
      success: true,
      data: formattedUser,
    };
  } catch (error) {
    console.error("Erreur récupération profil utilisateur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Met à jour le profil utilisateur
 */
export async function updateUserProfile(data: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): Promise<UserProfileResponse> {
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

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email }),
      },
    });

    return {
      success: true,
      data: updatedUser,
    };
  } catch (error) {
    console.error("Erreur mise à jour profil:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
