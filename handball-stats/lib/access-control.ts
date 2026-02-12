import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

/**
 * Récupère les IDs des équipes auxquelles l'utilisateur a accès
 * Utilisé pour filtrer les données (matchs, joueurs, stats)
 */
export async function getUserAccessibleEquipeIds(): Promise<{
  equipeIds: number[];
  isPremium: boolean;
  userId: string | null;
}> {
  const { userId } = await auth();

  if (!userId) {
    return { equipeIds: [], isPremium: false, userId: null };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      competitionAccess: {
        include: {
          competition: {
            select: { equipeId: true },
          },
        },
      },
    },
  });

  if (!user) {
    return { equipeIds: [], isPremium: false, userId: null };
  }

  const isPremium = user.subscription === "PREMIUM";

  // Récupérer les IDs uniques des équipes via les compétitions accessibles
  const equipeIds = [
    ...new Set(
      user.competitionAccess.map((access) => access.competition.equipeId)
    ),
  ];

  return { equipeIds, isPremium, userId: user.id };
}

/**
 * Vérifie si l'utilisateur a accès à une équipe spécifique
 */
export async function checkEquipeAccess(equipeId: number): Promise<{
  hasAccess: boolean;
  reason?: string;
}> {
  const { equipeIds, isPremium } = await getUserAccessibleEquipeIds();

  if (isPremium) {
    return { hasAccess: true, reason: "premium_unlimited" };
  }

  if (equipeIds.includes(equipeId)) {
    return { hasAccess: true, reason: "active_token" };
  }

  return { hasAccess: false, reason: "no_token" };
}

/**
 * Filtre WHERE pour Prisma qui limite l'accès aux équipes de l'utilisateur
 * Utilisation:
 * const where = await getEquipeAccessFilter()
 * const matchs = await prisma.matchs.findMany({ where: { ...where, ...otherConditions } })
 */
export async function getEquipeAccessFilter() {
  const { equipeIds, isPremium } = await getUserAccessibleEquipeIds();

  // Si premium, pas de filtre (accès à tout)
  if (isPremium) {
    return {};
  }

  // Sinon, filtrer par les équipes accessibles
  return {
    OR: [
      { equipe_recevant_id: { in: equipeIds } },
      { equipe_exterieur_id: { in: equipeIds } },
    ],
  };
}
