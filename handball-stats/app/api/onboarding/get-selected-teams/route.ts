import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
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
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Récupérer l'équipe sélectionnée depuis les cookies
    const cookieStore = await cookies();
    const selectedEquipeId = cookieStore.get(
      "onboarding-selected-equipe"
    )?.value;

    if (!selectedEquipeId) {
      // Pas d'équipe sélectionnée, renvoyer toutes les équipes des clubs de l'utilisateur
      const userClubs = await prisma.userClub.findMany({
        where: { userId: user.id },
        include: {
          club: {
            include: {
              equipes: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (userClubs.length === 0) {
        return NextResponse.json({ equipeIds: [] });
      }

      // Extraire tous les IDs d'équipes
      const equipeIds = userClubs.flatMap((userClub) =>
        userClub.club.equipes.map((equipe) => equipe.id)
      );

      return NextResponse.json({ equipeIds });
    }

    // Vérifier que l'équipe appartient bien à l'utilisateur
    const equipe = await prisma.equipes.findFirst({
      where: {
        id: parseInt(selectedEquipeId),
        club: {
          userClubs: {
            some: { userId: user.id },
          },
        },
      },
    });

    if (!equipe) {
      // L'équipe n'existe plus ou n'appartient plus à l'utilisateur
      cookieStore.delete("onboarding-selected-equipe");
      return NextResponse.json({ equipeIds: [] });
    }

    // Renvoyer uniquement l'équipe sélectionnée
    return NextResponse.json({ equipeIds: [parseInt(selectedEquipeId)] });
  } catch (error) {
    console.error("Erreur récupération équipes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
