import ScrapingProgressClient from "./client";

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

export default async function ScrapingProgressPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const competitionIds = params.ids || "";

  if (!competitionIds) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Erreur</h1>
          <p className="text-muted-foreground">
            Aucune compétition spécifiée pour le suivi.
          </p>
        </div>
      </div>
    );
  }

  return <ScrapingProgressClient competitionIds={competitionIds} />;
}
