export const dynamic = "force-dynamic";
import {
  getCompetitionById,
  getClassementHistorique,
} from "@/app/actions/competition-actions";
import { getCurrentUser } from "@/app/actions/user-actions";
import { getClubSubscriptionStatus } from "@/lib/access-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  MapPin,
  Users,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import RescrapeButton from "./RescrapeButton";
import CompetitionTabs from "./CompetitionTabs";

function getMatchResult(
  match: any,
  equipeId: number | undefined,
): "win" | "draw" | "loss" | "upcoming" {
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

  // Historique des classements (toutes journées) pour le graphique
  const historiqueRes = await getClassementHistorique(competitionId);
  const historiqueClassement = historiqueRes.success
    ? (historiqueRes.data ?? [])
    : [];

  // Classement actuel : pour chaque équipe, on prend son snapshot le plus récent.
  // Cela garantit que toutes les équipes apparaissent même si journeeMax correspond
  // à un seul match joué en avance (journée partielle).
  const journeeMax =
    historiqueClassement.length > 0
      ? Math.max(...historiqueClassement.map((r: any) => r.journee as number))
      : 0;
  const teamLatest: Record<string, any> = {};
  for (const r of historiqueClassement) {
    const key = r.nomEquipe as string;
    if (
      !teamLatest[key] ||
      Number(r.journee) > Number(teamLatest[key].journee)
    ) {
      teamLatest[key] = r;
    }
  }
  const classement = Object.values(teamLatest).sort(
    (a: any, b: any) => a.position - b.position,
  );

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
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="font-sport italic"
            >
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
              </Link>
            </Button>
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
          </div>
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
            <div className="bg-white/10 backdrop-blur-md rounded-4xl p-6 border border-white/10 flex flex-wrap items-center gap-5">
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

        <CompetitionTabs
          matchs={matchs}
          classement={classement}
          historiqueClassement={historiqueClassement}
          equipeId={equipeId}
          equipeNom={competition.equipe?.nom}
          stats={stats}
          playedCount={playedCount}
          updatedAt={competition.updatedAt?.toString() ?? null}
          clubId={clubId}
          journeeMax={journeeMax}
        />
      </div>
    </div>
  );
}
