export const dynamic = "force-dynamic";
import { getCurrentUser } from "@/app/actions/user-actions";
import { getClubEntraineurs } from "@/app/actions/entraineur-actions";
import { redirect } from "next/navigation";
import EntraineursClient from "./EntraineursClient";

interface PageProps {
  params: Promise<{ clubId: string }>;
}

export default async function EntraineursPage({ params }: PageProps) {
  const { clubId: clubIdStr } = await params;
  const clubId = parseInt(clubIdStr, 10);

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");

  // Seuls les admins peuvent gérer les entraîneurs
  if (!["ADMIN_CLUB", "ADMIN_GENERAL"].includes(currentUser.role)) {
    redirect(`/dashboard`);
  }

  const result = await getClubEntraineurs(clubId);

  return (
    <EntraineursClient
      clubId={clubId}
      currentUserId={currentUser.id}
      currentUserRole={currentUser.role}
      initialMembers={result.data?.members ?? []}
      maxEntraineurs={result.data?.maxEntraineurs ?? 0}
      planKey={result.data?.planKey ?? "GRATUIT"}
    />
  );
}
