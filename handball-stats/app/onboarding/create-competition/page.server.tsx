import {
  getUserProfile,
  getUserTokens,
  getOnboardingSelectedTeams,
  getOnboardingSelectedClub,
  getEquipeById,
} from "@/app/actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

type UserData = {
  id: number;
  role: string;
  tokensRemaining: number;
  subscription: string;
};

type Club = {
  id: number;
  nom: string;
  _count: {
    equipes: number;
  };
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

export default async function CreateCompetitionServer(equipeId?: string) {
  try {
    // Si on a un equipeId dans l'URL, on charge cette équipe spécifique
    if (equipeId) {
      const { userId } = await auth();
      if (!userId) {
        return {
          initialUserData: null,
          initialTokensData: null,
          selectedTeams: [],
          selectedClub: null,
          error: "Non authentifié",
        };
      }

      // Récupération parallèle des données utilisateur et de l'équipe
      const [userResult, tokensResult] = await Promise.allSettled([
        getUserProfile(),
        getUserTokens(),
      ]);

      const userData: UserData | null =
        userResult.status === "fulfilled" && userResult.value.success
          ? userResult.value.data
          : null;

      const tokensData =
        tokensResult.status === "fulfilled" && tokensResult.value.success
          ? tokensResult.value.data
          : null;

      // Récupérer l'équipe spécifique avec son club
      const equipe = await prisma.equipes.findUnique({
        where: { id: parseInt(equipeId) },
        include: {
          club: true,
          _count: {
            select: {
              competitions: true,
              joueurs: true,
            },
          },
        },
      });

      if (!equipe) {
        return {
          initialUserData: userData,
          initialTokensData: tokensData,
          selectedTeams: [],
          selectedClub: null,
          error: "Équipe introuvable",
        };
      }

      // Vérifier que l'utilisateur a accès au club de l'équipe
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
          clubs: {
            where: { clubId: equipe.clubId || 0 },
          },
        },
      });

      if (!user || user.clubs.length === 0) {
        return {
          initialUserData: userData,
          initialTokensData: tokensData,
          selectedTeams: [],
          selectedClub: null,
          error: "Vous n'avez pas accès à cette équipe",
        };
      }

      return {
        initialUserData: userData,
        initialTokensData: tokensData,
        selectedTeams: [
          {
            id: equipe.id,
            nom: equipe.nom,
            ville: equipe.ville || undefined,
            club_id: equipe.clubId || undefined,
            _count: {
              competitions: equipe._count.competitions,
              joueurs: equipe._count.joueurs,
            },
          },
        ],
        selectedClub: equipe.club
          ? {
              id: equipe.club.id,
              nom: equipe.club.nom,
              _count: {
                equipes: 0, // Valeur par défaut
              },
            }
          : null,
        error: undefined,
      };
    }

    // Mode normal: récupération depuis l'onboarding cache
    // Récupération parallèle des données
    const [userResult, tokensResult, selectedTeamsResult, selectedClubResult] =
      await Promise.allSettled([
        getUserProfile(),
        getUserTokens(),
        getOnboardingSelectedTeams(),
        getOnboardingSelectedClub(),
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

    // Vérifier le club sélectionné
    const selectedClub: Club | null =
      selectedClubResult.status === "fulfilled" &&
      selectedClubResult.value.success
        ? selectedClubResult.value.data
        : null;

    // Si pas d'équipes sélectionnées, rediriger vers teams
    if (selectedTeams.length === 0) {
      return {
        initialUserData: userData,
        initialTokensData: tokensData,
        selectedTeams: [],
        selectedClub,
        error:
          "Aucune équipe sélectionnée. Veuillez d'abord sélectionner vos équipes.",
      };
    }

    return {
      initialUserData: userData,
      initialTokensData: tokensData,
      selectedTeams,
      selectedClub,
      error: undefined,
    };
  } catch (error) {
    console.error("Erreur chargement données create-competition:", error);
    return {
      initialUserData: null,
      initialTokensData: null,
      selectedTeams: [],
      selectedClub: null,
      error: "Erreur lors du chargement des données",
    };
  }
}
