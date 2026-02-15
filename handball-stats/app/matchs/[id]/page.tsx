// app/matchs/[id]/page.tsx - Page de détails d'un match

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getMatchById, getUserProfile } from "@/app/actions";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const matchId = parseInt(id);

  // Récupérer le profil utilisateur
  const userResult = await getUserProfile();

  if (!userResult.success || !userResult.data) {
    redirect("/sign-in");
  }

  // Récupérer le match via Server Action
  const matchResult = await getMatchById(matchId);

  if (!matchResult.success || !matchResult.data) {
    return <div>Match non trouvé</div>;
  }

  const match = matchResult.data;

  // Vérifier que l'utilisateur a accès à la compétition de ce match
  if (match.competitionId) {
    const userId = userResult.data.id;
    const hasAccess = match.competition?.access?.some?.(
      (a: any) => a.userId === userId,
    );
    if (hasAccess === false) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10 animate-in fade-in slide-in-from-top-5 duration-500">
          <Link
            href="/matchs"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-sport uppercase text-sm tracking-wide mb-6 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">
              ←
            </span>
            Retour aux matchs
          </Link>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-sport font-extrabold uppercase tracking-tighter text-foreground">
              {match.competition?.nom || match.competition_name}
            </h1>
            {match.date_match && (
              <div className="flex items-center gap-2 text-muted-foreground font-medium">
                <span>📅</span>
                <span className="uppercase tracking-wide text-sm">
                  {new Date(match.date_match).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="bg-card/40 backdrop-blur-md rounded-xl shadow-lg border border-border/50 p-8 mb-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-secondary/5 opacity-50 group-hover:opacity-70 transition-opacity" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center relative z-10">
            {/* Domicile */}
            <div className="flex flex-col items-center">
              <Link
                href={`/equipes/${match.equipes_matchs_equipe_recevant_idToequipes?.id}`}
                className="text-2xl md:text-3xl font-sport uppercase tracking-tight text-foreground hover:text-primary transition-colors mb-2"
              >
                {match.equipes_matchs_equipe_recevant_idToequipes?.nom ||
                  match.recevant_nom_display}
              </Link>
              <span className="text-xs font-bold uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full">
                Domicile
              </span>
            </div>

            {/* Score Display */}
            <div className="py-4 md:py-0">
              <div className="text-6xl md:text-8xl font-mono font-black tracking-tighter text-foreground tabular-nums drop-shadow-sm">
                {match.score_final && match.score_final.includes("-")
                  ? match.score_final.replace(/-/g, " - ")
                  : match.score_final || "- -"}
              </div>
            </div>

            {/* Extérieur */}
            <div className="flex flex-col items-center">
              <Link
                href={`/equipes/${match.equipes_matchs_equipe_exterieur_idToequipes?.id}`}
                className="text-2xl md:text-3xl font-sport uppercase tracking-tight text-foreground hover:text-secondary transition-colors mb-2"
              >
                {match.equipes_matchs_equipe_exterieur_idToequipes?.nom ||
                  match.exterieur_nom_display}
              </Link>
              <span className="text-xs font-bold uppercase tracking-widest bg-secondary/10 text-secondary px-3 py-1 rounded-full">
                Extérieur
              </span>
            </div>
          </div>

          {/* Arbitres & Metadata */}
          <div className="mt-8 pt-6 border-t border-border/50 flex flex-wrap justify-center gap-6 relative z-10">
            {(match.arbitre_1 || match.arbitre_2) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 px-4 py-2 rounded-lg backdrop-blur-sm">
                <span className="text-lg">👨‍⚖️</span>
                <span className="font-medium">
                  {match.arbitre_1 || "N/A"}
                  {match.arbitre_2 &&
                    match.arbitre_2 !== "Aucun/non défini" &&
                    `, ${match.arbitre_2}`}
                </span>
              </div>
            )}

            {match.pdf_url && (
              <a
                href={match.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-sport uppercase tracking-wide text-xs transition-transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
              >
                <span>📄</span>
                Télécharger la feuille de match
              </a>
            )}
          </div>
        </div>

        {/* Statistiques */}
        {match.statistiques_joueur && match.statistiques_joueur.length > 0 && (
          <div className="bg-card/40 backdrop-blur-md rounded-xl shadow-lg border border-border/50 overflow-hidden">
            <div className="p-6 border-b border-border/50 bg-muted/20">
              <h2 className="text-2xl font-sport font-bold uppercase tracking-wide text-foreground flex items-center gap-3">
                <span className="text-secondary text-3xl">📊</span>
                Statistiques des Joueurs
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="text-left p-4">N°</th>
                    <th className="text-left p-4">Joueur</th>
                    <th className="text-center p-4">Buts</th>
                    <th className="text-center p-4">7m</th>
                    <th className="text-center p-4">Tirs</th>
                    <th className="text-center p-4">Arrêts</th>
                    <th className="text-center p-4">Av.</th>
                    <th className="text-center p-4">2'</th>
                  </tr>
                </thead>
                <tbody>
                  {match.statistiques_joueur.map((stat: any) => (
                    <tr
                      key={stat.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="p-2 text-gray-900 dark:text-white">
                        {stat.joueurs?.num_maillot || "-"}
                      </td>
                      <td className="p-2 text-gray-900 dark:text-white font-medium">
                        {stat.joueurs?.nom_prenom}
                      </td>
                      <td className="text-center p-2 text-gray-900 dark:text-white font-semibold">
                        {stat.buts}
                      </td>
                      <td className="text-center p-2 text-gray-900 dark:text-white">
                        {stat.sept_metres}
                      </td>
                      <td className="text-center p-2 text-gray-900 dark:text-white">
                        {stat.tirs}
                      </td>
                      <td className="text-center p-2 text-gray-900 dark:text-white">
                        {stat.arrets}
                      </td>
                      <td className="text-center p-2 text-gray-900 dark:text-white">
                        {stat.avertissements}
                      </td>
                      <td className="text-center p-2 text-gray-900 dark:text-white">
                        {stat.exclusions_2min}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
