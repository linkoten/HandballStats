import { NextRequest, NextResponse } from "next/server";
import { getCompetitionUpdateStatus } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const { competitionIds } = await req.json();
    // Récupérer le statut de chaque compétition
    // getCompetitionUpdateStatus doit retourner [{ competitionId, finished, success, error }]
    const results = await getCompetitionUpdateStatus(competitionIds);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors du polling" },
      { status: 500 },
    );
  }
}
