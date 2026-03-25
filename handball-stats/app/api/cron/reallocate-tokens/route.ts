import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PLAN_LIMITS, PlanType } from "@/lib/stripe";
import { TokenAction } from "@prisma/client";

/**
 * GET /api/cron/reallocate-tokens
 *
 * Cron job à exécuter chaque août pour réinitialiser les jetons de chaque utilisateur actif.
 *
 * Logique :
 *   tokensRemaining = baseTokenAllocation  (plan souscrit + bonus achetés à la carte)
 *
 * Les compétitions de la saison terminée (ex: 2025-2026) restent épinglées et accessibles
 * sans consommer de tokens. L'utilisateur peut ensuite choisir jusqu'à baseTokenAllocation
 * nouvelles compétitions pour la saison entrante, en plus des anciennes déjà épinglées.
 *
 * Exemple :
 *   PRO (10) + 1 token acheté = baseTokenAllocation=11
 *   Après reset en août : tokensRemaining=11
 *   Les 3 compétitions 2025/2026 restent épinglées, l'admin peut sélectionner 11 nouvelles.
 *
 * Sécurité : nécessite l'en-tête `Authorization: Bearer CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  // ── Protection par secret ──────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[CRON] CRON_SECRET non configuré");
    return NextResponse.json(
      { error: "Configuration manquante" },
      { status: 500 },
    );
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // ── Calcul de la saison à réallouer ───────────────────────────────────────
  // En août 2026 → saison "2025-2026"
  const now = new Date();
  const year = now.getFullYear();
  const season = `${year - 1}-${year}`;

  console.log(`[CRON] Démarrage réallocation pour la saison ${season}`);

  // ── Récupérer tous les utilisateurs avec un abonnement actif ─────────────
  const users = await prisma.user.findMany({
    where: {
      subscription: {
        not: "GRATUIT",
      },
    },
    select: {
      id: true,
      subscription: true,
      tokensRemaining: true,
      baseTokenAllocation: true,
    },
  });

  let totalProcessed = 0;
  let totalTokensReset = 0;
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const user of users) {
    try {
      // Idempotence : vérifier si la réallocation a déjà été faite pour ce user/saison
      const alreadyDone = await prisma.tokenUsageHistory.findFirst({
        where: {
          userId: user.id,
          action: TokenAction.SUBSCRIPTION,
          reason: `REALLOCATE-${season}`,
        },
      });

      if (alreadyDone) {
        skipped.push(user.id);
        continue;
      }

      // PREMIUM : tokens illimités, rien à faire
      const planLimits = PLAN_LIMITS[user.subscription as PlanType];
      if (planLimits?.maxTokens === -1) {
        await prisma.tokenUsageHistory.create({
          data: {
            userId: user.id,
            action: TokenAction.SUBSCRIPTION,
            amount: 0,
            reason: `REALLOCATE-${season} (PREMIUM - tokens illimités)`,
          },
        });
        skipped.push(user.id);
        continue;
      }

      // Allocation cible = baseTokenAllocation (plan + bonus achetés)
      // Fallback sur planMax pour les comptes antérieurs à la migration
      const planMax = planLimits?.maxTokens ?? 0;
      const targetAllocation =
        user.baseTokenAllocation > 0 ? user.baseTokenAllocation : planMax;

      if (targetAllocation === 0) {
        await prisma.tokenUsageHistory.create({
          data: {
            userId: user.id,
            action: TokenAction.SUBSCRIPTION,
            amount: 0,
            reason: `REALLOCATE-${season} (allocation 0, rien à faire)`,
          },
        });
        continue;
      }

      // Reset tokensRemaining = baseTokenAllocation
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            tokensRemaining: targetAllocation,
            // baseTokenAllocation reste inchangé (c'est la source de vérité permanente)
          },
        });

        await tx.tokenUsageHistory.create({
          data: {
            userId: user.id,
            action: TokenAction.SUBSCRIPTION,
            amount: targetAllocation,
            reason: `REALLOCATE-${season} (reset ${user.tokensRemaining} → ${targetAllocation})`,
          },
        });
      });

      // Les compétitions de la saison écoulée (isPinned=true) restent épinglées :
      // elles demeurent accessibles gratuitement, l'admin peut sélectionner
      // targetAllocation nouvelles compétitions pour la saison entrante.

      totalProcessed++;
      totalTokensReset += targetAllocation;
    } catch (err) {
      console.error(`[CRON] Erreur pour user ${user.id}:`, err);
      errors.push(user.id);
    }
  }

  console.log(
    `[CRON] Réallocation terminée : ${totalProcessed} users traités, ${totalTokensReset} tokens réinitialisés, ${skipped.length} ignorés, ${errors.length} erreurs`,
  );

  return NextResponse.json({
    success: true,
    season,
    totalProcessed,
    totalTokensReset,
    skipped: skipped.length,
    errors: errors.length,
  });
}
