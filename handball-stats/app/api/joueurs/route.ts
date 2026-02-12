import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const equipeId = searchParams.get("equipe_id");

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    let whereClause: any = {};

    if (equipeId) {
      // Si une équipe spécifique est demandée, vérifier les autorisations
      const equipe = await prisma.equipes.findFirst({
        where: {
          id: parseInt(equipeId),
          club: {
            userClubs: {
              some: { userId: user.id },
            },
          },
        },
      });

      if (!equipe) {
        return NextResponse.json(
          { error: "Équipe non autorisée" },
          { status: 403 }
        );
      }

      whereClause.id_equipe = parseInt(equipeId);
    } else {
      // Récupérer les joueurs de toutes les équipes des clubs de l'utilisateur
      const userClubs = await prisma.userClub.findMany({
        where: { userId: user.id },
        include: {
          club: {
            include: { equipes: true },
          },
        },
      });

      const equipeIds = userClubs.flatMap((uc) =>
        uc.club.equipes.map((eq) => eq.id)
      );

      if (equipeIds.length === 0) {
        return NextResponse.json([]);
      }

      whereClause.id_equipe = { in: equipeIds };
    }

    // Récupérer les joueurs
    const joueurs = await prisma.joueurs.findMany({
      where: whereClause,
      include: {
        equipes: {
          include: { club: true },
        },
      },
      orderBy: [{ equipes: { nom: "asc" } }, { nom_prenom: "asc" }],
    });

    // Formater pour correspondre à l'ancienne API
    const formattedJoueurs = joueurs.map((joueur) => ({
      id: joueur.id,
      nom_prenom: joueur.nom_prenom,
      num_maillot: joueur.num_maillot,
      id_equipe: joueur.id_equipe,
      poste_principal: joueur.poste_principal,
      postes_secondaires: joueur.postes_secondaires,
      equipe: joueur.equipes
        ? {
            id: joueur.equipes.id,
            nom: joueur.equipes.nom,
            club: joueur.equipes.club?.nom || "",
          }
        : null,
    }));

    return NextResponse.json(formattedJoueurs);
  } catch (error) {
    console.error("Erreur récupération joueurs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
