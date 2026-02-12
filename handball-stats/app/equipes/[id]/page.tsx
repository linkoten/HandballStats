// app/equipes/[id]/page.tsx - Page de détails d'une équipe

import Link from "next/link";
import EquipeAccessGuard from "@/components/EquipeAccessGuard";
import prisma from "@/lib/prisma";
import { Users, Trophy, Calendar, MapPin, ArrowLeft, Plus } from "lucide-react";
import UpdateEquipeButton from "../UpdateEquipeButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EquipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const equipeId = parseInt(id);
  if (!id || isNaN(equipeId)) {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-destructive">
            ID d'équipe invalide
          </h1>
          <p className="mb-4">
            id = {String(id)} | equipeId = {String(equipeId)}
          </p>
          <Link href="/equipes" className="text-primary hover:underline">
            Retourner à la liste
          </Link>
        </div>
      </div>
    );
  }

  // Récupérer les données directement avec Prisma
  const equipe = await prisma.equipes.findUnique({
    where: { id: equipeId },
  });

  const joueurs = await prisma.joueurs.findMany({
    where: { id_equipe: equipeId },
    orderBy: { nom_prenom: "asc" },
  });

  const matchs = await prisma.matchs.findMany({
    where: {
      OR: [{ equipe_recevant_id: equipeId }, { equipe_exterieur_id: equipeId }],
    },
    orderBy: { date_match: "desc" },
    take: 10,
  });

  // Récupérer les compétitions liées à cette équipe
  const competitions = await prisma.competition.findMany({
    where: { equipeId: equipeId },
    orderBy: { createdAt: "desc" },
  });

  if (!equipe) {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Équipe introuvable</h1>
          <Link href="/equipes" className="text-primary hover:underline">
            Retourner à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <EquipeAccessGuard equipeId={equipeId}>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Header avec Compétitions */}
          <div className="mb-8 animate-in fade-in slide-in-from-top-5 duration-500">
            <Link
              href="/equipes"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-sport uppercase text-sm tracking-wide mb-6 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Retour aux équipes
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Nom de l'équipe */}
              <div>
                <h1 className="text-4xl md:text-6xl font-sport font-extrabold text-foreground uppercase tracking-tighter mb-2">
                  {equipe.nom}
                </h1>
                <p className="flex items-center text-xl text-muted-foreground md:pl-1">
                  <MapPin className="h-5 w-5 mr-2 text-secondary" />
                  <span className="uppercase tracking-widest">
                    {equipe.ville}
                  </span>
                </p>
              </div>

              {/* Compétitions */}
              <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/20 border-b border-white/10">
                  <CardTitle className="text-xl font-sport uppercase tracking-wide flex items-center gap-2 text-foreground">
                    <Trophy className="h-5 w-5 text-primary" />
                    Compétitions ({competitions.length})
                  </CardTitle>
                  <Link
                    href={`/onboarding/create-competition?equipeId=${equipeId}`}
                  >
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-md transition-all hover:scale-105"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Ajouter
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="pt-4">
                  {competitions.length > 0 ? (
                    <div className="space-y-3">
                      {competitions.map((competition) => (
                        <div
                          key={competition.id}
                          className="group p-4 bg-background/40 hover:bg-background/60 border border-transparent hover:border-primary/30 rounded-lg transition-all duration-300"
                        >
                          <div className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                            {competition.nom}
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className="bg-primary/5 border-primary/20 text-primary"
                            >
                              <Calendar className="h-3 w-3 mr-1" />{" "}
                              {competition.saison}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`
                              ${
                                competition.status === "COMPLETED"
                                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                                  : competition.status === "IN_PROGRESS"
                                    ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                    : competition.status === "FAILED"
                                      ? "bg-destructive/10 text-destructive border-destructive/20"
                                      : "bg-muted/50 text-muted-foreground border-border/50"
                              }
                            `}
                            >
                              {competition.status === "COMPLETED"
                                ? "✓ Complète"
                                : competition.status === "IN_PROGRESS"
                                  ? "⏳ En cours"
                                  : competition.status === "FAILED"
                                    ? "✗ Échouée"
                                    : "⏸ En attente"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground italic">
                      Aucune compétition enregistrée
                    </div>
                  )}
                </CardContent>
                {/* Bouton scraping compétitions */}
                <div className="mt-4">
                  {/* Bouton update incrémental équipe */}
                  <div className="mt-4">
                    <UpdateEquipeButton
                      equipeId={equipeId}
                      competitions={competitions}
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 delay-200 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Joueurs */}
            <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg h-full">
              <CardHeader className="border-b border-border/30 bg-muted/10">
                <CardTitle className="text-2xl font-sport uppercase tracking-wide flex items-center gap-3 text-foreground">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  Effectif{" "}
                  <span className="text-muted-foreground text-lg font-normal ml-auto border border-border/50 px-3 py-1 rounded-full">
                    {joueurs.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {joueurs.length > 0 ? (
                  <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
                    {joueurs.map((joueur) => (
                      <div
                        key={joueur.id}
                        className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                      >
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {joueur.nom_prenom}
                        </span>
                        {joueur.num_maillot && (
                          <span className="font-sport font-bold text-lg bg-secondary/10 text-secondary w-10 h-10 flex items-center justify-center rounded-full border border-secondary/20 shadow-sm group-hover:scale-110 transition-transform">
                            {joueur.num_maillot}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Aucun joueur dans l'effectif</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Derniers Matchs */}
            <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg h-full">
              <CardHeader className="border-b border-border/30 bg-muted/10">
                <CardTitle className="text-2xl font-sport uppercase tracking-wide flex items-center gap-3 text-foreground">
                  <div className="bg-secondary/10 p-2 rounded-full">
                    <Trophy className="h-6 w-6 text-secondary" />
                  </div>
                  Derniers Matchs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {matchs.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    {matchs.map((match) => (
                      <Link
                        key={match.id}
                        href={`/matchs/${match.id}`}
                        className="block p-4 hover:bg-white/5 transition-all group"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                            {match.competition_name}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-sport text-xl text-foreground group-hover:scale-105 transition-transform origin-left">
                              {match.score_final}
                            </span>
                            {match.date_match && (
                              <div className="flex items-center text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(match.date_match).toLocaleDateString(
                                  "fr-FR",
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Aucun match enregistré</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </EquipeAccessGuard>
  );
}
