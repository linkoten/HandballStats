// app/equipes/page.tsx - Page listant toutes les équipes

import { getUserProfile } from "@/app/actions";
import EquipesClient from "./client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function EquipesPage() {
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

  // Récupérer les clubs auxquels l'utilisateur appartient avec le nombre d'équipes
  const userClubs = await prisma.userClub.findMany({
    where: {
      userId: user.id,
    },
    include: {
      club: {
        include: {
          _count: {
            select: { equipes: true },
          },
        },
      },
    },
  });

  const clubs = userClubs.map((uc) => ({
    id: uc.club.id,
    nom: uc.club.nom,
    _count: uc.club._count,
  }));

  // Récupérer toutes les équipes des clubs accessibles
  const clubIds = clubs.map((club) => club.id);
  const equipes = await prisma.equipes.findMany({
    where: {
      clubId: { in: clubIds },
    },
    include: {
      club: {
        select: { id: true, nom: true },
      },
      _count: {
        select: {
          joueurs: true,
          competitions: true,
        },
      },
    },
    orderBy: [{ club: { nom: "asc" } }, { nom: "asc" }],
  });

  return <EquipesClient initialClubs={clubs} initialEquipes={equipes} />;
}
