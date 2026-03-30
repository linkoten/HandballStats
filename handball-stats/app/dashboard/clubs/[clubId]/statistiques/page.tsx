export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { checkUserClubRole } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { BarChart3 } from "lucide-react";
import { getStatsData } from "@/app/actions/stats-actions";
import StatsRecharts from "./StatsRecharts";

interface Props {
  params: Promise<{ clubId: string }>;
}

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <a href="/dashboard">
          <button className="bg-primary/10 p-2 rounded-xl text-primary flex items-center gap-2 hover:bg-primary/20 transition-colors">
            <BarChart3 size={22} />
            <span className="hidden sm:inline font-sport italic text-xs">Dashboard</span>
          </button>
        </a>
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
        <StatsRecharts data={statsResult.data ?? null} />
      </main>
    </div>
  );
}
