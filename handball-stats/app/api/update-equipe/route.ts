import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { PrismaClient } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { equipeId, competitions } = body;

  // Filtrer uniquement les compétitions de la saison 2025/2026
  const filteredCompetitions = competitions.filter(
    (c: any) => c.saison === "2025/2026",
  );

  // Prisma client
  const prisma = new PrismaClient();

  // Récupérer dynamiquement les paramètres de chaque compétition depuis la BDD
  const enrichedCompetitions = [];
  for (const c of filteredCompetitions) {
    // On suppose que c.id correspond à Competition.id
    const comp = await prisma.competition.findUnique({
      where: { id: c.id },
      include: { equipe: true },
    });
    if (!comp) {
      console.warn("Compétition introuvable en BDD:", c.id);
      continue;
    }
    // Construction dynamique de la config attendue par le scrapper
    enrichedCompetitions.push({
      url: comp.baseUrl ?? undefined,
      equipe: comp.equipeFFHB, // Nom de l'équipe sur le site FFHB
      equipe_bdd: comp.equipe?.nom ?? undefined, // Nom de l'équipe en BDD
      competition_name: comp.nom,
      poule: comp.poule ?? undefined, // Utilise comp.poule au lieu de comp.phase
      max_journees: comp.max_journees ?? undefined,
      saison: comp.saison,
      competitionId: comp.id,
      equipeId: comp.equipeId,
      niveau: comp.niveau ?? undefined,
      // Ajoute ici d'autres champs utiles pour le scrapper
    });
  }
  await prisma.$disconnect();

  // Log pour debug
  console.log("Infos compétition envoyées:", enrichedCompetitions[0]);

  // Préparer les arguments pour le scrapper Python
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
