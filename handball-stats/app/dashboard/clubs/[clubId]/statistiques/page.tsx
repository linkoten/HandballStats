import { redirect } from "next/navigation";
import { checkUserClubRole } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import MetabaseDashboard from "@/components/MetabaseDashboard";
import { signMetabaseDashboardUrl } from "@/lib/metabase";
import { BarChart3 } from "lucide-react";

interface Props {
  params: Promise<{ clubId: string }>;
}

// ID numérique du dashboard (les chiffres avant le "-" dans le slug Metabase)
const DASHBOARD_ID = Number(
  process.env.METABASE_DASHBOARD_ID ??
    (process.env.METABASE_DASHBOARD_PATH ?? "33").split("-")[0],
);

export default async function StatistiquesPage({ params }: Props) {
  const { clubId: clubIdStr } = await params;
  const clubId = parseInt(clubIdStr, 10);

  const { hasAccess } = await checkUserClubRole({ clubId });
  if (!hasAccess) redirect("/dashboard");

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, nom: true },
  });
  if (!club) redirect("/dashboard");

  // JWT signé côté serveur — "club" verrouillé, impossible à falsifier côté client
  // Metabase attend un tableau pour les filtres de type Number
  const embedUrl = signMetabaseDashboardUrl(DASHBOARD_ID, {
    club: [clubId],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl text-primary">
          <BarChart3 size={22} />
        </div>
        <div>
          <h1 className="font-sport italic text-xl font-black uppercase leading-none">
            Statistiques
          </h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            {club.nom}
          </p>
        </div>
      </header>

      <main className="p-0">
        <MetabaseDashboard src={embedUrl} height={900} />
      </main>
    </div>
  );
}
