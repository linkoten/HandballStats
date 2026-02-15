import { getUserProfile } from "@/app/actions";
import EquipesGestionClient from "./client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function EquipesGestionPage() {
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

  // Récupérer toutes les équipes accessibles avec métadonnées
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
      club: true,
      _count: {
        select: {
          joueurs: true,
          competitions: true
        }
      }
    },
    orderBy: [
      { club: { nom: 'asc' } },
      { nom: 'asc' }
    ]
  });

  // Passer les équipes formatées au client
  const formattedEquipes = equipes.map(equipe => ({
    id: equipe.id,
    nom: equipe.nom,
    ville: equipe.ville,
    club: equipe.club,
    region: equipe.region,
    departement: equipe.departement,
    notes: equipe.notes,
    hasCustomData: !!(equipe.region || equipe.departement || equipe.notes),
    _count: equipe._count
  }));

  return (
    <EquipesGestionClient
      initialEquipes={formattedEquipes}
      error={equipes.length === 0 ? "Aucune équipe accessible" : undefined}
    />
  );
}