export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import OnboardingClubForm from "./OnboardingClubForm";
import OnboardingWithFreeTrial from "./OnboardingWithFreeTrial";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; skipFreeTrial?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Si l'user a déjà un club → dashboard directement
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { clubs: { take: 1 } },
  });
  if (user?.clubs && user.clubs.length > 0) {
    redirect("/dashboard");
  }

  const { checkout, skipFreeTrial } = await searchParams;

  // Si l'utilisateur est en GRATUIT et n'a pas encore de free trial → afficher le choix
  const isGratuit = !user?.subscription || user.subscription === "GRATUIT";
  const hasFreeTrial = user?.freeTrialStartedAt != null;
  const isPaid = ["STARTER", "PRO", "CLUB", "PREMIUM"].includes(
    user?.subscription ?? "",
  );
  const isFreeTrial = user?.subscription === "FREE_TRIAL";

  // Afficher la page de création de club directement si :
  // - l'utilisateur a un abonnement payant, ou
  // - l'utilisateur est déjà en FREE_TRIAL, ou
  // - l'utilisateur vient de skipover le free trial
  const showClubForm =
    isPaid || isFreeTrial || checkout === "success" || skipFreeTrial === "1";

  if (showClubForm) {
    return <OnboardingClubForm fromCheckout={checkout === "success"} />;
  }

  // Sinon afficher le formulaire free trial en premier
  return <OnboardingWithFreeTrial />;
}
