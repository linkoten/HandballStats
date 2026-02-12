import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const matchId = parseInt(params.id);

    const match = await prisma.matchs.findUnique({
      where: { id: matchId },
      include: {
        equipes_matchs_equipe_recevant_idToequipes: {
          select: {
            id: true,
            nom: true,
            ville: true,
          },
        },
        equipes_matchs_equipe_exterieur_idToequipes: {
          select: {
            id: true,
            nom: true,
            ville: true,
          },
        },
        competition: {
          select: {
            id: true,
            nom: true,
            saison: true,
          },
        },
        statistiques_joueur: {
          include: {
            joueurs: {
              select: {
                id: true,
                nom_prenom: true,
                num_maillot: true,
                poste_principal: true,
                postes_secondaires: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match non trouvé" }, { status: 404 });
    }

    // Vérifier que l'utilisateur a accès à la compétition de ce match
    if (match.competitionId) {
      const hasAccess = await prisma.competitionAccess.findFirst({
        where: {
          userId: user.id,
          competitionId: match.competitionId,
        },
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: "Accès non autorisé à ce match" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(match);
  } catch (error) {
    console.error("Erreur récupération match:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
