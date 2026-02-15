import OnboardingClubClient from "./client";
import OnboardingClubServer from "./page.server";

export default async function OnboardingClubPage() {
  const serverData = await OnboardingClubServer();

  return <OnboardingClubClient {...serverData} />;
}
