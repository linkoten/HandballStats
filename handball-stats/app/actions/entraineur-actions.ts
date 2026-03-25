"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PLAN_LIMITS, PlanType } from "@/lib/stripe";

export type EntraineurResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

/** Vérifie que l'utilisateur connecté est ADMIN_CLUB ou ADMIN_GENERAL sur ce club. */
async function requireAdmin(clubId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Non authentifié");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });
  if (!user) throw new Error("Utilisateur introuvable");
  if (!["ADMIN_CLUB", "ADMIN_GENERAL"].includes(user.role))
    throw new Error("Accès refusé – rôle admin requis");

  const membership = await prisma.userClub.findFirst({
    where: { userId: user.id, clubId },
  });
  if (!membership && user.role !== "ADMIN_GENERAL")
    throw new Error("Vous n'êtes pas membre de ce club");

  return user;
}

// ──────────────────────────────────────────────
// LECTURE
// ──────────────────────────────────────────────

/**
 * Retourne tous les membres du club avec les rôles ADMIN_CLUB ou ENTRAINEUR.
 * Inclut également les informations de plan du premier ADMIN_CLUB trouvé.
 */
export async function getClubEntraineurs(
  clubId: number,
): Promise<EntraineurResponse> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    const currentUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    if (!currentUser) throw new Error("Utilisateur introuvable");

    // On autorise les ADMIN_CLUB, ADMIN_GENERAL, ENTRAINEUR et JOUEUR à consulter
    if (
      !["ADMIN_CLUB", "ADMIN_GENERAL", "ENTRAINEUR", "JOUEUR"].includes(currentUser.role)
    ) {
      throw new Error("Accès refusé");
    }

    // Membres coach ou admin du club
    const members = await prisma.userClub.findMany({
      where: {
        clubId,
        user: {
          role: { in: ["ADMIN_CLUB", "ENTRAINEUR"] as any[] },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            subscription: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ user: { role: "asc" } }, { user: { firstName: "asc" } }],
    });

    // Plan du club (premier ADMIN_CLUB)
    const adminMember = members.find((m) => m.user.role === "ADMIN_CLUB");
    const planKey: PlanType =
      (adminMember?.user?.subscription as PlanType) ?? "GRATUIT";
    const planLimits = PLAN_LIMITS[planKey];

    return {
      success: true,
      data: {
        members: members.map((m) => m.user),
        total: members.length,
        maxEntraineurs: planLimits.maxEntraineurs,
        planKey,
      },
    };
  } catch (error) {
    console.error("Erreur getClubEntraineurs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

// ──────────────────────────────────────────────
// GESTION DES RÔLES
// ──────────────────────────────────────────────

/**
 * Rétrograde un entraîneur en UTILISATEUR (il reste membre du club).
 */
export async function removeEntraineurRole(
  targetUserId: string,
  clubId: number,
): Promise<EntraineurResponse> {
  try {
    const adminUser = await requireAdmin(clubId);

    // Ne pas se rétrograder soi-même
    if (adminUser.id === targetUserId) {
      throw new Error("Vous ne pouvez pas modifier votre propre rôle ici");
    }

    // Vérifier que la cible est bien membre de ce club
    const targetMembership = await prisma.userClub.findFirst({
      where: { userId: targetUserId, clubId },
    });
    if (!targetMembership) {
      throw new Error("Cet utilisateur n'est pas membre de ce club");
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) throw new Error("Utilisateur cible introuvable");

    // Autoriser uniquement la suppression des ENTRAINEUR (pas d'un autre ADMIN_CLUB
    // sauf si on est ADMIN_GENERAL)
    if (
      targetUser.role === "ADMIN_CLUB" &&
      adminUser.role !== "ADMIN_GENERAL"
    ) {
      throw new Error(
        "Seul un ADMIN_GÉNÉRAL peut rétrograder un autre ADMIN_CLUB",
      );
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: "UTILISATEUR" },
    });

    revalidatePath(`/dashboard/clubs/${clubId}/entraineurs`);

    return {
      success: true,
      data: { message: `L'entraîneur est maintenant UTILISATEUR` },
    };
  } catch (error) {
    console.error("Erreur removeEntraineurRole:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Promeut un membre du club au rôle ADMIN_CLUB.
 * L'admin actuel CONSERVE son rôle (délégation, pas transfert).
 */
export async function promoteToAdmin(
  targetUserId: string,
  clubId: number,
): Promise<EntraineurResponse> {
  try {
    const adminUser = await requireAdmin(clubId);

    if (adminUser.id === targetUserId) {
      throw new Error("Vous êtes déjà administrateur");
    }

    // Vérifier que la cible est bien membre de ce club
    const targetMembership = await prisma.userClub.findFirst({
      where: { userId: targetUserId, clubId },
    });
    if (!targetMembership) {
      throw new Error("Cet utilisateur n'est pas membre de ce club");
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: "ADMIN_CLUB" },
    });

    revalidatePath(`/dashboard/clubs/${clubId}/entraineurs`);

    return {
      success: true,
      data: { message: `L'utilisateur a été promu ADMIN_CLUB` },
    };
  } catch (error) {
    console.error("Erreur promoteToAdmin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

// ──────────────────────────────────────────────
// VÉRIFICATION DE QUOTAS (utile avant un downgrade)
// ──────────────────────────────────────────────

/**
 * Vérifie si le club respecte les quotas du plan cible.
 * Retourne les excédents pour informer l'utilisateur.
 */
export async function checkDowngradeQuotas(
  clubId: number,
  targetPlan: PlanType,
): Promise<EntraineurResponse> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    const limits = PLAN_LIMITS[targetPlan];

    // Compter les entraîneurs actuels
    const coachCount = await prisma.userClub.count({
      where: {
        clubId,
        user: {
          role: { in: ["ADMIN_CLUB", "ENTRAINEUR"] as any[] },
        },
      },
    });

    // Pas de limite sur les compétitions : seuls les tokens sont limités.
    // L'utilisateur garde toutes ses compétitions déjà scrapées.
    const excessEntraineurs =
      limits.maxEntraineurs === -1
        ? 0
        : Math.max(0, coachCount - limits.maxEntraineurs);

    return {
      success: true,
      data: {
        coachCount,
        excessEntraineurs,
        canDowngrade: excessEntraineurs === 0,
        limits,
      },
    };
  } catch (error) {
    console.error("Erreur checkDowngradeQuotas:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
