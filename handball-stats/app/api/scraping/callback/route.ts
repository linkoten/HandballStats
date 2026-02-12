import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { competitionId, status, progress, matches, error } = await req.json();

    // Vérifier une clé d'authentification simple  
    const authKey = req.headers.get("x-webhook-auth");
    if (authKey !== process.env.WEBHOOK_AUTH_SECRET) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Mettre à jour le statut de la compétition
    if (competitionId) {
      await prisma.competition.update({
        where: { id: competitionId },
        data: {
          scrapingStatus: status,
          scrapingProgress: progress,
          scrapingError: error || null,
          lastScrapedAt: status === "COMPLETED" ? new Date() : undefined
        }
      });
    }

    // Si des matchs sont fournis, les insérer/mettre à jour
    if (matches && status === "COMPLETED") {
      for (const matchData of matches) {
        // Logique d'insertion des matchs et stats
        // (à adapter selon votre structure de données)
        try {
          await prisma.matchs.upsert({
            where: { match_url: matchData.match_url },
            create: {
              match_url: matchData.match_url,
              pdf_url: matchData.pdf_url,
              competition_name: matchData.competition_name,
              competitionId: competitionId,
              score_final: matchData.score_final,
              date_match: matchData.date_match ? new Date(matchData.date_match) : null,
              // ... autres champs
            },
            update: {
              pdf_url: matchData.pdf_url,
              score_final: matchData.score_final,
              date_match: matchData.date_match ? new Date(matchData.date_match) : null,
              // ... autres champs  
            }
          });
        } catch (matchError) {
          console.error("Erreur insertion match:", matchData.match_url, matchError);
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur callback scraping:", error);
    return NextResponse.json(
      { error: "Erreur interne" }, 
      { status: 500 }
    );
  }
}