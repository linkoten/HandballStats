"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export type TokenResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Récupère les informations de tokens de l'utilisateur
 */
export async function getUserTokens(): Promise<TokenResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        tokensRemaining: true,
        tokensUsed: true,
        subscription: true,
        competitionAccess: {
          include: {
            competition: {
              include: {
                equipe: {
                  include: {
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
          orderBy: {
            createdAt: "desc",
          },
        },
        tokenUsageHistory: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10, // Dernières 10 utilisations
        },
      },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // Formater les données pour correspondre à l'ancien format
    const formattedData = {
      tokensRemaining: user.tokensRemaining,
      tokensUsed: user.tokensUsed,
      subscription: user.subscription,
      competitions: user.competitionAccess.map((access) => ({
        id: access.id,
        competitionId: access.competitionId,
        tokenUsed: access.tokenUsed,
        createdAt: access.createdAt.toISOString(),
        competition: {
          id: access.competition.id,
          nom: access.competition.nom,
          saison: access.competition.saison,
          equipe: {
            id: access.competition.equipe?.id || 0,
            nom: access.competition.equipe?.nom || "Inconnue",
            club: {
              nom: access.competition.equipe?.club?.nom || "Club inconnu",
            },
          },
        },
      })),
      tokenHistory: user.tokenUsageHistory,
    };

    return {
      success: true,
      data: formattedData,
    };
  } catch (error) {
    console.error("Erreur récupération tokens:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Ajoute des tokens à un utilisateur (admin uniquement)
 */
export async function addTokensToUser(
  targetUserId: string,
  tokensToAdd: number,
  reason?: string,
): Promise<TokenResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!adminUser || adminUser.role !== "ADMIN_GENERAL") {
      throw new Error("Accès refusé - Rôle admin général requis");
    }

    if (tokensToAdd <= 0) {
      throw new Error("Nombre de tokens invalide");
    }

    // Trouver l'utilisateur cible
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { clerkId: targetUserId },
          { email: targetUserId },
          { id: targetUserId },
        ],
      },
    });

    if (!targetUser) {
      throw new Error("Utilisateur cible introuvable");
    }

    // Ajouter les tokens et créer un historique
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: targetUser.id },
        data: {
          tokensRemaining: {
            increment: tokensToAdd,
          },
        },
      });

      await tx.tokenUsageHistory.create({
        data: {
          userId: targetUser.id,
          action: "PURCHASE",
          amount: tokensToAdd,
          reason: reason || `Ajout manuel par admin (${adminUser.email})`,
        },
      });

      return updatedUser;
    });

    return {
      success: true,
      data: {
        message: `${tokensToAdd} tokens ajoutés à ${targetUser.email}`,
        newBalance: result.tokensRemaining,
      },
    };
  } catch (error) {
    console.error("Erreur ajout tokens:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Consomme un token pour accéder à une compétition
 */
export async function consumeTokenForCompetition(
  competitionId: number,
): Promise<TokenResponse> {
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

    if (user.tokensRemaining <= 0) {
      throw new Error("Tokens insuffisants");
    }

    // Vérifier si l'accès n'existe pas déjà
    const existingAccess = await prisma.competitionAccess.findFirst({
      where: {
        userId: user.id,
        competitionId: competitionId,
      },
    });

    if (existingAccess) {
      throw new Error("Accès déjà accordé à cette compétition");
    }

    // Consommer le token et créer l'accès
    const result = await prisma.$transaction(async (tx) => {
      // Décrémenter les tokens
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          tokensRemaining: {
            decrement: 1,
          },
          tokensUsed: {
            increment: 1,
          },
        },
      });

      // Créer l'accès à la compétition
      const access = await tx.competitionAccess.create({
        data: {
          userId: user.id,
          competitionId: competitionId,
          tokenUsed: true,
        },
      });

      // Créer un historique
      await tx.tokenUsageHistory.create({
        data: {
          userId: user.id,
          competitionId,
          action: "SCRAPE",
          amount: -1,
          reason: `Accès compétition #${competitionId}`,
        },
      });

      return { updatedUser, access };
    });

    return {
      success: true,
      data: {
        message: "Token consommé avec succès",
        remainingTokens: result.updatedUser.tokensRemaining,
        accessId: result.access.id,
      },
    };
  } catch (error) {
    console.error("Erreur consommation token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
