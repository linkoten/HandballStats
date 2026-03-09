import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ progress: [] });
  }
  const ids = idsParam
    .split(",")
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id));
  if (ids.length === 0) {
    return NextResponse.json({ progress: [] });
  }

  // Récupérer les compétitions
  const competitions = await prisma.competition.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      nom: true,
      phase: true,
      scrapingStatus: true,
      scrapingStep: true,
      scrapingProgress: true,
    },
  });

  // Mapper les données pour la page de suivi
  const progress = competitions.map((comp) => ({
    competitionId: comp.id,
    nom: comp.nom,
    phase: comp.phase || "",
    status: comp.scrapingStatus || "PENDING",
    progress: comp.scrapingProgress ?? 0,
    step: comp.scrapingStep || "",
  }));

  return NextResponse.json({ progress });
}
