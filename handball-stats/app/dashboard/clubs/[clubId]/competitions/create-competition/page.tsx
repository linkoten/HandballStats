export const dynamic = "force-dynamic";
import CreateCompetitionClient from "./client";
import {
  getUserProfile,
  getUserTokens,
  getUserClubs,
  getEquipesByClub,
} from "@/app/actions";

interface PageProps {
  params: { clubId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function CreateCompetitionPage({ params }: PageProps) {
  // Si params est une Promise, on l'attend
  const resolvedParams = params instanceof Promise ? await params : params;

  // Récupérer le profil utilisateur
  const userResult = await getUserProfile();
  const userData = userResult.success ? userResult.data : null;

  // Récupérer les tokens utilisateur
  const tokensResult = await getUserTokens();
  const tokensData = tokensResult.success ? tokensResult.data : null;

  // Récupérer le club sélectionné
  const clubResult = await getUserClubs();
  const selectedClub =
    clubResult.success && clubResult.data ? clubResult.data.club : null;

  // Récupérer les équipes du club
  let clubTeams = [];
  if (resolvedParams.clubId) {
    const equipesResult = await getEquipesByClub(resolvedParams.clubId);
    clubTeams = equipesResult.success ? equipesResult.data : [];
  }

  return (
    <CreateCompetitionClient
      initialUserData={userData}
      initialTokensData={tokensData}
      selectedClub={selectedClub}
      selectedTeams={clubTeams}
      error={userResult.success ? undefined : userResult.error}
    />
  );
}
