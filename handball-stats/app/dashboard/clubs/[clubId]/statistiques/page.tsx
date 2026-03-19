import { redirect } from "next/navigation";
import { checkUserClubRole } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import MetabaseDashboard from "@/components/MetabaseDashboard";
import { signMetabaseDashboardUrl } from "@/lib/metabase";
import { BarChart3 } from "lucide-react";
import { getStatsData } from "@/app/actions/stats-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsRecharts from "./StatsRecharts";

interface Props {
  params: Promise<{ clubId: string }>;
}

const DASHBOARD_ID = Number(
  process.env.METABASE_DASHBOARD_ID ??
    (process.env.METABASE_DASHBOARD_PATH ?? "33").split("-")[0],
);

export default async function StatistiquesPage({ params }: Props) {
  const { clubId: clubIdStr } = await params;
  const clubId = parseInt(clubIdStr, 10);

  const { hasAccess } = await checkUserClubRole({ clubId });
  if (!hasAccess) redirect("/dashboard");

  const [club, statsResult] = await Promise.all([
    prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, nom: true },
    }),
    getStatsData(clubId),
  ]);
  if (!club) redirect("/dashboard");

  const embedUrl = signMetabaseDashboardUrl(DASHBOARD_ID, { club: [clubId] });

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

      <main className="p-4 md:p-6">
        <Tabs defaultValue="recharts">
          <TabsList className="h-12 rounded-2xl bg-muted p-1 mb-6">
            <TabsTrigger
              value="recharts"
              className="rounded-xl font-sport italic uppercase text-sm px-6 data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              <BarChart3 size={15} className="mr-2" />
              Graphiques
            </TabsTrigger>
            <TabsTrigger
              value="metabase"
              className="rounded-xl font-sport italic uppercase text-sm px-6 data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Metabase
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recharts">
            <StatsRecharts data={statsResult.data ?? null} />
          </TabsContent>

          <TabsContent value="metabase" className="p-0 -mx-4 md:-mx-6">
            <MetabaseDashboard src={embedUrl} height={900} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
