"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

// =============================================
// Activer le plan FREE_TRIAL avec un code
// =============================================
export async function redeemFreeTrialCode(
  code: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { freePlanCode: true },
    });
    if (!user) throw new Error("Utilisateur introuvable");

    // Vérifier que l'utilisateur n'a pas déjà utilisé un Free Trial
    if (user.freeTrialStartedAt || user.freePlanCode) {
      return { success: false, error: "Vous avez déjà activé un Free Trial." };
    }
    // Vérifier que l'utilisateur est bien sur le plan GRATUIT
    if (user.subscription !== "GRATUIT") {
      return {
        success: false,
        error: "Vous avez déjà un abonnement actif.",
      };
    }

    // Sanitize le code (trim + uppercase)
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      return { success: false, error: "Code invalide." };
    }

    // Rechercher le code
    const planCode = await prisma.freePlanCode.findUnique({
      where: { code: cleanCode },
    });

    if (!planCode) {
      return { success: false, error: "Code introuvable ou invalide." };
    }
    if (planCode.isUsed) {
      return { success: false, error: "Ce code a déjà été utilisé." };
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Atomique : marquer le code + mettre à jour l'utilisateur
    await prisma.$transaction([
      prisma.freePlanCode.update({
        where: { id: planCode.id },
        data: { isUsed: true, usedById: user.id, usedAt: now },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          subscription: "FREE_TRIAL",
          freeTrialStartedAt: now,
          freeTrialExpiresAt: expiresAt,
        },
      }),
    ]);

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Erreur activation free trial:", error);
    return { success: false, error: "Une erreur est survenue." };
  }
}

// =============================================
// Récupérer le statut du Free Trial
// =============================================
export async function getFreeTrialStatus(): Promise<{
  isFreeTrial: boolean;
  daysRemaining: number;
  expiresAt: Date | null;
  startedAt: Date | null;
}> {
  try {
    const { userId } = await auth();
    if (!userId)
      return {
        isFreeTrial: false,
        daysRemaining: 0,
        expiresAt: null,
        startedAt: null,
      };

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || user.subscription !== "FREE_TRIAL") {
      return {
        isFreeTrial: false,
        daysRemaining: 0,
        expiresAt: null,
        startedAt: null,
      };
    }

    const now = new Date();
    const expiresAt = user.freeTrialExpiresAt;
    const daysRemaining = expiresAt
      ? Math.max(
          0,
          Math.ceil(
            (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    return {
      isFreeTrial: true,
      daysRemaining,
      expiresAt,
      startedAt: user.freeTrialStartedAt,
    };
  } catch {
    return {
      isFreeTrial: false,
      daysRemaining: 0,
      expiresAt: null,
      startedAt: null,
    };
  }
}

// =============================================
// Générer des codes Free Trial (admin uniquement)
// =============================================
export async function generateFreePlanCodes(
  count: number,
): Promise<{ success: boolean; codes?: string[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Non authentifié");

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || user.role !== "ADMIN_GENERAL") {
      return { success: false, error: "Accès refusé." };
    }

    const n = Math.min(Math.max(1, count), 500);
    const codes: string[] = [];

    for (let i = 0; i < n; i++) {
      // Génère un code 12 chars alphanumérique
      const raw = nanoid(12).toUpperCase().replace(/[^A-Z0-9]/g, "X");
      codes.push(raw);
    }

    await prisma.freePlanCode.createMany({
      data: codes.map((code) => ({ code })),
      skipDuplicates: true,
    });

    return { success: true, codes };
  } catch (error) {
    console.error("Erreur génération codes:", error);
    return { success: false, error: "Erreur lors de la génération des codes." };
  }
}
