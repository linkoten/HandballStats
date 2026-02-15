import { getUserProfile } from "@/app/actions";
import JoueursClient from "./client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function JoueursPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Récupérer le profil utilisateur via Server Action
  const userResult = await getUserProfile();
  
  if (!userResult.success || !userResult.data) {
    redirect("/sign-in");
  }

  const user = userResult.data;

  // Récupérer les équipes auxquelles l'utilisateur a accès via les clubs
  const userClubs = await prisma.userClub.findMany({
    where: { 
      userId: user.id,
      club: {
        isActive: true
      }
    },
    select: {
      clubId: true
    }
  });

  const clubIds = userClubs.map(uc => uc.clubId);

  const equipes = await prisma.equipes.findMany({
    where: {
      clubId: { in: clubIds }
    },
    include: {
      club: {
        select: { id: true, nom: true }
      },
      _count: {
        select: { joueurs: true }
      }
    },
    orderBy: [
      { club: { nom: 'asc' } },
      { nom: 'asc' }
    ]
  });

  return (
    <JoueursClient
      initialEquipes={equipes}
      error={equipes.length === 0 ? "Aucune équipe accessible" : undefined}
    />
  );
}