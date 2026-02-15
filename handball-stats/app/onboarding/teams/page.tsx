import OnboardingTeamsClient from "./client";
import OnboardingTeamsServer from "./page.server";

export default async function OnboardingTeamsPage() {
  const serverData = await OnboardingTeamsServer();

  return <OnboardingTeamsClient {...serverData} />;
}
