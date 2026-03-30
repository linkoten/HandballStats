export const dynamic = "force-dynamic";
import { getUserProfile } from "@/app/actions";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import JoueursClient from "./client";
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
    },
    select: {
      clubId: true,
    },
  });

  const clubIds = userClubs.map((uc) => uc.clubId);

  const equipesRaw = await prisma.equipes.findMany({
    where: {
      clubId: { in: clubIds },
    },
    include: {
      club: {
        select: { id: true, nom: true },
      },
      _count: {
        select: { joueurs: true },
      },
    },
    orderBy: [{ club: { nom: "asc" } }, { nom: "asc" }],
  });

  // Filter out equipes with null club to match Equipe type
  const equipes = equipesRaw
    .filter((e) => e.club !== null)
    .map((e) => ({
      ...e,
      club: e.club as { id: number; nom: string },
    }));

  return (
    <JoueursClient
      initialEquipes={equipes}
      error={equipes.length === 0 ? "Aucune équipe accessible" : undefined}
    />
  );
}
