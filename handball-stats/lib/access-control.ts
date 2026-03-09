/**
 * Vérifie le rôle et l'accès club/équipe pour un utilisateur
 * Usage : await checkUserClubRole({ userId, clubId, equipeId })
 * Retourne : { isAdmin, isCoach, isJoueur, isGeneralAdmin, hasAccess }
 */
export async function checkUserClubRole({
  userId,
  clubId,
  equipeId,
}: {
  userId?: string;
  clubId?: number;
  equipeId?: number;
}) {
  // Récupérer l'utilisateur
  let clerkId: string | undefined = userId ?? undefined;
  if (!clerkId) {
    const authData = await auth();
    clerkId = authData.userId ?? undefined;
  }
  if (!clerkId)
    return {
      isAdmin: false,
      isCoach: false,
      isJoueur: false,
      isGeneralAdmin: false,
      hasAccess: false,
    };

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      clubs: {
        include: {
          club: true,
        },
      },
    },
  });
  if (!user)
    return {
      isAdmin: false,
      isCoach: false,
      isJoueur: false,
      isGeneralAdmin: false,
      hasAccess: false,
    };

  // ADMIN_GENERAL : admin partout
  if (user.role === "ADMIN_GENERAL") {
    return {
      isAdmin: true,
      isCoach: true,
      isJoueur: true,
      isGeneralAdmin: true,
      hasAccess: true,
    };
  }

  // ADMIN_CLUB : admin uniquement sur son club principal
  let clubAccess = false;
  let isAdmin = false;
  let isCoach = false;
  let isJoueur = false;
  if (clubId) {
    const userClub = user.clubs.find((uc) => uc.clubId === clubId);
    if (userClub) {
      clubAccess = true;
      // ADMIN_CLUB = admin uniquement sur son club principal
      isAdmin = user.role === "ADMIN_CLUB" && userClub.isPrincipal;
      isCoach = user.role === "ENTRAINEUR";
      isJoueur = user.role === "JOUEUR";
    }
  }
  // Vérifier équipe
  let equipeAccess = false;
  if (equipeId) {
    const equipe = await prisma.equipes.findUnique({
      where: { id: equipeId },
      include: { club: true },
    });
    if (
      equipe &&
      equipe.club &&
      user.clubs.some((uc) => uc.clubId === equipe.club!.id)
    ) {
      equipeAccess = true;
    }
  }
  const hasAccess = clubAccess || equipeAccess;
  return { isAdmin, isCoach, isJoueur, isGeneralAdmin: false, hasAccess };
}
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
      user.competitionAccess.map((access) => access.competition.equipeId),
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
