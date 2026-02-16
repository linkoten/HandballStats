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
    },
    select: {
      clubId: true,
    },
  });

  const clubIds = userClubs.map((uc) => uc.clubId);

  const equipes = await prisma.equipes.findMany({
    where: {
      clubId: { in: clubIds },
    },
    include: {
      club: true,
      _count: {
        select: {
          joueurs: true,
          competitions: true,
        },
      },
    },
  });

  // Manually map scalar fields from the original result (since include does not add scalars)
  // This workaround uses a second query to fetch the scalar fields for the same equipe IDs
  const equipeIds = equipes.map((e) => e.id);
  // ...existing code...

  // Passer les équipes formatées au client
  const formattedEquipes = equipes.map((equipe) => ({
    id: equipe.id,
    nom: equipe.nom,
    ville: equipe.ville ?? "",
    club: equipe.club,
    region: equipe.region ?? undefined,
    departement: equipe.departement ?? undefined,
    hasCustomData: !!(equipe.region || equipe.departement),
    _count: equipe._count,
  }));

  return (
    <EquipesGestionClient
      initialEquipes={formattedEquipes}
      error={equipes.length === 0 ? "Aucune équipe accessible" : undefined}
    />
  );
}
