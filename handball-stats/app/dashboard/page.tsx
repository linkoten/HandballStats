import { getUserProfile, getUserTokens } from "@/app/actions";
import { getEquipesByClub } from "@/app/actions/equipe-actions";
import DashboardClient from "./client";

export default async function DashboardPage() {
  // Récupérer les données utilisateur et tokens via Server Actions
  const [userResult, tokensResult] = await Promise.allSettled([
    getUserProfile(),
    getUserTokens(),
  ]);

  const userData =
    userResult.status === "fulfilled" && userResult.value.success
      ? userResult.value.data
      : null;

  const tokensData =
    tokensResult.status === "fulfilled" && tokensResult.value.success
      ? tokensResult.value.data
      : null;

  const error =
    userResult.status === "rejected"
      ? "Erreur de chargement du profil"
      : tokensResult.status === "rejected"
        ? "Erreur de chargement des tokens"
        : undefined;

  // Récupérer les équipes du club si club présent
  let equipesData = null;
  if (userData?.club?.id) {
    const equipesResult = await getEquipesByClub(userData.club.id.toString());
    equipesData = equipesResult.success ? equipesResult.data : null;
  }

  return (
    <DashboardClient
      initialUserData={userData}
      initialTokensData={tokensData}
      equipesData={equipesData}
      error={error}
    />
  );
}
