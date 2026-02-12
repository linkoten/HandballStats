import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { equipeId, competitions } = body;

  try {
    // Filtrer uniquement les compétitions de la saison 2025/2026
    const filteredCompetitions = competitions.filter(
      (c: any) => c.saison === "2025/2026",
    );

    // Récupérer dynamiquement les paramètres depuis la BDD
    const enrichedCompetitions = [];
    for (const c of filteredCompetitions) {
      const comp = await prisma.competition.findUnique({
        where: { id: c.id },
        include: { equipe: true },
      });
      if (!comp) {
        console.warn("Compétition introuvable en BDD:", c.id);
        continue;
      }
      enrichedCompetitions.push({
        id: comp.id,
        equipeId: comp.equipeId,
        nom: comp.nom,
        saison: comp.saison,
        equipeFFHB: comp.equipeFFHB,
        equipe_bdd: comp.equipe?.nom
      });
    }

    // Marquer les compétitions comme en cours
    const competitionIds = enrichedCompetitions.map(c => c.id);
    await prisma.competition.updateMany({
      where: { id: { in: competitionIds } },
      data: { 
        scrapingStatus: "IN_PROGRESS",
        scrapingProgress: 0 
      }
    });

    // Déclencher le scraping externe via webhook
    const webhookUrl = process.env.SCRAPING_WEBHOOK_URL;
    
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionIds,
          equipeId,
          callbackUrl: `${process.env.VERCEL_URL}/api/scraping/callback`
        })
      }).catch(console.error);
    }

    await prisma.$disconnect();

    return NextResponse.json({ 
      success: true, 
      message: "Mise à jour démarrée",
      competitions: enrichedCompetitions.length
    });

  } catch (error) {
    await prisma.$disconnect();
    console.error("Erreur update équipe:", error);
    return NextResponse.json(
      { error: "Erreur interne" }, 
      { status: 500 }
    );
  }
}
  const scriptPath = path.join("..", "backend", "scraper", "main.py");
  const args = [
    scriptPath,
    "--mode",
    "incremental",
    "--competition-id",
    String(enrichedCompetitions[0]?.competitionId),
    "--config",
    JSON.stringify(enrichedCompetitions),
  ];

  console.log("Lancement scrapper:", args);

  return new Promise((resolve) => {
    const py = spawn("python", args);
    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    py.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    py.on("close", (code) => {
      console.log("stdout:", stdout);
      if (stderr) console.error("stderr:", stderr);
      resolve(
        NextResponse.json({
          ok: true,
          code,
          stdout,
          stderr,
        }),
      );
    });
  });
}
