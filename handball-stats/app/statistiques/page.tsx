export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// Redirige vers la page statistiques du club principal de l'utilisateur
export default async function StatistiquesRootPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      clubs: {
        where: { isPrincipal: true },
        take: 1,
      },
    },
  });

  const principalClub = user?.clubs[0];
  if (principalClub) {
    redirect(`/dashboard/clubs/${principalClub.clubId}/statistiques`);
  }

  redirect("/dashboard");
}