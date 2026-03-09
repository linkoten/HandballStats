import { getMatchById } from "@/app/actions/match-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Trophy,
  FileText,
  Calendar,
  Shield,
  ArrowLeft,
  Activity,
  Timer,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Fonction utilitaire pour le calcul de pourcentage
const calculateEff = (val: number, total: number) => {
  if (!total || total === 0) return 0;
  return Math.round((val / total) * 100);
};

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string; clubId: string }>;
}) {
  const { matchId: idStr, clubId } = await params;
  const matchId = Number(idStr);

  if (isNaN(matchId)) {
    return (
      <div className="p-8 text-destructive">Identifiant de match invalide</div>
    );
  }

  const res = await getMatchById(matchId);
  if (!res.success) {
    return (
      <div className="p-8 text-destructive font-sport uppercase">
        Erreur : {res.error}
      </div>
    );
  }

  const match = res.data;
  const stats = match.statistiques_joueur || [];

  const isHomeOwner =
    match.equipes_matchs_equipe_recevant_idToequipes?.clubId?.toString() ===
    clubId;

  // --- CALCULS DES STATS ÉQUIPE ---
  const totalButsMarques = stats.reduce(
    (acc: number, s: any) => acc + (s.buts || 0),
    0,
  );
  const totalArretsGardien = stats.reduce(
    (acc: number, s: any) => acc + (s.arrets || 0),
    0,
  );

  // Extraction du score adverse pour le % d'arrêts global
  // On split le score final "30-25" par exemple
  const scores = match.score_final?.split("-").map(Number) || [0, 0];
  // Si on est "isHomeOwner" (recevant), les buts encaissés sont le score extérieur (index 1)
  const butsEncaissesAdverses = isHomeOwner ? scores[1] || 0 : scores[0] || 0;

  // Formule : Arrêts / (Arrêts + Buts encaissés)
  const pourcentageArretsGlobal = calculateEff(
    totalArretsGardien,
    totalArretsGardien + butsEncaissesAdverses,
  );

  let resultStatus: "win" | "loss" | "draw" | "pending" = "pending";
  if (
    scores &&
    scores.length === 2 &&
    match.score_final &&
    match.score_final.includes("-")
  ) {
    const [scoreH, scoreA] = scores;
    if (scoreH === scoreA) {
      resultStatus = "draw";
    } else {
      const isWinner = isHomeOwner ? scoreH > scoreA : scoreA > scoreH;
      resultStatus = isWinner ? "win" : "loss";
    }
  }

  const headerColors = {
    win: "border-emerald-600 bg-emerald-500",
    loss: "border-rose-600 bg-rose-500",
    draw: "border-slate-600 bg-slate-500",
    pending: "border-primary-dark bg-primary",
  };
  const currentHeaderColor = headerColors[resultStatus];
  const scoreBgColor = currentHeaderColor.split(" ")[1];

  const topScorer =
    stats.length > 0
      ? [...stats].sort((a, b) => (b.buts || 0) - (a.buts || 0))[0]
      : null;

  console.log(match);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 1. Barre de navigation */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={`/dashboard/clubs/${clubId}/matchs`}
            className="flex items-center gap-2 text-sm font-sport italic hover:text-primary transition-colors"
          >
            <ArrowLeft size={16} /> Retour aux matchs
          </Link>
          {match.pdf_url && (
            <Button
              variant="secondary"
              size="sm"
              asChild
              className="rounded-xl font-sport italic text-[10px] bg-secondary text-primary hover:bg-secondary/80"
            >
              <a href={match.pdf_url} target="_blank" rel="noopener">
                <FileText size={14} className="mr-2" /> Feuille de match PDF
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 2. Scoreboard "TV Style" */}
        <div
          className={cn(
            "relative overflow-hidden rounded-[3rem] p-8 md:p-12 shadow-2xl text-foreground border-b-[12px] bg-card transition-colors duration-500",
            currentHeaderColor.split(" ")[0],
          )}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-[0.03] font-sport text-[15rem] italic uppercase pointer-events-none select-none z-0">
            VS
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-3xl md:text-5xl font-sport font-black italic uppercase leading-none mb-3 drop-shadow-sm text-foreground">
                {match.recevant_nom_display ||
                  match.equipes_matchs_equipe_recevant_idToequipes?.nom}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  "uppercase text-[10px] tracking-widest font-black shadow-sm",
                  isHomeOwner
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "text-muted-foreground border-border bg-background/50 backdrop-blur-sm",
                )}
              >
                {isHomeOwner ? "Notre Club (Dom)" : "Domicile"}
              </Badge>
            </div>

            <div className="flex flex-col items-center gap-5 z-20">
              {match.competition?.nom && (
                <Badge className="bg-muted/50 text-foreground border-border uppercase font-sport tracking-widest px-4 py-1.5 shadow-sm backdrop-blur-md">
                  {match.competition.nom}
                </Badge>
              )}
              <div
                className={cn(
                  "text-white px-12 py-8 rounded-[2.5rem] shadow-2xl transform hover:scale-105 transition-transform duration-300 border-4 border-white/20",
                  scoreBgColor,
                )}
              >
                <span className="text-6xl md:text-8xl font-sport font-black italic tracking-tighter shadow-sm text-center block leading-none">
                  {match.score_final || "VS"}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-muted/80 px-6 py-2.5 rounded-2xl text-foreground font-sport uppercase tracking-wider text-sm md:text-base shadow-sm backdrop-blur-md border border-border">
                <Calendar size={18} className="text-foreground/80 opacity-70" />
                {match.date_match
                  ? new Date(match.date_match).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : "Date à définir"}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left z-10">
              <h2 className="text-3xl md:text-5xl font-sport font-black italic uppercase leading-none mb-3 drop-shadow-sm text-foreground">
                {match.exterieur_nom_display ||
                  match.equipes_matchs_equipe_exterieur_idToequipes?.nom}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  "uppercase text-[10px] tracking-widest font-black shadow-sm",
                  !isHomeOwner
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "text-muted-foreground border-border bg-background/50 backdrop-blur-sm",
                )}
              >
                {!isHomeOwner ? "Notre Club (Ext)" : "Extérieur"}
              </Badge>
            </div>
          </div>
        </div>

        {/* 3. Analyse & Stats */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Sidebar : Résumé de performance globale */}
          <div className="xl:col-span-1 space-y-6">
            <Card className="rounded-[2rem] border-2 bg-card overflow-hidden">
              <CardHeader className="bg-muted/50 border-b text-center">
                <CardTitle className="font-sport italic uppercase text-sm">
                  Efficacité Équipe
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase text-muted-foreground mb-2">
                    Arrêts Gardiens
                  </span>
                  <div className="relative flex items-center justify-center">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={364.4}
                        strokeDashoffset={
                          364.4 - (364.4 * pourcentageArretsGlobal) / 100
                        }
                        className="text-secondary"
                      />
                    </svg>
                    <span className="absolute text-3xl font-sport italic font-black text-primary">
                      {pourcentageArretsGlobal}%
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-4 font-bold uppercase">
                    {totalArretsGardien} arrêts sur{" "}
                    {totalArretsGardien + butsEncaissesAdverses} tirs cadrés
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-dashed">
                  <div className="text-center">
                    <p className="text-[8px] uppercase font-black text-muted-foreground">
                      Buts
                    </p>
                    <p className="text-2xl font-sport italic font-black text-primary">
                      {totalButsMarques}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] uppercase font-black text-muted-foreground">
                      2 Min Total
                    </p>
                    <p className="text-2xl font-sport italic font-black text-destructive">
                      {stats.reduce(
                        (acc: number, s: any) => acc + (s.exclusions_2min || 0),
                        0,
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Scorer Card */}
            {topScorer && (
              <Card className="rounded-[2rem] border-2 bg-secondary/10 border-secondary/30 relative overflow-hidden">
                <Trophy className="absolute -right-4 -bottom-4 text-secondary/20 w-32 h-32 rotate-12" />
                <CardContent className="p-6 relative z-10">
                  <p className="font-sport italic text-secondary-foreground text-[10px] uppercase mb-1 tracking-widest font-black">
                    Top Buteur
                  </p>
                  <h3 className="text-2xl font-sport font-black italic uppercase text-primary leading-none mb-4">
                    {topScorer.joueurs?.nom_prenom}
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary text-white h-12 w-12 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-xl font-black italic font-sport leading-none">
                        {topScorer.buts}
                      </span>
                      <span className="text-[7px] uppercase font-bold">
                        Buts
                      </span>
                    </div>
                    <div className="text-[10px] font-black uppercase text-muted-foreground">
                      #{topScorer.joueurs?.num_maillot}{" "}
                      {topScorer.joueurs?.poste_principal}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tableau des Statistiques Détaillées */}
          <div className="xl:col-span-3">
            <Card className="rounded-[2rem] border-2 shadow-xl overflow-hidden">
              <div className="bg-primary text-white px-8 py-6">
                <h3 className="font-sport italic uppercase text-xl font-black tracking-tight">
                  Feuille de stats individuelle
                </h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50 border-b-2">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[60px] text-center font-sport italic text-[10px] uppercase">
                        N°
                      </TableHead>
                      <TableHead className="min-w-[180px] font-sport italic text-[10px] uppercase">
                        Joueur
                      </TableHead>
                      <TableHead className="text-center font-sport italic text-[10px] uppercase bg-primary/5">
                        Buts / Tirs
                      </TableHead>
                      <TableHead className="text-center font-sport italic text-[10px] uppercase bg-primary/5">
                        % Eff.
                      </TableHead>
                      <TableHead className="text-center font-sport italic text-[10px] uppercase bg-secondary/5">
                        Arrêts
                      </TableHead>
                      <TableHead className="text-center font-sport italic text-[10px] uppercase bg-destructive/5 text-destructive">
                        Excl. 2'
                      </TableHead>
                      <TableHead className="text-center font-sport italic text-[10px] uppercase">
                        Discipline
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.map((stat: any, idx: number) => {
                      const effTir = calculateEff(stat.buts, stat.tirs);
                      const isGK =
                        stat.arrets > 0 ||
                        stat.joueurs?.poste_principal
                          ?.toLowerCase()
                          .includes("gardien");

                      return (
                        <TableRow
                          key={idx}
                          className="group hover:bg-muted/40 transition-colors border-b"
                        >
                          <TableCell className="text-center font-sport font-black italic text-lg text-muted-foreground/40 group-hover:text-primary transition-colors">
                            {stat.joueurs?.num_maillot || "--"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-black uppercase text-sm italic group-hover:text-primary transition-colors">
                                {stat.joueurs?.nom_prenom}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-bold uppercase">
                                {stat.joueurs?.poste_principal || "Joueur"}
                              </span>
                            </div>
                          </TableCell>

                          {/* Section Attaque */}
                          <TableCell className="text-center bg-primary/5">
                            <div className="flex flex-col items-center">
                              <span className="text-lg font-black font-sport italic text-primary leading-none">
                                {stat.buts ?? 0}
                              </span>
                              <span className="text-[9px] font-bold text-muted-foreground mt-0.5">
                                sur {stat.tirs ?? 0}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center bg-primary/5">
                            <span
                              className={cn(
                                "text-xs font-sport italic font-black",
                                effTir >= 70
                                  ? "text-green-500"
                                  : effTir >= 40
                                    ? "text-amber-500"
                                    : "text-muted-foreground",
                              )}
                            >
                              {effTir}%
                            </span>
                          </TableCell>

                          {/* Section Gardien (Arrêts bruts) */}
                          <TableCell className="text-center bg-secondary/5">
                            {isGK ? (
                              <span className="text-lg font-black font-sport italic text-secondary leading-none">
                                {stat.arrets ?? 0}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/20 text-xs">
                                -
                              </span>
                            )}
                          </TableCell>

                          {/* Section 2 Minutes */}
                          <TableCell className="text-center bg-destructive/5">
                            {stat.exclusions_2min > 0 ? (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className="text-lg font-black font-sport italic text-destructive leading-none">
                                  {stat.exclusions_2min}
                                </span>
                                <span className="text-[8px] font-black text-destructive/60 uppercase">
                                  Sanction
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/20">
                                -
                              </span>
                            )}
                          </TableCell>

                          {/* Section Cartons */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {stat.avertissements > 0 && (
                                <div
                                  className="w-3 h-4 bg-yellow-400 rounded-sm shadow-sm border border-yellow-500"
                                  title="Avertissement"
                                />
                              )}
                              {stat.disqualifications > 0 && (
                                <div
                                  className="w-3 h-4 bg-red-600 rounded-sm shadow-sm border border-red-700"
                                  title="Disqualification"
                                />
                              )}
                              {!stat.avertissements &&
                                !stat.disqualifications && (
                                  <span className="text-muted-foreground/20 text-xs">
                                    -
                                  </span>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
