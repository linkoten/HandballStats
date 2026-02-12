import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Vérifier si on demande les logs d'une compétition spécifique
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get("id");

    if (competitionId) {
      // Retourner les logs de cette compétition
      const backendPath = path.join(process.cwd(), "..", "backend");
      const logPath = path.join(
        backendPath,
        "logs",
        `scraper_${competitionId}.log`
      );

      if (fs.existsSync(logPath)) {
        const logContent = fs.readFileSync(logPath, "utf-8");
        // Prendre seulement les dernières 500 lignes pour éviter de surcharger
        const lines = logContent.split("\n");
        const lastLines = lines.slice(-500).join("\n");

        return NextResponse.json({
          logs: lastLines,
          fullPath: logPath,
          exists: true,
        });
      } else {
        return NextResponse.json({
          logs: "Aucun log disponible (le scraping n'a peut-être pas encore démarré)",
          fullPath: logPath,
          exists: false,
        });
      }
    }

    // Récupérer toutes les compétitions de l'utilisateur avec leurs détails
    const competitions = await prisma.competition.findMany({
      where: {
        competitionAccess: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        equipe: {
          include: {
            club: true,
          },
        },
        _count: {
          select: {
            matchs: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      competitions: competitions.map((comp) => ({
        id: comp.id,
        nom: comp.nom,
        saison: comp.saison,
        phase: comp.phase,
        equipe: comp.equipe.nom,
        club: comp.equipe.club?.nom ?? "Club non défini",
        scrapingStatus: comp.scrapingStatus,
        scrapingError: comp.scrapingError,
        lastScrapedAt: comp.lastScrapedAt,
        matchsCount: comp._count.matchs,
        createdAt: comp.createdAt,
      })),
    });
  } catch (error) {
    console.error("Erreur debug competitions:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
