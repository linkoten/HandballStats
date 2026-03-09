import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const body = await req.json();
    const { nom, ville, region, departement, clubId } = body;
    if (!nom || !clubId) {
      return NextResponse.json(
        { error: "Nom et clubId requis" },
        { status: 400 },
      );
    }
    // Vérifier que l'utilisateur a accès au club
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        clubs: { where: { clubId: clubId } },
      },
    });
    if (!user || user.clubs.length === 0) {
      return NextResponse.json(
        { error: "Accès au club non autorisé" },
        { status: 403 },
      );
    }
    // Créer l'équipe
    const equipe = await prisma.equipes.create({
      data: {
        nom,
        ville: ville || null,
        region: region || null,
        departement: departement || null,
        clubId,
        status: "ACTIVE",
      },
    });
    return NextResponse.json(equipe, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 },
    );
  }
}
