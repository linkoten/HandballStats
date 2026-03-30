export const dynamic = "force-dynamic";
// dashboard/clubs/[clubId]/equipes/page.tsx
import {
  getEquipesWithStatsByClub,
  getDistinctPlayersCountByClub,
} from "@/app/actions/equipe-actions";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  ChevronRight,
  Trophy,
  Activity,
  Calendar,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function EquipesPage({
  params,
}: {
  params: Promise<{ clubId: string }>; // On ne récupère que le clubId ici
}) {
  const { clubId } = await params;

  // On récupère les équipes via le clubId uniquement
  const result = await getEquipesWithStatsByClub(clubId);
  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto p-12 text-center font-sport italic text-destructive">
        Erreur : Impossible de charger les équipes du club.
      </div>
    );
  }

  const equipes = result.data;

  // Récupérer le nombre de joueurs distincts pour ce club
  const distinctPlayersResult = await getDistinctPlayersCountByClub(clubId);
  const distinctPlayersCount = distinctPlayersResult.success
    ? distinctPlayersResult.count || 0
    : 0;

  console.log("yo", equipes);

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Style "Arena" */}
      <header className="relative overflow-hidden bg-primary rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-b-8 border-secondary/50">
        <div className="absolute top-0 right-0 p-4 opacity-10 font-sport text-9xl italic uppercase pointer-events-none text-white">
          Teams
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-secondary font-sport italic">
            <Users size={24} className="fill-current" /> GESTION DES EFFECTIFS
          </div>
          <h1 className="text-4xl md:text-6xl font-sport font-black italic uppercase text-white tracking-tighter leading-none">
            Équipes du <span className="text-secondary">Club</span>
          </h1>
        </div>
      </header>

      {/* Statistiques Rapides basées sur le mapping */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border-2 p-6 rounded-[2rem] flex items-center gap-4 shadow-sm">
          <div className="bg-primary/10 p-4 rounded-2xl text-primary">
            <Users size={28} />
          </div>
          <div>
            <p className="text-3xl font-sport italic font-black">
              {equipes.length}
            </p>
            <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
              Collectifs
            </p>
          </div>
        </div>

        <div className="bg-card border-2 p-6 rounded-[2rem] flex items-center gap-4 shadow-sm">
          <div className="bg-secondary/10 p-4 rounded-2xl text-secondary">
            <Activity size={28} />
          </div>
          <div>
            <p className="text-3xl font-sport italic font-black">
              {/* Nombre de joueurs distincts dans le club */}
              {distinctPlayersCount}
            </p>
            <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
              Joueurs Distincts
            </p>
          </div>
        </div>
      </div>

      {/* Mapping des Équipes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {equipes.map((equipe: any) => (
          <Card
            key={equipe.id}
            className="group relative overflow-hidden rounded-[2.5rem] border-2 hover:border-primary/50 transition-all duration-300 shadow-lg bg-card/50 backdrop-blur-sm"
          >
            <CardHeader className="p-8 pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex gap-2 mb-2">
                    <Badge
                      variant="secondary"
                      className="font-sport italic text-[10px] px-3"
                    >
                      {equipe.categorie || "COMPÉTITION"}
                    </Badge>
                  </div>
                  <CardTitle className="text-3xl font-sport font-black italic uppercase group-hover:text-primary transition-colors">
                    {equipe.nom}
                  </CardTitle>
                </div>
                <div className="h-14 w-14 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all rotate-3 group-hover:rotate-12">
                  <Target size={28} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 pt-0 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">
                    Effectif
                  </p>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <span className="font-sport italic text-xl">
                      {equipe._count?.joueurs || 0} Joueurs
                    </span>
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">
                    Ville
                  </p>
                  <span className="font-sport italic text-xl truncate block">
                    {equipe.ville || "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Lien dynamique vers l'équipe spécifique */}
                <Link
                  href={`/dashboard/clubs/${clubId}/equipes/${equipe.id}`}
                  className="flex-1"
                >
                  <Button className="w-full h-14 rounded-xl font-sport italic text-lg uppercase shadow-lg shadow-primary/20 group/btn">
                    Gérer l'équipe
                    <ChevronRight
                      size={20}
                      className="ml-2 group-hover/btn:translate-x-1 transition-transform"
                    />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
