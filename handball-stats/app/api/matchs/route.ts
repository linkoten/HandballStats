import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
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

    // Récupérer les compétitions auxquelles l'utilisateur a accès
    const competitionAccess = await prisma.competitionAccess.findMany({
      where: { userId: user.id },
      select: { competitionId: true },
    });

    const competitionIds = competitionAccess.map(
      (access) => access.competitionId
    );

    const { searchParams } = new URL(request.url);
    const equipeId = searchParams.get("equipe_id");
    const competition = searchParams.get("competition");
    const limit = searchParams.get("limit");

    // Construire les filtres
    const where: any = {
      competitionId: {
        in: competitionIds, // Filtrer par compétitions accessibles
      },
    };

    if (equipeId) {
      const id = parseInt(equipeId);
      where.OR = [{ equipe_recevant_id: id }, { equipe_exterieur_id: id }];
    }

    if (competition) {
      where.competition_name = {
        contains: competition,
        mode: "insensitive",
      };
    }

    // Récupérer les matchs
    const matchs = await prisma.matchs.findMany({
      where,
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
      },
      orderBy: {
        date_match: "desc",
      },
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json(matchs);
  } catch (error) {
    console.error("Erreur récupération matchs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
