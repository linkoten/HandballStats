// dashboard/clubs/[clubId]/equipes/[equipeId]/page.tsx
import { getEquipeDetails } from "@/app/actions/equipe-actions";
import { getJoueursByEquipe } from "@/app/actions/joueur-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Settings, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import EquipeContent from "./equipe-content";

export default async function EquipeDetailPage({
  params,
}: {
  params: Promise<{ clubId: string; equipeId: string }>;
}) {
  const { clubId, equipeId } = await params;

  // Récupération parallèle des données
  const [equipeRes, joueursRes] = await Promise.all([
    getEquipeDetails(equipeId),
    getJoueursByEquipe(equipeId),
  ]);

  if (!equipeRes.success || !equipeRes.data) {
    redirect(`/dashboard/clubs/${clubId}/equipes`);
  }

  const equipe = equipeRes.data;
  const joueurs = joueursRes.data || [];

  // Récupération dynamique des saisons
  const saisonsSet = new Set<string>();
  equipe.competitions?.forEach((c: any) => {
    if (c.saison) saisonsSet.add(c.saison);
  });
  const saisonsDisplay =
    saisonsSet.size > 0 ? Array.from(saisonsSet).join(" / ") : "SAISON 24/25";

  // Calcul des victoires / nuls / défaites
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let totalMatches = 0;

  // Extraire tous les matchs
  const allMatchs: any[] = [];

  equipe.competitions?.forEach((comp: any) => {
    comp.matchs?.forEach((match: any) => {
      allMatchs.push({ ...match, competition_nom: comp.nom });
      if (match.score_final && match.score_final.includes("-")) {
        const parts = match.score_final
          .split("-")
          .map((p: string) => parseInt(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          totalMatches++;
          // Vérifier si notre équipe est à domicile
          const isRecevant = match.equipe_recevant_id === equipe.id;
          const scoreEquipe = isRecevant ? parts[0] : parts[1];
          const scoreAdverse = isRecevant ? parts[1] : parts[0];

          if (scoreEquipe > scoreAdverse) wins++;
          else if (scoreEquipe < scoreAdverse) losses++;
          else draws++;
        }
      }
    });
  });

  // Trier les matchs par date décroissante pour l'affichage
  allMatchs.sort(
    (a, b) =>
      new Date(b.date_match).getTime() - new Date(a.date_match).getTime(),
  );

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-12 max-w-7xl mx-auto">
      {/* Retour et Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link href={`/dashboard/clubs/${clubId}/equipes`}>
          <Button variant="ghost" className="font-sport italic uppercase gap-2">
            <ChevronLeft size={16} /> Retour aux équipes
          </Button>
        </Link>
        <Button variant="outline" size="icon" className="rounded-xl w-fit px-3 sm:size-10">
          <Settings size={20} />
        </Button>
      </div>

      {/* Hero Header Équipe */}
      <header className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-b-8 border-primary">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-primary hover:bg-primary font-sport italic px-4 py-1">
                {equipe.ville || "RENNES"}
              </Badge>
              <span className="text-white/50 font-sport italic text-sm">
                {saisonsDisplay}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-sport font-black italic uppercase text-white tracking-tighter leading-none">
              {equipe.nom}
            </h1>
          </div>

          <div className="flex flex-wrap gap-4 md:gap-8 items-center bg-white/5 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
            <div className="text-center px-4">
              <p className="text-primary font-sport italic text-3xl md:text-4xl font-black leading-none">
                {equipe._count.joueurs}
              </p>
              <p className="text-white/40 text-[10px] md:text-xs uppercase font-bold tracking-widest mt-1">
                Licenciés
              </p>
            </div>
            <div className="h-12 w-[2px] bg-white/10" />
            <div className="text-center px-4">
              <p className="text-secondary font-sport italic text-3xl md:text-4xl font-black leading-none">
                {equipe._count.competitions}
              </p>
              <p className="text-white/40 text-[10px] md:text-xs uppercase font-bold tracking-widest mt-1">
                Compétitions
              </p>
            </div>
          </div>
        </div>

        {/* Background Decor */}
        <Users className="absolute -right-10 -bottom-10 text-white/5 w-64 h-64 rotate-12 pointer-events-none" />
      </header>

      {/* Statistiques Globales (Victoires / Nuls / Défaites) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-[2rem] border-2 bg-slate-900 border-slate-800 text-white shadow-md">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">
              Matchs Joués
            </p>
            <p className="font-sport italic text-5xl font-black">
              {totalMatches}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-2 border-emerald-500/20 bg-emerald-50 shadow-md dark:bg-emerald-500/10">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
            <p className="text-emerald-700/80 dark:text-emerald-400/80 text-xs font-bold uppercase tracking-widest mb-2">
              Victoires
            </p>
            <p className="font-sport italic text-5xl font-black text-emerald-600 dark:text-emerald-500">
              {wins}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-2 border-slate-500/20 bg-slate-50 shadow-md dark:bg-slate-800">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
            <p className="text-slate-600/80 dark:text-slate-400/80 text-xs font-bold uppercase tracking-widest mb-2">
              Nuls
            </p>
            <p className="font-sport italic text-5xl font-black text-slate-700 dark:text-slate-300">
              {draws}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-2 border-rose-500/20 bg-rose-50 shadow-md dark:bg-rose-500/10">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
            <p className="text-rose-700/80 dark:text-rose-400/80 text-xs font-bold uppercase tracking-widest mb-2">
              Défaites
            </p>
            <p className="font-sport italic text-5xl font-black text-rose-600 dark:text-rose-500">
              {losses}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Grid pour Effectif et Matchs (Component Client avec Recherche) */}
      <EquipeContent
        clubId={clubId}
        equipe={equipe}
        joueurs={joueurs}
        allMatchs={allMatchs}
      />
    </div>
  );
}
