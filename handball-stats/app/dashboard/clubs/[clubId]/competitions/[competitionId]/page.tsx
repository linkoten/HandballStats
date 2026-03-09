import { getCompetitionById } from "@/app/actions/competition-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Activity,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

import RescrapeButton from "./RescrapeButton";

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const resolvedParams = await params;
  const competitionId = Number(resolvedParams.competitionId);

  if (isNaN(competitionId)) {
    return (
      <div className="p-8 text-destructive font-sport uppercase">
        Identifiant invalide
      </div>
    );
  }

  const res = await getCompetitionById(competitionId);
  if (!res.success) {
    return (
      <div className="p-8 text-destructive font-sport uppercase">
        Erreur : {res.error}
      </div>
    );
  }

  const competition = res.data;
  // On suppose que les matchs sont inclus dans competition.matchs
  const matchs = competition.matchs || [];

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
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour Dashboard
            </Link>
          </Button>
          <div className="flex gap-2">
            <RescrapeButton competitionId={competitionId} />
            {competition.url && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="rounded-xl"
              >
                <a href={competition.url} target="_blank" rel="noopener">
                  <ExternalLink className="mr-2 h-4 w-4" /> FFHandball
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-8">
        {/* Hero Section (Gardée de la version précédente) */}
        <div className="relative overflow-hidden bg-primary rounded-[3rem] p-8 md:p-12 text-white shadow-2xl border-b-[10px] border-secondary">
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

            <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/10 flex items-center gap-6">
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
                <p className="text-[10px] font-black uppercase opacity-60 mb-1">
                  Matchs
                </p>
                <p className="font-sport italic text-2xl">{matchs.length}</p>
              </div>
            </div>
          </div>
          <Trophy className="absolute -right-8 -bottom-8 w-64 h-64 text-white/5 -rotate-12 pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Stats (1/4) */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-[2.5rem] border-2 overflow-hidden">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="font-sport italic text-sm uppercase flex items-center gap-2">
                  <Activity size={18} className="text-primary" /> État des
                  données
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">
                    Mis à jour
                  </span>
                  <span className="font-sport italic">
                    {competition.updatedAt
                      ? new Date(competition.updatedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : "N/A"}
                  </span>
                </div>
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-[11px] text-muted-foreground">
                  Les matchs sont synchronisés automatiquement depuis la
                  FFHandball.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des Matchs (3/4) */}
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
                  matchs.map((match: any) => (
                    <Link
                      key={match.id}
                      href={`/dashboard/matchs/${match.id}`}
                      className="flex items-center justify-between p-6 hover:bg-muted/50 transition-colors group"
                    >
                      {/* Date du match */}
                      <div className="w-24 flex flex-col items-center border-r pr-4">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">
                          {match.date_match
                            ? new Date(match.date_match).toLocaleDateString('fr-FR', {
                                weekday: 'short',
                              })
                            : "-"}
                        </span>
                        <span className="text-xl font-sport italic font-black text-primary">
                          {match.date_match
                            ? new Date(match.date_match).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                              })
                            : "--/--"}
                        </span>
                      </div>

                      {/* Confrontation */}
                      <div className="flex-1 px-8 grid grid-cols-3 items-center gap-4">
                        <div className="text-right font-bold uppercase text-sm truncate">
                          {match.recevant_nom_display}
                        </div>

                        <div className="flex justify-center">
                          {match.score_final ? (
                            <Badge className="bg-primary px-4 py-1 font-sport italic text-lg rounded-lg">
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
                        </div>

                        <div className="text-left font-bold uppercase text-sm truncate">
                          {match.exterieur_nom_display}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          Détails
                        </span>
                        <ChevronRight
                          className="text-primary group-hover:translate-x-1 transition-transform"
                          size={20}
                        />
                      </div>
                    </Link>
                  ))
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
