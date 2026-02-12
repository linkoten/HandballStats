import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body;

    // Vérifier que l'utilisateur a accès aux équipes des joueurs
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Récupérer les clubs de l'utilisateur pour vérifier les autorisations
    const userClubs = await prisma.userClub.findMany({
      where: { userId: user.id },
      include: { club: true },
    });

    const clubIds = userClubs.map((uc) => uc.clubId);

    // Traitement par lot des mises à jour
    const results = [];

    for (const update of updates) {
      const { id, poste_principal, postes_secondaires } = update;

      // Vérifier que le joueur appartient à une équipe d'un club de l'utilisateur
      const joueur = await prisma.joueurs.findFirst({
        where: {
          id: parseInt(id),
          equipes: {
            clubId: { in: clubIds },
          },
        },
      });

      if (!joueur) {
        results.push({
          id,
          success: false,
          error: "Joueur non autorisé ou inexistant",
        });
        continue;
      }

      try {
        const updatedJoueur = await prisma.joueurs.update({
          where: { id: parseInt(id) },
          data: {
            poste_principal: poste_principal || null,
            postes_secondaires: postes_secondaires || [],
          },
        });

        results.push({
          id,
          success: true,
          joueur: updatedJoueur,
        });
      } catch (error) {
        console.error(`Erreur mise à jour joueur ${id}:`, error);
        results.push({
          id,
          success: false,
          error: "Erreur lors de la mise à jour",
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Erreur mise à jour postes joueurs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
