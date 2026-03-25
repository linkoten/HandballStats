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
import { PLAN_LIMITS } from "@/lib/stripe";

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

/**
 * Retourne le statut d'abonnement d'un club (basé sur son ADMIN_CLUB).
 *
 * - isActive          : true si la période payée est encore valide
 * - quota             : baseTokenAllocation de l'admin (-1 = illimité PREMIUM)
 * - selectionPending  : true si l'admin doit choisir manuellement ses compétitions
 * - lockedCompetitionIds : IDs des compétitions non-épinglées (une fois la sélection faite)
 */
export async function getClubSubscriptionStatus(clubId: number): Promise<{
  isActive: boolean;
  subscription: string;
  periodEnd: Date | null;
  quota: number;
  selectionPending: boolean;
  lockedCompetitionIds: number[];
}> {
  const adminMembership = await prisma.userClub.findFirst({
    where: { clubId, user: { role: "ADMIN_CLUB" } },
    include: {
      user: {
        select: {
          subscription: true,
          stripeCurrentPeriodEnd: true,
          tokensRemaining: true,
          baseTokenAllocation: true,
        },
      },
    },
  });

  const empty = {
    isActive: false,
    subscription: "GRATUIT",
    periodEnd: null,
    quota: 0,
    selectionPending: false,
    lockedCompetitionIds: [] as number[],
  };

  if (!adminMembership) return empty;

  const {
    subscription,
    stripeCurrentPeriodEnd,
    tokensRemaining,
    baseTokenAllocation,
  } = adminMembership.user;
  const now = new Date();

  const isActive =
    subscription !== "GRATUIT" ||
    (stripeCurrentPeriodEnd !== null && stripeCurrentPeriodEnd > now);

  // Quota = baseTokenAllocation (plan du souscripteur + bonus achetés à la carte)
  // C'est la source de vérité : ne diminue pas à l'usage, reflète ce que l'utilisateur a payé.
  // fallback sur tokensRemaining pour les comptes existants sans baseTokenAllocation encore peuplé.
  const planKey = subscription as keyof typeof PLAN_LIMITS;
  const planMax = PLAN_LIMITS[planKey]?.maxTokens ?? 0;
  const effectiveAllocation =
    baseTokenAllocation > 0
      ? baseTokenAllocation
      : Math.max(tokensRemaining, planMax);
  const quota = subscription === "PREMIUM" ? -1 : effectiveAllocation;

  const base = {
    isActive,
    subscription,
    periodEnd: stripeCurrentPeriodEnd,
    quota,
  };

  // Abonnement expiré → le mur du layout gère tout
  if (!isActive) {
    return { ...base, selectionPending: false, lockedCompetitionIds: [] };
  }

  // Quota illimité → aucune restriction
  if (quota === -1) {
    return { ...base, selectionPending: false, lockedCompetitionIds: [] };
  }

  const allCompetitions = await prisma.competition.findMany({
    where: { equipe: { clubId } },
    select: { id: true, isPinned: true },
  });

  // Quota couvre tout → aucune restriction
  if (quota >= allCompetitions.length) {
    return { ...base, selectionPending: false, lockedCompetitionIds: [] };
  }

  // quota < total → sélection manuelle requise
  const pinned = allCompetitions.filter((c) => c.isPinned);

  if (pinned.length === 0) {
    // L'admin n'a pas encore configuré sa sélection
    return { ...base, selectionPending: true, lockedCompetitionIds: [] };
  }

  // Sélection effectuée → les non-épinglées sont verrouillées
  const lockedCompetitionIds = allCompetitions
    .filter((c) => !c.isPinned)
    .map((c) => c.id);

  return { ...base, selectionPending: false, lockedCompetitionIds };
}
