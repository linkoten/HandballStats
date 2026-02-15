import { getUserProfile, getUserTokens } from "@/app/actions";
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

  return (
    <DashboardClient
      initialUserData={userData}
      initialTokensData={tokensData}
      error={error}
    />
  );
}
