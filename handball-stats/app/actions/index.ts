// Export centralisé de toutes les Server Actions

// Actions de scraping
export { getScrapingStatus } from "./scraping-actions";

// Actions des équipes
export {
  getEquipesByClub,
  getEquipeById,
  createEquipe,
  updateEquipe,
  deleteEquipe,
  getDistinctPlayersCountByClub,
} from "./equipe-actions";

// Actions des joueurs
export {
  getJoueurs,
  getJoueurById,
  createJoueur,
  updateJoueur,
  deleteJoueur,
  updateJoueursPostes,
} from "./joueur-actions";

// Actions des matchs
export {
  getMatchs,
  getMatchById,
  updateMatch,
  deleteMatch,
  getMatchsByUser,
} from "./match-actions";

// Actions des compétitions
export {
  getCompetitionsByEquipes,
  getUserCompetitions,
  getCompetitionById,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  updateCompetitionScrapingStatus,
  getCompetitionsStatus,
} from "./competition-actions";

// Actions des clubs
export {
  getClubs,
  getClubCodes,
  validateClubCode,
  getUserClubs,
  createClub,
} from "./club-actions";

// Actions des tokens
export {
  getUserTokens,
  addTokensToUser,
  consumeTokenForCompetition,
} from "./token-actions";

// Actions utilisateur
export { syncUser, getUserProfile, updateUserProfile } from "./user-actions";

// Actions onboarding
export {
  selectOnboardingClub,
  getOnboardingSelectedClub,
  selectOnboardingTeams,
  getOnboardingSelectedTeams,
  configureCompetitionsBatch,
  clearOnboardingData,
  getOnboardingEquipesByClub,
} from "./onboarding-actions";

// Types centralisés
export type { EquipeFormData, EquipeResponse } from "./equipe-actions";

export type { JoueurFormData, JoueurResponse } from "./joueur-actions";

export type { MatchFormData, MatchResponse } from "./match-actions";

export type {
  CompetitionFormData,
  CompetitionResponse,
} from "./competition-actions";

export type { ClubFormData, ClubResponse } from "./club-actions";

export type { TokenResponse } from "./token-actions";

export type { UserProfileResponse } from "./user-actions";

export {
  getClubEntraineurs,
  removeEntraineurRole,
  promoteToAdmin,
  checkDowngradeQuotas,
} from "./entraineur-actions";
export type { EntraineurResponse } from "./entraineur-actions";

export type {
  OnboardingResponse,
  CompetitionConfig,
} from "./onboarding-actions";
