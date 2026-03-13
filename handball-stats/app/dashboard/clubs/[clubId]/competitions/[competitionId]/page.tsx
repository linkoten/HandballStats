import { getCompetitionById } from "@/app/actions/competition-actions";
import { getCurrentUser } from "@/app/actions/user-actions";
import { getClubSubscriptionStatus } from "@/lib/access-control";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  MapPin,
  Users,
  Activity,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  MinusCircle,
  XCircle,
  Clock,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import RescrapeButton from "./RescrapeButton";

type MatchResult = "win" | "draw" | "loss" | "upcoming";

function getMatchResult(match: any, equipeId: number | undefined): MatchResult {
  if (!equipeId || !match.score_final) return "upcoming";
  const parts = match.score_final.split("-");
  if (parts.length !== 2) return "upcoming";
  const scoreRecevant = parseInt(parts[0], 10);
  const scoreExterieur = parseInt(parts[1], 10);
  if (isNaN(scoreRecevant) || isNaN(scoreExterieur)) return "upcoming";
  const isHome = match.equipe_recevant_id === equipeId;
  const ourScore = isHome ? scoreRecevant : scoreExterieur;
  const theirScore = isHome ? scoreExterieur : scoreRecevant;
  if (ourScore > theirScore) return "win";
  if (ourScore === theirScore) return "draw";
  return "loss";
}

const resultConfig: Record<
  MatchResult,
  { label: string; scoreCls: string; rowCls: string; icon: React.ReactNode }
> = {
  win: {
    label: "Victoire",
    scoreCls: "bg-emerald-500 text-white border-none",
    rowCls:
      "border-l-4 border-l-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10",
    icon: <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />,
  },
  draw: {
    label: "Nul",
    scoreCls: "bg-amber-400 text-white border-none",
    rowCls:
      "border-l-4 border-l-amber-400 bg-amber-400/5 hover:bg-amber-400/10",
    icon: <MinusCircle size={13} className="text-amber-500 shrink-0" />,
  },
  loss: {
    label: "Défaite",
    scoreCls: "bg-destructive text-white border-none",
    rowCls:
      "border-l-4 border-l-destructive bg-destructive/5 hover:bg-destructive/10",
    icon: <XCircle size={13} className="text-destructive shrink-0" />,
  },
  upcoming: {
    label: "",
    scoreCls: "",
    rowCls: "hover:bg-muted/50",
    icon: <Clock size={13} className="text-muted-foreground/50 shrink-0" />,
  },
};

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ competitionId: string; clubId: string }>;
}) {
  const { competitionId: rawId, clubId } = await params;
  const competitionId = Number(rawId);

  if (isNaN(competitionId)) {
    return (
      <div className="p-8 text-destructive font-sport uppercase">
        Identifiant invalide
      </div>
    );
  }

  const [res, currentUser, subStatus] = await Promise.all([
    getCompetitionById(competitionId),
    getCurrentUser(),
    getClubSubscriptionStatus(Number(clubId)),
  ]);

  if (!res.success) {
    return (
      <div className="p-8 text-destructive font-sport uppercase">
        Erreur : {res.error}
      </div>
    );
  }

  // Compétition verrouillée par le plan
  const isLocked =
    currentUser?.role !== "ADMIN_GENERAL" &&
    subStatus.lockedCompetitionIds.includes(competitionId);

  if (isLocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-sport font-black italic uppercase tracking-tighter">
              Compétition verrouillée
            </h2>
            <p className="text-muted-foreground">
              Cette compétition n&apos;est pas accessible avec votre plan
              actuel.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pricing">
              <Button className="font-sport italic uppercase">
                Upgrader mon plan <ArrowUpRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/clubs/${clubId}/competitions`}>
              <Button variant="outline" className="font-sport italic uppercase">
                <ArrowLeft className="mr-2 w-4 h-4" /> Retour
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const competition = res.data;
  const matchs = competition.matchs || [];
  const equipeId = competition.equipe?.id as number | undefined;

  const canRescrape =
    currentUser?.role === "ADMIN_CLUB" || currentUser?.role === "ADMIN_GENERAL";

  const stats = matchs.reduce(
    (
      acc: { wins: number; draws: number; losses: number; upcoming: number },
      match: any,
    ) => {
      const r = getMatchResult(match, equipeId);
      acc[
        r === "win"
          ? "wins"
          : r === "draw"
            ? "draws"
            : r === "loss"
              ? "losses"
              : "upcoming"
      ]++;
      return acc;
    },
    { wins: 0, draws: 0, losses: 0, upcoming: 0 },
  );

  const playedCount = stats.wins + stats.draws + stats.losses;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header / Navigation */}
      <div className="bg-muted/30 border-b mb-8">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="font-sport italic"
          >
            <Link href={`/dashboard/clubs/${clubId}/competitions`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux compétitions
            </Link>
          </Button>
          {competition.url && (
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <a
                href={competition.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" /> FFHandball
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-primary rounded-5xl p-8 md:p-12 text-white shadow-2xl border-b-10 border-secondary">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-secondary text-primary font-sport italic px-4 py-1">
                  SAISON {competition.saison}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-white border-white/30 uppercase text-[10px] tracking-widest"
                >
                  {competition.niveau || "National"}
                </Badge>
              </div>
              <h1 className="text-4xl md:text-6xl font-sport font-black italic uppercase tracking-tighter leading-none mb-2">
                {competition.nom}
              </h1>
              <div className="flex items-center gap-4 text-white/70 font-medium">
                <div className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-secondary" />
                  <span>{competition.equipe?.club?.nom}</span>
                </div>
                <div className="flex items-center gap-1.5 border-l border-white/20 pl-4">
                  <Users size={16} className="text-secondary" />
                  <span>{competition.equipe?.nom}</span>
                </div>
              </div>
            </div>

            {/* Stats panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-4xl p-6 border border-white/10 flex items-center gap-5 shrink-0">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase opacity-60 mb-1">
                  Poule
                </p>
                <p className="font-sport italic text-2xl text-secondary">
                  {competition.poule?.split("-")[1] || "-"}
                </p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-[10px] font-black uppercase opacity-60 mb-1 text-emerald-300">
                  Victoires
                </p>
                <p className="font-sport italic text-2xl text-emerald-400">
                  {stats.wins}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase opacity-60 mb-1 text-amber-300">
                  Nuls
                </p>
                <p className="font-sport italic text-2xl text-amber-300">
                  {stats.draws}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase opacity-60 mb-1 text-red-300">
                  Défaites
                </p>
                <p className="font-sport italic text-2xl text-red-400">
                  {stats.losses}
                </p>
              </div>
              {stats.upcoming > 0 && (
                <>
                  <div className="w-px h-10 bg-white/20" />
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase opacity-60 mb-1">
                      À venir
                    </p>
                    <p className="font-sport italic text-2xl text-white/60">
                      {stats.upcoming}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          <Trophy className="absolute -right-8 -bottom-8 w-64 h-64 text-white/5 -rotate-12 pointer-events-none" />
        </div>

        {/* CTA Synchronisation — admins uniquement */}
        {canRescrape && (
          <div className="relative overflow-hidden bg-secondary/10 border-2 border-secondary/40 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-secondary/20 p-3 rounded-2xl">
                <RefreshCw size={24} className="text-secondary" />
              </div>
              <div className="space-y-1">
                <p className="font-sport italic font-black uppercase text-xl tracking-tight">
                  Synchronisation des données
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Met à jour les matchs, scores et classements en récupérant les
                  dernières données depuis la FFHandball.
                </p>
              </div>
            </div>
            <RescrapeButton competitionId={competitionId} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Stats */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-[2.5rem] border-2 overflow-hidden">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="font-sport italic text-sm uppercase flex items-center gap-2">
                  <Activity size={18} className="text-primary" /> Bilan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {playedCount > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <span className="text-2xl font-sport italic font-black text-emerald-600">
                          {stats.wins}
                        </span>
                        <span className="text-[9px] font-black uppercase text-emerald-600/70 mt-0.5">
                          Victoires
                        </span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-amber-400/10 rounded-2xl border border-amber-400/20">
                        <span className="text-2xl font-sport italic font-black text-amber-600">
                          {stats.draws}
                        </span>
                        <span className="text-[9px] font-black uppercase text-amber-600/70 mt-0.5">
                          Nuls
                        </span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-destructive/10 rounded-2xl border border-destructive/20">
                        <span className="text-2xl font-sport italic font-black text-destructive">
                          {stats.losses}
                        </span>
                        <span className="text-[9px] font-black uppercase text-destructive/70 mt-0.5">
                          Défaites
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic text-center py-2">
                    Aucun match joué
                  </p>
                )}

                <div className="flex justify-between items-center text-sm pt-2 border-t">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">
                    Mis à jour
                  </span>
                  <span className="font-sport italic text-xs">
                    {competition.updatedAt
                      ? new Date(competition.updatedAt).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des Matchs */}
          <div className="lg:col-span-3">
            <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
              <div className="bg-primary text-white px-8 py-6 flex justify-between items-center">
                <h3 className="font-sport italic uppercase text-xl font-black tracking-tight">
                  Calendrier & Résultats
                </h3>
                <Badge className="bg-secondary text-primary font-sport italic">
                  {matchs.length} Rencontres
                </Badge>
              </div>

              <div className="divide-y">
                {matchs.length > 0 ? (
                  matchs.map((match: any) => {
                    const result = getMatchResult(match, equipeId);
                    const cfg = resultConfig[result];
                    return (
                      <Link
                        key={match.id}
                        href={`/dashboard/matchs/${match.id}`}
                        className={`flex items-center justify-between p-5 transition-colors group ${cfg.rowCls}`}
                      >
                        {/* Date */}
                        <div className="w-20 shrink-0 flex flex-col items-center border-r pr-4">
                          <span className="text-[10px] font-black uppercase text-muted-foreground">
                            {match.date_match
                              ? new Date(match.date_match).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    weekday: "short",
                                  },
                                )
                              : "-"}
                          </span>
                          <span className="text-xl font-sport italic font-black text-primary">
                            {match.date_match
                              ? new Date(match.date_match).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                  },
                                )
                              : "--/--"}
                          </span>
                        </div>

                        {/* Teams + Score */}
                        <div className="flex-1 px-4 md:px-6 grid grid-cols-3 items-center gap-2">
                          <div className="text-right font-bold uppercase text-sm truncate">
                            {match.recevant_nom_display}
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            {match.score_final ? (
                              <Badge
                                className={`px-3 py-1 font-sport italic text-base rounded-lg ${cfg.scoreCls}`}
                              >
                                {match.score_final}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="font-sport italic text-muted-foreground"
                              >
                                VS
                              </Badge>
                            )}
                            {result !== "upcoming" && (
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground">
                                {cfg.icon} {cfg.label}
                              </span>
                            )}
                          </div>
                          <div className="text-left font-bold uppercase text-sm truncate">
                            {match.exterieur_nom_display}
                          </div>
                        </div>

                        {/* Action */}
                        <div className="shrink-0 flex items-center gap-2 pl-2">
                          <span className="hidden md:block text-[10px] font-black uppercase text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            Détails
                          </span>
                          <ChevronRight
                            className="text-primary group-hover:translate-x-1 transition-transform"
                            size={20}
                          />
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-muted-foreground italic font-sport uppercase tracking-widest opacity-50">
                    Aucun match trouvé pour cette compétition
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
