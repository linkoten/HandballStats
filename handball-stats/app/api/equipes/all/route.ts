import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Récupérer les clubs de l'utilisateur avec leurs équipes
    const userClubs = await prisma.userClub.findMany({
      where: { userId: user.id },
      include: {
        club: {
          include: {
            equipes: true,
          },
        },
      },
    });

    if (userClubs.length === 0) {
      return NextResponse.json([]);
    }

    // Collecter toutes les équipes des clubs de l'utilisateur
    const equipes = userClubs.flatMap((userClub) =>
      userClub.club.equipes.map((equipe) => ({
        id: equipe.id,
        nom: equipe.nom,
        ville: equipe.ville,
        club: userClub.club.nom,
        region: equipe.region,
        departement: equipe.departement,
      }))
    );

    return NextResponse.json(equipes);
  } catch (error) {
    console.error("Erreur récupération équipes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
