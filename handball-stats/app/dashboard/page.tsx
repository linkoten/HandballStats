export const dynamic = "force-dynamic";
import { getUserProfile, getUserTokens } from "@/app/actions";
import { getEquipesByClub } from "@/app/actions/equipe-actions";
import { getClubEntraineurs } from "@/app/actions/entraineur-actions";
import { getFreeTrialStatus } from "@/app/actions/free-trial-actions";
import DashboardClient from "./client";

export default async function DashboardPage() {
  // Récupérer les données utilisateur et tokens via Server Actions
  const [userResult, tokensResult, freeTrialResult] = await Promise.allSettled([
    getUserProfile(),
    getUserTokens(),
    getFreeTrialStatus(),
  ]);

  const userData =
    userResult.status === "fulfilled" && userResult.value.success
      ? userResult.value.data
      : null;

  const tokensData =
    tokensResult.status === "fulfilled" && tokensResult.value.success
      ? tokensResult.value.data
      : null;

  const freeTrialData =
    freeTrialResult.status === "fulfilled" ? freeTrialResult.value : null;

  const error =
    userResult.status === "rejected"
      ? "Erreur de chargement du profil"
      : tokensResult.status === "rejected"
        ? "Erreur de chargement des tokens"
        : undefined;

  // Récupérer les équipes du club si club présent
  let equipesData = null;
  let coachCount = 0;
  if (userData?.club?.id) {
    const [equipesResult, coachResult] = await Promise.allSettled([
      getEquipesByClub(userData.club.id.toString()),
      getClubEntraineurs(userData.club.id),
    ]);
    equipesData =
      equipesResult.status === "fulfilled" && equipesResult.value.success
        ? equipesResult.value.data
        : null;
    coachCount =
      coachResult.status === "fulfilled" && coachResult.value.success
        ? (coachResult.value.data?.total ?? 0)
        : 0;
  }

  return (
    <DashboardClient
      initialUserData={userData}
      initialTokensData={tokensData}
      equipesData={equipesData}
      coachCount={coachCount}
      error={error}
      freeTrialData={freeTrialData}
    />
  );
}
