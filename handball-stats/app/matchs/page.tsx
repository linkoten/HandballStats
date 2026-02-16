// app/matchs/page.tsx - Page listant tous les matchs

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserProfile, getMatchsByUser } from "@/app/actions";

type Match = {
  id: number;
  competition?: { nom?: string } | null;
  equipes_matchs_equipe_recevant_idToequipes?: { nom?: string } | null;
  equipes_matchs_equipe_exterieur_idToequipes?: { nom?: string } | null;
  score_recevant?: number | null;
  score_exterieur?: number | null;
  date_match?: string | Date | null;
  pdf_url?: string | null;
};
import { Badge } from "@/components/ui/badge";

export default async function MatchsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Récupérer le profil utilisateur via Server Action
  const userResult = await getUserProfile();
  if (!userResult.success || !userResult.data) {
    redirect("/sign-in");
  }

  // Récupérer les matchs via Server Action
  const matchsResult = await getMatchsByUser();
  const matchs: Match[] = matchsResult.success ? matchsResult.data : [];

  return (
    <div className="container mx-auto py-8">
      <div className="bg-background rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Liste des matchs</h1>
        <div className="space-y-4">
          {matchs.length === 0 ? (
            <div className="text-center text-muted-foreground">
              Aucun match trouvé.
            </div>
          ) : (
            matchs.map((m) => (
              <Link
                key={m.id}
                href={`/matchs/${m.id}`}
                className="group block relative p-5 bg-card hover:bg-card/80 border-l-4 border-l-secondary/50 hover:border-l-secondary rounded-r-lg shadow-sm hover:shadow-md transition-all duration-300 hover:translate-x-1"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    {/* Noms des équipes */}
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-lg font-sport uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {m.equipes_matchs_equipe_recevant_idToequipes?.nom ||
                          "Équipe inconnue"}
                      </span>
                      <span className="text-muted-foreground font-black text-xs px-2 py-1 bg-muted rounded-sm">
                        VS
                      </span>
                      <span className="text-lg font-sport uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {m.equipes_matchs_equipe_exterieur_idToequipes?.nom ||
                          "Équipe inconnue"}
                      </span>
                    </div>
                    {/* Score */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-mono font-bold text-2xl text-foreground tracking-widest group-hover:text-secondary transition-colors">
                        {m.score_recevant !== null && m.score_exterieur !== null
                          ? `${m.score_recevant} - ${m.score_exterieur}`
                          : "- -"}
                      </div>
                    </div>
                    {/* Date */}
                    {m.date_match && (
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <span>📅</span>
                        <span>
                          {new Date(m.date_match).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="text-border">•</span>
                        <span>
                          {new Date(m.date_match).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {m.pdf_url && (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-sm">
                        📄 PDF
                      </span>
                    )}
                    <span className="text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
