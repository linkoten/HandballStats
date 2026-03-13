import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PLAN_LIMITS, PlanType } from "@/lib/stripe";
import { TokenAction } from "@prisma/client";

/**
 * GET /api/cron/reallocate-tokens
 *
 * Cron job à exécuter chaque août pour réallouer les jetons correspondant
 * aux compétitions de la saison qui vient de se terminer.
 *
 * Exemple : en août 2026, réalloue pour la saison "2025-2026".
 * Les jetons sont cumulatifs : tokens_restants += nombre_compétitions_de_la_saison_précédente.
 *
 * Sécurité : nécessite l'en-tête `Authorization: Bearer CRON_SECRET`.
 *
 * Variables d'environnement requises : CRON_SECRET
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
    },
  });

  let totalProcessed = 0;
  let totalTokensAdded = 0;
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

      // Compter les compétitions de la saison précédente pour lesquelles un token a été utilisé
      const competitionCount = await prisma.competitionAccess.count({
        where: {
          userId: user.id,
          tokenUsed: true,
          competition: {
            saison: season,
          },
        },
      });

      if (competitionCount === 0) {
        // Créer quand même l'entrée d'idempotence pour ne pas retraiter
        await prisma.tokenUsageHistory.create({
          data: {
            userId: user.id,
            action: TokenAction.SUBSCRIPTION,
            amount: 0,
            reason: `REALLOCATE-${season}`,
          },
        });
        continue;
      }

      // Vérifier que le plan n'est pas PREMIUM (tokens illimités)
      const planLimits = PLAN_LIMITS[user.subscription as PlanType];
      if (planLimits?.maxTokens === -1) {
        // PREMIUM : pas besoin de réallouer, mais on logue quand même
        await prisma.tokenUsageHistory.create({
          data: {
            userId: user.id,
            action: TokenAction.SUBSCRIPTION,
            amount: 0,
            reason: `REALLOCATE-${season} (PREMIUM - tokens illimités)`,
          },
        });
        continue;
      }

      // Ajouter les tokens de façon cumulative
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            tokensRemaining: {
              increment: competitionCount,
            },
          },
        });

        await tx.tokenUsageHistory.create({
          data: {
            userId: user.id,
            action: TokenAction.SUBSCRIPTION,
            amount: competitionCount,
            reason: `REALLOCATE-${season}`,
          },
        });
      });

      totalProcessed++;
      totalTokensAdded += competitionCount;
    } catch (err) {
      console.error(`[CRON] Erreur pour user ${user.id}:`, err);
      errors.push(user.id);
    }
  }

  console.log(
    `[CRON] Réallocation terminée : ${totalProcessed} users traités, ${totalTokensAdded} tokens ajoutés, ${skipped.length} ignorés (déjà traités), ${errors.length} erreurs`,
  );

  return NextResponse.json({
    success: true,
    season,
    totalProcessed,
    totalTokensAdded,
    skipped: skipped.length,
    errors: errors.length,
  });
}
