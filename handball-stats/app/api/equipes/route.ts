import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get("club_id");
    const saison = searchParams.get("saison");

    if (!clubId) {
      return NextResponse.json({ error: "club_id requis" }, { status: 400 });
    }

    // Récupérer toutes les équipes du club
    const equipes = await prisma.equipes.findMany({
      where: {
        clubId: parseInt(clubId),
      },
      include: {
        club: true,
      },
      orderBy: {
        nom: "asc",
      },
    });

    // Formater pour correspondre à l'ancienne API
    const formattedEquipes = equipes.map((equipe) => ({
      id: equipe.id,
      nom: equipe.nom,
      nom_competition: equipe.nom,
      ville: equipe.ville,
      club: equipe.club?.nom || "",
      region: equipe.region,
      departement: equipe.departement,
    }));

    return NextResponse.json(formattedEquipes);
  } catch (error) {
    console.error("Erreur récupération équipes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { nom, ville, region, departement, clubId } = body;

    if (!nom || !ville || !clubId) {
      return NextResponse.json(
        { error: "Nom, ville et club requis" },
        { status: 400 }
      );
    }

    // Créer l'équipe
    const equipe = await prisma.equipes.create({
      data: {
        nom,
        ville,
        region: region || null,
        departement: departement || null,
        clubId: parseInt(clubId),
      },
    });

    return NextResponse.json({ success: true, equipe }, { status: 201 });
  } catch (error) {
    console.error("Erreur création équipe:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
