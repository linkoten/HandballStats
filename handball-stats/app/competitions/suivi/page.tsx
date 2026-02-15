import { getCompetitionsStatus } from "@/app/actions";
import SuiviCompetitionsClient from "./client";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SuiviCompetitionsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const idsParam = params.ids;

  // Récupérer les IDs des compétitions depuis les params
  let competitionIds: number[] = [];

  if (typeof idsParam === "string") {
    competitionIds = idsParam
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n));
  }

  // Si pas d'IDs, retourner la page vide
  if (competitionIds.length === 0) {
    return (
      <SuiviCompetitionsClient
        initialData={null}
        competitionIds={[]}
        error="Aucune compétition spécifiée"
      />
    );
  }

  // Récupérer le statut des compétitions via Server Action
  const statusResult = await getCompetitionsStatus(competitionIds);

  return (
    <SuiviCompetitionsClient
      initialData={statusResult.success ? statusResult.data : null}
      competitionIds={competitionIds}
      error={statusResult.success ? undefined : statusResult.error}
    />
  );
}
