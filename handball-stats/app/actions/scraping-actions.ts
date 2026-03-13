"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ScrapingStatusResponse = {
  success: boolean;
  data?: CompetitionStatus[];
  error?: string;
};

export type CompetitionStatus = {
  id: number;
  nom: string;
  saison: string;
  scrapingStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  scrapingProgress: number;
  scrapingStep: string | null;
  scrapingError: string | null;
  lastScrapedAt: string | null;
  equipe: {
    nom: string;
    club: { nom: string } | null;
  } | null;
  tokenConsumed: boolean; // Si le token a déjà été consommé pour cette compétition
};

/**
 * Récupère le statut de scraping pour une liste de compétitions IDs
 */
export async function getScrapingStatus(
  competitionIds: number[],
): Promise<ScrapingStatusResponse> {
  try {
    if (!Array.isArray(competitionIds) || competitionIds.length === 0) {
      return { success: false, error: "IDs invalides ou aucun ID fourni" };
    }
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Non authentifié" };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    const competitions = await prisma.competition.findMany({
      where: {
        id: { in: competitionIds },
        // Sécurité : vérifier que l'utilisateur a accès
        competitionAccess: {
          some: { userId: user.id },
        },
      },
      select: {
        id: true,
        nom: true,
        saison: true,
        scrapingStatus: true,
        scrapingProgress: true,
        scrapingStep: true,
        scrapingError: true,
        lastScrapedAt: true,
        equipe: {
          select: {
            nom: true,
            club: { select: { nom: true } },
          },
        },
        competitionAccess: {
          where: { userId: user.id },
          select: { tokenUsed: true },
        },
      },
    });

    const result: CompetitionStatus[] = competitions.map((c) => ({
      id: c.id,
      nom: c.nom,
      saison: c.saison,
      scrapingStatus: c.scrapingStatus as CompetitionStatus["scrapingStatus"],
      scrapingProgress: c.scrapingProgress,
      scrapingStep: c.scrapingStep,
      scrapingError: c.scrapingError,
      lastScrapedAt: c.lastScrapedAt?.toISOString() ?? null,
      equipe: c.equipe
        ? {
            nom: c.equipe.nom,
            club: c.equipe.club ?? null,
          }
        : null,
      tokenConsumed: c.competitionAccess[0]?.tokenUsed ?? false,
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur getScrapingStatus:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Consomme un token quand le scraping d'une compétition est COMPLETED (succès).
 * Idempotent : ne consomme pas si tokenUsed est déjà true.
 */
export async function consumeTokenOnSuccess(
  competitionId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Non authentifié" };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, tokensRemaining: true },
    });

    if (!user) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    // Vérifier l'accès et si le token n'a pas déjà été consommé
    const access = await prisma.competitionAccess.findUnique({
      where: {
        userId_competitionId: {
          userId: user.id,
          competitionId,
        },
      },
    });

    if (!access) {
      return { success: false, error: "Accès introuvable" };
    }

    // Idempotence : déjà consommé
    if (access.tokenUsed) {
      return { success: true };
    }

    // Vérifier que la compétition est bien COMPLETED
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: {
        scrapingStatus: true,
        nom: true,
        phase: true,
        equipeId: true,
        saison: true,
      },
    });

    if (!competition || competition.scrapingStatus !== "COMPLETED") {
      return {
        success: false,
        error: "La compétition n'est pas encore complétée",
      };
    }

    // Phase-group deduplication: if this competition has a non-empty phase and
    // another competition in the same (equipe, saison) group already consumed a
    // token for this user, mark this one as used without deducting a new token.
    if (competition.phase && competition.phase.trim() !== "") {
      const siblingWithToken = await prisma.competitionAccess.findFirst({
        where: {
          userId: user.id,
          tokenUsed: true,
          competitionId: { not: competitionId },
          competition: {
            equipeId: competition.equipeId,
            saison: competition.saison,
            AND: [{ phase: { not: null } }, { phase: { not: "" } }],
          },
        },
      });

      if (siblingWithToken) {
        await prisma.$transaction(async (tx) => {
          await tx.competitionAccess.update({
            where: {
              userId_competitionId: { userId: user.id, competitionId },
            },
            data: { tokenUsed: true },
          });
          await tx.tokenUsageHistory.create({
            data: {
              userId: user.id,
              competitionId,
              action: "SCRAPE",
              amount: 0,
              reason: `Scraping complété (phase mutualisée) : ${competition.nom}`,
            },
          });
        });
        revalidatePath("/competitions");
        revalidatePath("/dashboard");
        return { success: true };
      }
    }

    if (user.tokensRemaining <= 0) {
      return { success: false, error: "Tokens insuffisants" };
    }

    // Transaction : consommer le token + marquer l'accès
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          tokensRemaining: { decrement: 1 },
          tokensUsed: { increment: 1 },
        },
      });

      await tx.competitionAccess.update({
        where: {
          userId_competitionId: { userId: user.id, competitionId },
        },
        data: { tokenUsed: true },
      });

      await tx.tokenUsageHistory.create({
        data: {
          userId: user.id,
          competitionId,
          action: "SCRAPE",
          amount: -1,
          reason: `Scraping complété : ${competition.nom}`,
        },
      });
    });

    revalidatePath("/competitions");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Erreur consumeTokenOnSuccess:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Rescraprer une ou plusieurs compétitions existantes
 * Met à jour les données avec les nouveaux matchs et statistiques
 */
export async function rescrapeCompetition(
  competitionIds: number[],
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Non authentifié" };
    }

    if (!Array.isArray(competitionIds) || competitionIds.length === 0) {
      return { success: false, error: "Au moins une compétition requise" };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    // Récupérer toutes les compétitions à rescraprer
    const competitions = await prisma.competition.findMany({
      where: {
        id: { in: competitionIds },
        competitionAccess: {
          some: { userId: user.id },
        },
      },
      include: {
        equipe: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
    });

    if (competitions.length === 0) {
      return {
        success: false,
        error: "Aucune compétition trouvée ou accès non autorisé",
      };
    }

    // Construire la configuration pour le scraper
    const config = competitions.map((comp) => ({
      competitionId: comp.id,
      equipeId: comp.equipeId,
      url: comp.baseUrl,
      equipe: comp.equipeFFHB || comp.equipe?.nom || "Inconnue",
      equipe_bdd: comp.equipe?.nom || "Inconnue",
      competition_name: comp.nom,
      poule: comp.poule || "",
      max_journees: comp.max_journees || 18,
      saison: comp.saison,
      phase: comp.phase || "Poule",
    }));

    // Mettre à jour le statut des compétitions à IN_PROGRESS
    await prisma.competition.updateMany({
      where: { id: { in: competitionIds } },
      data: {
        scrapingStatus: "IN_PROGRESS",
        scrapingProgress: 0,
        scrapingStep: "Récupération des données...",
      },
    });

    // Appel à l'API Render pour rescraprer
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      if (!apiUrl) {
        throw new Error("NEXT_PUBLIC_API_URL non défini");
      }

      const response = await fetch(
        `${apiUrl.replace(/\/$/, "")}/scrape/batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            competitions: config,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur API scraping:", errorText);

        // Marquer les compétitions comme échouées
        await prisma.competition.updateMany({
          where: { id: { in: competitionIds } },
          data: {
            scrapingStatus: "FAILED",
            scrapingStep: `Erreur API: ${errorText}`,
          },
        });

        return {
          success: false,
          error: `Erreur lors de l'appel au scraper: ${errorText}`,
        };
      }
    } catch (err) {
      console.error("Erreur lors de l'appel à l'API Render:", err);

      // Marquer les compétitions comme échouées
      await prisma.competition.updateMany({
        where: { id: { in: competitionIds } },
        data: {
          scrapingStatus: "FAILED",
          scrapingStep: `Erreur: ${err instanceof Error ? err.message : "Erreur inconnue"}`,
        },
      });

      return {
        success: false,
        error: err instanceof Error ? err.message : "Erreur lors du scraping",
      };
    }

    revalidatePath("/competitions");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        competitionIds,
        message: `${competitions.length} compétition(s) en cours de mise à jour`,
      },
    };
  } catch (error) {
    console.error("Erreur rescrapeCompetition:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Rescrapre toutes les compétitions d'un club pour une saison donnée.
 * Réservé aux admins (ADMIN_CLUB / ADMIN_GENERAL).
 */
export async function rescrapeClubCurrentSaison(
  clubId: number,
  saison: string = "2025-2026",
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Non authentifié" };

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true },
    });

    if (
      !user ||
      (user.role !== "ADMIN_CLUB" && user.role !== "ADMIN_GENERAL")
    ) {
      return { success: false, error: "Accès refusé : rôle admin requis" };
    }

    const competitions = await prisma.competition.findMany({
      where: { saison, equipe: { clubId } },
      include: { equipe: { select: { id: true, nom: true } } },
    });

    if (competitions.length === 0) {
      return {
        success: false,
        error: `Aucune compétition ${saison} trouvée pour ce club`,
      };
    }

    const config = competitions.map((comp) => ({
      competitionId: comp.id,
      equipeId: comp.equipeId,
      url: comp.baseUrl,
      equipe: comp.equipeFFHB || comp.equipe?.nom || "Inconnue",
      equipe_bdd: comp.equipe?.nom || "Inconnue",
      competition_name: comp.nom,
      poule: comp.poule || "",
      max_journees: comp.max_journees || 18,
      saison: comp.saison,
      phase: comp.phase || "Poule",
    }));

    await prisma.competition.updateMany({
      where: { id: { in: competitions.map((c) => c.id) } },
      data: {
        scrapingStatus: "IN_PROGRESS",
        scrapingProgress: 0,
        scrapingStep: "Récupération des données...",
      },
    });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL non défini");

    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/scrape/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitions: config }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await prisma.competition.updateMany({
        where: { id: { in: competitions.map((c) => c.id) } },
        data: {
          scrapingStatus: "FAILED",
          scrapingStep: `Erreur API: ${errorText}`,
        },
      });
      return { success: false, error: `Erreur scraper: ${errorText}` };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/clubs/${clubId}/competitions`);

    return {
      success: true,
      data: {
        count: competitions.length,
        message: `${competitions.length} compétition(s) ${saison} en cours de mise à jour`,
      },
    };
  } catch (error) {
    console.error("Erreur rescrapeClubCurrentSaison:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
