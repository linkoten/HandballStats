import OnboardingCompetitionClient from "./client";
import OnboardingCompetitionServer from "./page.server";

export default async function OnboardingCompetitionPage() {
  const serverData = await OnboardingCompetitionServer();

  return <OnboardingCompetitionClient {...serverData} />;
}
