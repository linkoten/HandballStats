import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { competitionIds, equipeId } = await req.json();

    // Au lieu d'exécuter le scraping directement, déclencher un webhook externe
    const webhookUrl = process.env.SCRAPING_WEBHOOK_URL;
    
    if (webhookUrl) {
      // Déclencher le scraping sur un service externe (Render gratuit)
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionIds,
          equipeId,
          callbackUrl: `${process.env.VERCEL_URL}/api/scraping/callback`
        })
      }).catch(console.error);
    } else {
      // Mode simulation pour développement
      console.log("Mode simulation - pas de webhook configuré");
    }

    // Marquer les compétitions comme "en cours"
    if (competitionIds) {
      await prisma.competition.updateMany({
        where: { id: { in: competitionIds } },
        data: { 
          scrapingStatus: "IN_PROGRESS",
          scrapingProgress: 0 
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Scraping démarré en arrière-plan" 
    });

  } catch (error) {
    console.error("Erreur scraping:", error);
    return NextResponse.json(
      { error: "Erreur interne" }, 
      { status: 500 }
    );
  }
}