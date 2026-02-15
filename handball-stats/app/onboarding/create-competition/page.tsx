import CreateCompetitionClient from "./client";
import CreateCompetitionServer from "./page.server";

interface PageProps {
  searchParams: Promise<{ equipeId?: string }>;
}

export default async function CreateCompetitionPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const serverData = await CreateCompetitionServer(params.equipeId);

  return <CreateCompetitionClient {...serverData} />;
}
