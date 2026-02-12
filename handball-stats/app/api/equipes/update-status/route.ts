import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const equipeId = searchParams.get("equipeId");

  if (!equipeId) {
    return NextResponse.json({ error: "equipeId required" }, { status: 400 });
  }

  try {
    // Récupérer les informations de l'équipe et ses compétitions
    const equipe = await prisma.equipes.findUnique({
      where: { id: parseInt(equipeId) },
      include: {
        competitions: {
          include: {
            matchs: {
              include: {
                statistiques_joueur: true,
              },
            },
          },
        },
      },
    });

    if (!equipe) {
      return NextResponse.json(
        { error: "Équipe non trouvée" },
        { status: 404 },
      );
    }

    // Simuler le statut de scraping basé sur l'heure actuelle pour demo
    // En réalité, cela viendrait d'un système de queue/job ou d'un cache Redis
    const now = Date.now();
    const simulatedProgress = ((now % 60000) / 60000) * 100; // Cycle de 1 minute pour plus de rapidité
    const isCompleted = simulatedProgress > 90;
    const isFailed = false; // Simule un échec pour test si nécessaire

    // Étapes simulées du scraping
    const steps = [
      "Initialisation du navigateur Chrome...",
      "Récupération des classements complets",
      "Analyse des compétitions",
      "Récupération des matchs (journée 14)",
      "Récupération des matchs (journée 15)",
      "Récupération des matchs (journée 16)",
      "Traitement des PDF et parsing des stats",
      "Enregistrement en base de données",
      "Finalisation et nettoyage",
    ];

    const currentStepIndex = Math.floor(
      (simulatedProgress / 100) * (steps.length - 1),
    );
    const currentStep = isCompleted
      ? "Scraping terminé !"
      : steps[currentStepIndex] || steps[0];

    // Calculer les statistiques réelles des compétitions
    const competitions = equipe.competitions.map((comp) => {
      const matchs = comp.matchs || [];
      const matchsWithStats = matchs.filter(
        (match) =>
          match.statistiques_joueur && match.statistiques_joueur.length > 0,
      );

      // Simuler le progrès par compétition
      const compProgress = isCompleted
        ? 100
        : Math.min(simulatedProgress + comp.id * 5, 100);
      const compStatus = isCompleted
        ? "COMPLETED"
        : compProgress > 70
          ? "IN_PROGRESS"
          : compProgress > 0
            ? "IN_PROGRESS"
            : "PENDING";

      return {
        id: comp.id,
        nom: comp.nom,
        saison: comp.saison,
        progress: Math.round(compProgress),
        status: compStatus,
        currentStep:
          compStatus === "IN_PROGRESS"
            ? `Traitement match ${Math.min(Math.floor(compProgress / 15), matchs.length)}/${matchs.length} (${comp.nom.substring(0, 30)}...)`
            : compStatus === "COMPLETED"
              ? "Terminé"
              : "En attente",
        matchsTotal: matchs.length,
        matchsProcessed: Math.min(Math.floor(compProgress / 15), matchs.length),
        matchsWithStats: matchsWithStats.length,
        error: null,
      };
    });

    // Calculer les totaux
    const totalMatches = competitions.reduce(
      (sum, comp) => sum + comp.matchsTotal,
      0,
    );
    const processedMatches = competitions.reduce(
      (sum, comp) => sum + comp.matchsProcessed,
      0,
    );
    const matchesWithStats = competitions.reduce(
      (sum, comp) => sum + comp.matchsWithStats,
      0,
    );
    const completedCompetitions = competitions.filter(
      (comp) => comp.status === "COMPLETED",
    ).length;

    const status = {
      globalStatus: isCompleted
        ? "COMPLETED"
        : isFailed
          ? "FAILED"
          : "IN_PROGRESS",
      globalProgress: Math.round(simulatedProgress),
      currentStep: currentStep,
      competitions: competitions,
      summary: {
        totalMatches: totalMatches,
        processedMatches: processedMatches,
        matchesWithStats: matchesWithStats,
        totalCompetitions: competitions.length,
        completedCompetitions: completedCompetitions,
      },
      error: isFailed ? "Erreur lors du téléchargement des PDF" : null,
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Erreur lors du suivi d'équipe:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
