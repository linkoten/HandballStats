export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { Trophy, RefreshCw } from "lucide-react";
import { CompetitionsClient } from "./competitions-client";
import { getCurrentUser } from "@/app/actions/user-actions";
import RescrapeAllButton from "./RescrapeAllButton";
import { getClubSubscriptionStatus } from "@/lib/access-control";

interface Props {
  params: Promise<{ clubId: string }>;
}

export default async function CompetitionsPage({ params }: Props) {
  const { clubId } = await params;
  const clubIdNum = Number(clubId);

  const [equipes, currentUser, subStatus] = await Promise.all([
    prisma.equipes.findMany({
      where: { clubId: clubIdNum },
      include: { competitions: true },
    }),
    getCurrentUser(),
    getClubSubscriptionStatus(clubIdNum),
  ]);

  const competitions = equipes.flatMap((e) =>
    e.competitions.map((c) => ({
      ...c,
      equipeNom: e.nom,
      equipeId: e.id,
    })),
  );

  const canRescrape =
    currentUser?.role === "ADMIN_CLUB" || currentUser?.role === "ADMIN_GENERAL";

  const hasSaison2526 = competitions.some((c) => c.saison === "2025-2026");

  // IDs des compétitions verrouillées selon le plan (ADMIN_GENERAL bypass)
  const lockedIds =
    currentUser?.role === "ADMIN_GENERAL" ? [] : subStatus.lockedCompetitionIds;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-primary rounded-4xl p-8 md:p-12 shadow-2xl border-b-8 border-secondary/50">
        <div className="absolute top-0 right-0 p-4 opacity-10 font-sport text-9xl italic uppercase pointer-events-none">
          League
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-secondary font-sport italic">
              <Trophy size={20} className="fill-current" /> CHAMPIONNATS &
              COUPES
            </div>
            <h1 className="text-4xl md:text-6xl font-sport font-black italic uppercase text-white tracking-tighter">
              Mes <span className="text-secondary">Compétitions</span>
            </h1>
            <p className="text-white/60 font-medium uppercase tracking-widest text-xs border-l-2 border-secondary pl-3">
              {competitions.length} compétition
              {competitions.length !== 1 ? "s" : ""} enregistrée
              {competitions.length !== 1 ? "s" : ""}
            </p>
          </div>

          {canRescrape && hasSaison2526 && (
            <RescrapeAllButton clubId={clubIdNum} saison="2025-2026" />
          )}
        </div>
      </div>

      <CompetitionsClient
        clubId={clubId}
        competitions={competitions}
        lockedIds={lockedIds}
        subscription={subStatus.subscription}
        quota={subStatus.quota}
      />
    </div>
  );
}
