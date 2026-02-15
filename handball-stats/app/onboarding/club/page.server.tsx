import { getUserProfile, getUserTokens, getClubs } from "@/app/actions";

type UserData = {
  id: number;
  role: string;
  tokensRemaining: number;
  subscription: string;
};

type Club = {
  id: number;
  nom: string;
  ville: string;
  region: string | null;
  departement: string | null;
  _count: {
    equipes: number;
  };
};

export default async function OnboardingClubServer() {
  try {
    // Récupération parallèle des données
    const [userResult, tokensResult, clubsResult] = await Promise.allSettled([
      getUserProfile(),
      getUserTokens(),
      getClubs(),
    ]);

    // Vérifier les résultats utilisateur
    const userData: UserData | null =
      userResult.status === "fulfilled" && userResult.value.success
        ? userResult.value.data
        : null;

    const tokensData =
      tokensResult.status === "fulfilled" && tokensResult.value.success
        ? tokensResult.value.data
        : null;

    // Vérifier les clubs
    const clubs: Club[] =
      clubsResult.status === "fulfilled" && clubsResult.value.success
        ? clubsResult.value.data
        : [];

    return {
      initialUserData: userData,
      initialTokensData: tokensData,
      clubs,
      error: undefined,
    };
  } catch (error) {
    console.error("Erreur chargement données club:", error);
    return {
      initialUserData: null,
      initialTokensData: null,
      clubs: [],
      error: "Erreur lors du chargement des données",
    };
  }
}
