import {
  getUserProfile,
  getUserTokens,
  getOnboardingSelectedClub,
  getOnboardingEquipesByClub,
} from "@/app/actions";
import OnboardingTeamsClient from "./client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function OnboardingTeamsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Récupérer les données utilisateur et tokens
  const [userResult, tokensResult, clubResult] = await Promise.allSettled([
    getUserProfile(),
    getUserTokens(),
    getOnboardingSelectedClub(),
  ]);

  const userData =
    userResult.status === "fulfilled" && userResult.value.success
      ? userResult.value.data
      : null;

  const tokensData =
    tokensResult.status === "fulfilled" && tokensResult.value.success
      ? tokensResult.value.data
      : null;

  const selectedClub =
    clubResult.status === "fulfilled" && clubResult.value.success
      ? clubResult.value.data
      : null;

  let equipes: any[] = [];
  let equipesError: string | undefined;

  // Si un club est sélectionné, récupérer ses équipes
  if (selectedClub?.id) {
    const equipesResult = await getOnboardingEquipesByClub(selectedClub.id);
    if (equipesResult.success) {
      equipes = equipesResult.data;
    } else {
      equipesError = equipesResult.error;
    }
  }

  const error =
    userResult.status === "rejected"
      ? "Erreur de chargement du profil"
      : tokensResult.status === "rejected"
        ? "Erreur de chargement des tokens"
        : !selectedClub
          ? "Aucun club sélectionné pour l'onboarding"
          : equipesError;

  return (
    <OnboardingTeamsClient
      initialUserData={userData}
      initialTokensData={tokensData}
      selectedClub={selectedClub}
      initialEquipes={equipes}
      error={error}
    />
  );
}
