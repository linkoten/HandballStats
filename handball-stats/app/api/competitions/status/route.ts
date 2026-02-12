import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { competitionIds }: { competitionIds: number[] } =
      await request.json();

    if (!competitionIds || competitionIds.length === 0) {
      return NextResponse.json(
        { error: "Aucun ID de compétition fourni" },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Récupérer les compétitions avec leurs statuts et leurs matchs
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
            club: {
              select: {
                nom: true,
              },
            },
          },
        },
        _count: {
          select: {
            matchs: true,
          },
        },
      },
    });

    // Calculer des statistiques pour chaque compétition
    const competitionsWithStats = await Promise.all(
      competitions.map(async (comp) => {
        // Compter les matchs avec stats complètes
        const matchsWithStats = await prisma.matchs.count({
          where: {
            competitionId: comp.id,
            statistiques_joueur: {
              some: {},
            },
          },
        });

        return {
          id: comp.id,
          nom: comp.nom,
          saison: comp.saison,
          phase: comp.phase,
          equipe: {
            nom: comp.equipe.nom,
            club: comp.equipe.club?.nom ?? "Club non défini",
          },
          scrapingStatus: comp.scrapingStatus,
          scrapingProgress: comp.scrapingProgress,
          scrapingStep: comp.scrapingStep,
          scrapingError: comp.scrapingError,
          lastScrapedAt: comp.lastScrapedAt,
          matchsCount: comp._count.matchs,
          matchsWithStatsCount: matchsWithStats,
        };
      })
    );

    // Calculer le statut global
    const allCompleted = competitions.every(
      (c) => c.scrapingStatus === "COMPLETED"
    );
    const anyFailed = competitions.some((c) => c.scrapingStatus === "FAILED");
    const anyInProgress = competitions.some(
      (c) => c.scrapingStatus === "IN_PROGRESS"
    );

    let globalStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
    if (allCompleted) {
      globalStatus = "COMPLETED";
    } else if (anyFailed) {
      globalStatus = "FAILED";
    } else if (anyInProgress) {
      globalStatus = "IN_PROGRESS";
    } else {
      globalStatus = "PENDING";
    }

    return NextResponse.json({
      globalStatus,
      competitions: competitionsWithStats,
      summary: {
        total: competitions.length,
        completed: competitions.filter((c) => c.scrapingStatus === "COMPLETED")
          .length,
        inProgress: competitions.filter(
          (c) => c.scrapingStatus === "IN_PROGRESS"
        ).length,
        pending: competitions.filter((c) => c.scrapingStatus === "PENDING")
          .length,
        failed: competitions.filter((c) => c.scrapingStatus === "FAILED")
          .length,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du statut:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
