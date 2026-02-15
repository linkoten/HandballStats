import {
  getUserProfile,
  getUserTokens,
  getOnboardingSelectedTeams,
  getCompetitionsByEquipes,
} from "@/app/actions";

type UserData = {
  id: number;
  role: string;
  tokensRemaining: number;
  subscription: string;
};

type Equipe = {
  id: number;
  nom: string;
  ville?: string;
  saison?: string;
  nom_competition?: string;
  club_id?: number;
  _count?: {
    competitions: number;
    joueurs: number;
  };
};

type Competition = {
  id: number;
  nom: string;
  saison: string;
  scrapingStatus: string;
  lastScrapedAt: string | null;
  equipe: {
    nom: string;
  };
};

export default async function OnboardingCompetitionServer() {
  try {
    // Récupération parallèle des données de base
    const [userResult, tokensResult, selectedTeamsResult] =
      await Promise.allSettled([
        getUserProfile(),
        getUserTokens(),
        getOnboardingSelectedTeams(),
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

    // Vérifier les équipes sélectionnées
    const selectedTeams: Equipe[] =
      selectedTeamsResult.status === "fulfilled" &&
      selectedTeamsResult.value.success
        ? selectedTeamsResult.value.data
        : [];

    // Si pas d'équipes sélectionnées, rediriger vers teams
    if (selectedTeams.length === 0) {
      return {
        initialUserData: userData,
        initialTokensData: tokensData,
        selectedTeams: [],
        competitions: [],
        error:
          "Aucune équipe sélectionnée. Veuillez d'abord sélectionner vos équipes.",
      };
    }

    // Récupérer les compétitions pour ces équipes
    const equipeIds = selectedTeams.map((team) => team.id);
    const competitionsResult = await getCompetitionsByEquipes(equipeIds);

    const competitions: Competition[] = competitionsResult.success
      ? competitionsResult.data
      : [];

    return {
      initialUserData: userData,
      initialTokensData: tokensData,
      selectedTeams,
      competitions,
      error: undefined,
    };
  } catch (error) {
    console.error("Erreur chargement données onboarding competition:", error);
    return {
      initialUserData: null,
      initialTokensData: null,
      selectedTeams: [],
      competitions: [],
      error: "Erreur lors du chargement des données",
    };
  }
}
