import { getMatchs } from "@/app/actions/match-actions";
import { getEquipesByClub } from "@/app/actions/equipe-actions";
import { Trophy } from "lucide-react";
import MatchsContent from "./matchs-content";

export default async function MatchsPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  // On récupère les matchs (qui incluent maintenant isHomeOwner et stats_joueurs)
  const res = await getMatchs();
  const matchs = res.success ? res.data : [];

  // On récupère les équipes de ce club pour le filtre
  const equipesRes = await getEquipesByClub(clubId);
  const clubEquipes = equipesRes.success ? equipesRes.data : [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Immersif */}
      <header className="relative overflow-hidden bg-primary rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-b-8 border-secondary/50">
        <div className="absolute top-0 right-0 p-4 opacity-10 font-sport text-9xl italic uppercase pointer-events-none select-none">
          Results
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-secondary font-sport italic">
            <Trophy size={20} className="fill-current" /> PERFORMANCE TRACKER
          </div>
          <h1 className="text-4xl md:text-6xl font-sport font-black italic uppercase text-white tracking-tighter">
            Matchs du <span className="text-secondary">Club</span>
          </h1>
        </div>
      </header>

      <MatchsContent
        clubId={clubId}
        matchs={matchs}
        clubEquipes={clubEquipes}
      />
    </div>
  );
}
