import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  ChevronRight,
  Activity,
  AlertCircle,
  Layers,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: { clubId: string };
}

export default async function CompetitionsPage({ params }: Props) {
  const { clubId } = await params;
  const clubIdNum = Number(clubId);

  const equipes = await prisma.equipes.findMany({
    where: { clubId: clubIdNum },
    include: {
      competitions: true,
    },
  });

  const competitions = equipes.flatMap((e) =>
    e.competitions.map((c) => ({
      ...c,
      equipeNom: e.nom,
      equipeId: e.id,
    })),
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header avec Style "Arena" */}
      <div className="relative overflow-hidden bg-primary rounded-[2rem] p-8 md:p-12 shadow-2xl border-b-8 border-secondary/50">
        <div className="absolute top-0 right-0 p-4 opacity-10 font-sport text-9xl italic uppercase pointer-events-none">
          League
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-secondary font-sport italic">
            <Trophy size={20} className="fill-current" /> CHAMPIONNATS & COUPES
          </div>
          <h1 className="text-4xl md:text-6xl font-sport font-black italic uppercase text-white tracking-tighter">
            Mes <span className="text-secondary">Compétitions</span>
          </h1>
          <p className="text-white/60 font-medium uppercase tracking-widest text-xs border-l-2 border-secondary pl-3">
            Suivi des engagements et du scraping en temps réel
          </p>
        </div>
      </div>

      {competitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card/40 rounded-[2rem] border-2 border-dashed">
          <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-xl font-sport italic uppercase text-muted-foreground">
            Aucune compétition trouvée
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {competitions.map((competition) => (
            <div
              key={competition.id}
              className="group relative flex flex-col bg-card border-2 border-border rounded-[1.5rem] shadow-sm hover:shadow-2xl hover:border-primary/50 transition-all duration-300 overflow-hidden"
            >
              {/* Statut de Scraping (Barre de progression discrète en haut) */}
              <div className="absolute top-0 left-0 w-full h-1 bg-muted">
                <div
                  className="h-full bg-secondary transition-all duration-500"
                  style={{ width: `${competition.scrapingProgress}%` }}
                />
              </div>

              <div className="p-6 space-y-4">
                {/* Entête de la Carte */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-black uppercase tracking-tighter border-secondary text-secondary-foreground bg-secondary/10"
                    >
                      ID: {competition.id}
                    </Badge>
                    <h2 className="text-2xl font-sport font-black italic uppercase leading-none group-hover:text-primary transition-colors">
                      {competition.nom}
                    </h2>
                  </div>
                  <div className="bg-muted p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                    <Activity size={20} />
                  </div>
                </div>

                {/* Infos Équipe & Niveau */}
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase">
                    {competition.equipeNom}
                  </Badge>
                  {competition.niveau && (
                    <Badge className="bg-accent/10 text-accent-foreground border-none text-[10px] font-bold uppercase">
                      {competition.niveau}
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-bold uppercase italic"
                  >
                    Saison {competition.saison}
                  </Badge>
                </div>

                {/* Grid d'infos techniques */}
                <div className="grid grid-cols-2 gap-3 py-4 border-y border-dashed">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                      <Layers size={10} /> Phase
                    </p>
                    <p className="text-sm font-bold uppercase italic">
                      {competition.phase || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold flex items-center justify-end gap-1">
                      <Calendar size={10} /> Journées
                    </p>
                    <p className="text-sm font-bold uppercase italic">
                      {competition.max_journees || "0"}
                    </p>
                  </div>
                </div>

                {/* Erreurs de Scraping */}
                {competition.scrapingError && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 animate-pulse">
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-bold uppercase">
                      Erreur de mise à jour détectée
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/dashboard/clubs/${clubId}/competitions/${competition.id}`}
                    className="flex-1 bg-primary text-white text-center py-3 rounded-xl font-sport italic uppercase text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Détails <ChevronRight size={16} />
                  </Link>
                  <Link
                    href={`/dashboard/clubs/${clubId}/equipes/${competition.equipeId}`}
                    className="w-12 bg-muted hover:bg-secondary text-muted-foreground hover:text-secondary-foreground rounded-xl flex items-center justify-center transition-all"
                    title="Voir l'équipe"
                  >
                    <Search size={18} />
                  </Link>
                </div>
              </div>

              {/* Footer "Last Update" */}
              <div className="px-6 py-3 bg-muted/30 border-t flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase text-muted-foreground italic">
                  MAJ :{" "}
                  {competition.lastScrapedAt
                    ? new Date(competition.lastScrapedAt).toLocaleDateString()
                    : "Jamais"}
                </span>
                <span className="flex items-center gap-1 text-[9px] font-black uppercase text-secondary">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />{" "}
                  {competition.scrapingStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
