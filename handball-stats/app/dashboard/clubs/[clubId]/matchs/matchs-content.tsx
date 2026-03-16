"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  Calendar,
  Target,
  ArrowRight,
  Search,
  Filter,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface MatchsContentProps {
  clubId: string;
  matchs: any[];
  clubEquipes: any[];
}

export default function MatchsContent({
  clubId,
  matchs,
  clubEquipes,
}: MatchsContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [competitionFilter, setCompetitionFilter] = useState("all");

  // Extract unique competitions for the filters (keep this, team is fetched from BDD)
  const { competitions } = useMemo(() => {
    const compSet = new Set<string>();

    matchs.forEach((m) => {
      if (m.competition_name) {
        compSet.add(m.competition_name);
      }
    });

    return {
      competitions: Array.from(compSet).sort(),
    };
  }, [matchs]);

  // Handle filtering
  const filteredMatchs = useMemo(() => {
    return matchs.filter((match) => {
      const search = searchQuery.toLowerCase();

      // Search matches
      const recevantNom = match.recevant_nom_display?.toLowerCase() || "";
      const exterieurNom = match.exterieur_nom_display?.toLowerCase() || "";
      const compNom = match.competition_name?.toLowerCase() || "";
      const dateStr = match.date_match
        ? new Date(match.date_match).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })
        : "";

      const matchesSearch =
        recevantNom.includes(search) ||
        exterieurNom.includes(search) ||
        compNom.includes(search) ||
        dateStr.includes(search);

      // Competition filter
      const matchesComp =
        competitionFilter === "all" ||
        match.competition_name === competitionFilter;

      return matchesSearch && matchesComp;
    });
  }, [matchs, searchQuery, competitionFilter]);

  return (
    <div className="space-y-8 mt-8">
      {/* Barre d'outils / Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-card p-4 rounded-[2rem] border-2 shadow-sm">
        <div className="relative md:col-span-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Rechercher équipe, compétition, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 rounded-xl bg-muted/50 border-transparent h-12 text-md transition-all focus:bg-background"
          />
        </div>

        <div className="relative md:col-span-4">
          <select
            value={competitionFilter}
            onChange={(e) => setCompetitionFilter(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/50 border-transparent outline-none ring-2 ring-transparent focus:ring-primary focus:bg-background transition-all appearance-none cursor-pointer truncate text-sm"
          >
            <option value="all">Toutes les compets</option>
            {competitions.map((comp) => (
              <option key={comp} value={comp}>
                {comp}
              </option>
            ))}
          </select>
          <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        </div>
      </div>

      {filteredMatchs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-[2.5rem] border-2 border-dashed">
          <p className="text-xl font-sport italic text-muted-foreground uppercase">
            Aucun match ne correspond aux filtres
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setCompetitionFilter("all");
            }}
            className="mt-4 text-sm font-bold uppercase text-primary hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredMatchs.map((match: any) => {
            const scores = match.score_final
              ? match.score_final.split("-").map(Number)
              : null;
            let resultStatus: "win" | "loss" | "draw" | "pending" = "pending";

            if (scores && scores.length === 2) {
              const [scoreHome, scoreAway] = scores;
              if (scoreHome === scoreAway) {
                resultStatus = "draw";
              } else {
                const isWinner = match.isHomeOwner
                  ? scoreHome > scoreAway
                  : scoreAway > scoreHome;
                resultStatus = isWinner ? "win" : "loss";
              }
            }

            const topScorer =
              match.stats_joueurs?.length > 0
                ? [...match.stats_joueurs].sort(
                    (a, b) => (b.buts || 0) - (a.buts || 0),
                  )[0]
                : null;

            return (
              <Card
                key={match.id}
                className="group relative overflow-hidden rounded-[2rem] border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-card"
              >
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-3 transition-colors duration-300",
                    resultStatus === "win"
                      ? "bg-emerald-500"
                      : resultStatus === "loss"
                        ? "bg-rose-500"
                        : resultStatus === "draw"
                          ? "bg-slate-400"
                          : "bg-slate-200",
                  )}
                />

                <CardContent className="p-0 flex flex-col h-full pl-3">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-center mb-6">
                      <Badge
                        variant="outline"
                        className="font-sport italic text-[10px] border-primary/20 uppercase tracking-widest bg-primary/5 text-primary"
                      >
                        {match.competition_name}
                      </Badge>
                      <span className="text-[10px] font-black text-muted-foreground flex items-center gap-1.5 uppercase bg-muted/50 px-3 py-1.5 rounded-lg">
                        <Calendar size={12} className="text-secondary" />
                        {match.date_match
                          ? new Date(match.date_match).toLocaleDateString(
                              "fr-FR",
                              {
                                weekday: "long",
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "À définir"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div
                        className={cn(
                          "flex-1 text-center space-y-1",
                          match.isHomeOwner
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        <p className="font-sport font-black italic uppercase text-xs md:text-sm line-clamp-2 leading-tight">
                          {match.recevant_nom_display}
                        </p>
                        {match.isHomeOwner && (
                          <Badge className="bg-primary/10 text-primary border-none text-[8px] h-4 tracking-widest">
                            NOTRE CLUB
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col items-center min-w-[90px] z-10">
                        <div
                          className={cn(
                            "rounded-2xl px-5 py-2.5 border-b-4 transition-all duration-300 shadow-sm",
                            resultStatus === "win"
                              ? "bg-emerald-500 text-white border-emerald-600"
                              : resultStatus === "loss"
                                ? "bg-rose-500 text-white border-rose-600"
                                : resultStatus === "draw"
                                  ? "bg-slate-600 text-white border-slate-700"
                                  : "bg-muted text-foreground border-border group-hover:border-primary/30",
                          )}
                        >
                          <span className="text-xl sm:text-2xl font-sport font-black italic tracking-tighter shadow-sm">
                            {match.score_final || "VS"}
                          </span>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "flex-1 text-center space-y-1",
                          !match.isHomeOwner
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        <p className="font-sport font-black italic uppercase text-xs md:text-sm line-clamp-2 leading-tight">
                          {match.exterieur_nom_display}
                        </p>
                        {!match.isHomeOwner && (
                          <Badge className="bg-primary/10 text-primary border-none text-[8px] h-4 tracking-widest">
                            NOTRE CLUB
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 items-center bg-muted/20 p-4 border-t border-border mt-auto">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-background shadow-sm border border-border flex items-center justify-center text-primary group-hover:text-secondary group-hover:scale-110 transition-all">
                        <Target size={18} />
                      </div>
                      <div className="leading-none">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1 tracking-widest">
                          Top Buteur
                        </p>
                        <p className="text-[12px] font-sport italic font-bold uppercase truncate max-w-[140px] text-foreground">
                          {topScorer
                            ? `${topScorer.joueur?.nom || "Inconnu"} (${topScorer.buts})`
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Link
                        href={`/dashboard/clubs/${clubId}/matchs/${match.id}`}
                        className="group/btn flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl text-xs font-sport italic font-black uppercase text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                      >
                        Détails{" "}
                        <ArrowRight
                          size={14}
                          className="group-hover/btn:translate-x-1.5 transition-transform"
                        />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
