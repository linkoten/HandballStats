"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatNomPrenom } from "@/lib/utils";

interface EquipeContentProps {
  clubId: string;
  equipe: any;
  joueurs: any[];
  allMatchs: any[];
}

export default function EquipeContent({
  clubId,
  equipe,
  joueurs,
  allMatchs,
}: EquipeContentProps) {
  const [joueurSearch, setJoueurSearch] = useState("");
  const [matchSearch, setMatchSearch] = useState("");

  const filteredJoueurs = joueurs.filter((joueur: any) => {
    const search = joueurSearch.toLowerCase();
    return (
      joueur.nom_prenom?.toLowerCase().includes(search) ||
      joueur.poste_principal?.toLowerCase().includes(search) ||
      joueur.num_maillot?.toString().includes(search)
    );
  });

  const filteredMatchs = allMatchs.filter((match: any) => {
    const search = matchSearch.toLowerCase();
    const recevantNom =
      match.recevant_nom_display ||
      match.equipes_matchs_equipe_recevant_idToequipes?.nom ||
      "";
    const exterieurNom =
      match.exterieur_nom_display ||
      match.equipes_matchs_equipe_exterieur_idToequipes?.nom ||
      "";
    const dateStr = new Date(match.date_match)
      .toLocaleDateString()
      .toLowerCase();
    const scoreStr = match.score_final || "";

    return (
      recevantNom.toLowerCase().includes(search) ||
      exterieurNom.toLowerCase().includes(search) ||
      match.competition_nom?.toLowerCase().includes(search) ||
      dateStr.includes(search) ||
      scoreStr.includes(search)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Colonne Effectif (Prend 2 colonnes sur lg) */}
      <section className="lg:col-span-2 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <Users className="text-primary" size={28} />
            <h2 className="font-sport italic font-black text-3xl uppercase">
              Effectif
            </h2>
          </div>
          <div className="relative max-w-sm w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher un joueur, poste..."
              value={joueurSearch}
              onChange={(e) => setJoueurSearch(e.target.value)}
              className="pl-9 rounded-xl bg-card/50 border-2"
            />
          </div>
        </div>

        {filteredJoueurs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredJoueurs.map((joueur: any) => (
              <Card
                key={joueur.id}
                className="group overflow-hidden rounded-[2rem] border-2 hover:border-primary transition-all shadow-md relative bg-card dark:bg-slate-900 border-border dark:border-slate-800 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent z-0"></div>
                <CardContent className="p-5 pt-6 relative z-10 flex flex-col h-full justify-between gap-4">
                  <div className="flex items-start justify-end">
                    <Badge
                      variant="secondary"
                      className="text-[9px] uppercase font-black tracking-widest bg-secondary/10 text-secondary-foreground border-none px-3 py-1"
                    >
                      {joueur.poste_principal || "Non défini"}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-sport italic font-black text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors mt-2">
                      {formatNomPrenom(joueur.nom_prenom)}
                    </h3>
                  </div>
                  <Link
                    href={`/dashboard/clubs/${clubId}/joueurs/${joueur.id}`}
                    className="block mt-2"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl text-[10px] uppercase font-bold border-2 hover:bg-primary hover:text-white transition-colors"
                    >
                      Voir Profil
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground font-medium italic border-2 border-dashed rounded-[2rem]">
            Aucun joueur ne correspond à votre recherche.
          </div>
        )}
      </section>

      {/* Colonne Matchs et Calendrier */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <Calendar className="text-secondary" size={28} />
            <h2 className="font-sport italic font-black text-3xl uppercase">
              Matchs
            </h2>
          </div>
          <div className="relative max-w-sm w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Équipe, score, date..."
              value={matchSearch}
              onChange={(e) => setMatchSearch(e.target.value)}
              className="pl-9 rounded-xl bg-card/50 border-2"
            />
          </div>
        </div>

        <div className="bg-card border-2 rounded-[2.5rem] overflow-hidden flex flex-col shadow-md max-h-[800px]">
          <div className="overflow-y-auto overflow-x-hidden flex-1 scrollbar-thin">
            {filteredMatchs.length > 0 ? (
              filteredMatchs.map((match: any) => {
                let scoreRec = "?";
                let scoreExt = "?";
                let matchResult = "UNKNOWN";

                if (match.score_final && match.score_final.includes("-")) {
                  const parts = match.score_final.split("-");
                  scoreRec = parts[0].trim();
                  scoreExt = parts[1].trim();

                  const isRecevant = match.equipe_recevant_id === equipe.id;
                  const myScore = isRecevant
                    ? parseInt(scoreRec)
                    : parseInt(scoreExt);
                  const theirScore = isRecevant
                    ? parseInt(scoreExt)
                    : parseInt(scoreRec);

                  if (!isNaN(myScore) && !isNaN(theirScore)) {
                    if (myScore > theirScore) matchResult = "WIN";
                    else if (myScore < theirScore) matchResult = "LOSS";
                    else matchResult = "DRAW";
                  }
                }

                let statusColors =
                  "border-l-4 border-l-transparent bg-transparent hover:bg-muted/40";
                let scoreBg = "bg-slate-900 text-white dark:bg-slate-800";
                let scoreBorder = "border-slate-800";

                if (matchResult === "WIN") {
                  statusColors =
                    "border-l-4 border-l-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/50 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10";
                  scoreBg = "bg-emerald-500 text-white";
                  scoreBorder = "border-emerald-600";
                } else if (matchResult === "LOSS") {
                  statusColors =
                    "border-l-4 border-l-rose-500 bg-rose-50/30 hover:bg-rose-50/50 dark:bg-rose-500/5 dark:hover:bg-rose-500/10";
                  scoreBg = "bg-rose-500 text-white";
                  scoreBorder = "border-rose-600";
                } else if (matchResult === "DRAW") {
                  statusColors =
                    "border-l-4 border-l-slate-400 bg-slate-50/30 hover:bg-slate-50/50 dark:bg-slate-500/5 dark:hover:bg-slate-500/10";
                  scoreBg = "bg-slate-600 text-white";
                  scoreBorder = "border-slate-700";
                }

                const isRecevantEq = match.equipe_recevant_id === equipe.id;

                return (
                  <Link
                    key={match.id}
                    href={`/dashboard/clubs/${clubId}/matchs/${match.id}`}
                    className="block group/match border-b border-border last:border-0"
                  >
                    <div
                      className={`p-5 flex flex-col transition-all duration-200 gap-3 ${statusColors}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`flex-1 text-right font-sport italic font-bold uppercase text-sm leading-tight line-clamp-2 ${
                            isRecevantEq
                              ? "text-primary"
                              : "text-muted-foreground delay-75 group-hover/match:text-primary transition-colors"
                          }`}
                        >
                          {match.recevant_nom_display ||
                            match.equipes_matchs_equipe_recevant_idToequipes
                              ?.nom ||
                            "Équipe domicile"}
                        </div>

                        <div className="flex flex-col items-center min-w-[80px] z-10 group-hover/match:scale-105 transition-transform duration-300">
                          <div
                            className={`px-3 py-1.5 rounded-lg shadow-sm border-b-4 ${scoreBg} ${scoreBorder} font-sport italic font-black text-lg whitespace-nowrap tracking-wider`}
                          >
                            {scoreRec} - {scoreExt}
                          </div>
                        </div>

                        <div
                          className={`flex-1 text-left font-sport italic font-bold uppercase text-sm leading-tight line-clamp-2 ${
                            !isRecevantEq
                              ? "text-primary"
                              : "text-muted-foreground delay-75 group-hover/match:text-primary transition-colors"
                          }`}
                        >
                          {match.exterieur_nom_display ||
                            match.equipes_matchs_equipe_exterieur_idToequipes
                              ?.nom ||
                            "Équipe extérieure"}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase border-t border-black/5 dark:border-white/5 pt-2 mt-1">
                        <span className="truncate flex-1 group-hover/match:text-primary transition-colors">
                          {match.competition_nom}
                        </span>
                        <span className="shrink-0">
                          {new Date(match.date_match).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="p-12 text-center text-muted-foreground font-medium italic border-2 border-dashed rounded-[2rem] m-4">
                Aucun match ne correspond.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
