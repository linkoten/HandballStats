// app/matchs/page.tsx - Page listant tous les matchs

import Link from "next/link";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function MatchsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Récupérer l'utilisateur
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    redirect("/sign-in");
  }

  // Récupérer les compétitions auxquelles l'utilisateur a accès
  const competitionAccess = await prisma.competitionAccess.findMany({
    where: { userId: user.id },
    select: { competitionId: true },
  });

  const competitionIds = competitionAccess.map((access) => access.competitionId);

  // Filtrer les matchs uniquement pour les compétitions accessibles
  const matchs = await prisma.matchs.findMany({
    where: {
      competitionId: {
        in: competitionIds,
      },
    },
    include: {
      equipes_matchs_equipe_recevant_idToequipes: {
        select: { id: true, nom: true, ville: true },
      },
      equipes_matchs_equipe_exterieur_idToequipes: {
        select: { id: true, nom: true, ville: true },
      },
      competition: {
        select: { id: true, nom: true, saison: true },
      },
    },
    orderBy: {
      date_match: "desc",
    },
    take: 50,
  });

  // Grouper par compétition
  const matchsParCompetition = matchs.reduce((acc, match) => {
    const comp = match.competition_name || "Non défini";
    if (!acc[comp]) acc[comp] = [];
    acc[comp].push(match);
    return acc;
  }, {} as Record<string, typeof matchs>);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10 animate-in fade-in slide-in-from-top-5 duration-500">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-sport uppercase text-sm tracking-wide mb-6 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">
              ←
            </span>
            Retour à l'accueil
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-secondary/10 rounded-full">
              <span className="text-3xl">🏆</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-sport font-extrabold uppercase tracking-tighter text-foreground">
                <span className="text-secondary">Matchs</span>
              </h1>
              <p className="text-muted-foreground mt-2 font-medium">
                <span className="font-bold text-secondary">
                  {matchs.length}
                </span>{" "}
                matchs enregistrés
              </p>
            </div>
          </div>
        </div>

        {/* Matchs par compétition */}
        <div className="space-y-12">
          {Object.entries(matchsParCompetition).map(
            ([competition, matchsComp]) => (
              <div
                key={competition}
                className="bg-card/40 backdrop-blur-sm rounded-lg shadow-sm border border-border p-6"
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
                  <div className="text-2xl">🏅</div>
                  <div>
                    <h2 className="text-xl font-sport uppercase tracking-wide text-foreground">
                      {competition}
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {matchsComp.length} match{matchsComp.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {matchsComp.map((match) => (
                    <Link
                      key={match.id}
                      href={`/matchs/${match.id}`}
                      className="group block relative p-5 bg-card hover:bg-card/80 border-l-4 border-l-secondary/50 hover:border-l-secondary rounded-r-lg shadow-sm hover:shadow-md transition-all duration-300 hover:translate-x-1"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          {/* Noms des équipes */}
                          <div className="flex items-center gap-4 mb-3">
                            <span className="text-lg font-sport uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                              {match.equipes_matchs_equipe_recevant_idToequipes?.nom || match.recevant_nom_display || "Équipe inconnue"}
                            </span>
                            <span className="text-muted-foreground font-black text-xs px-2 py-1 bg-muted rounded-sm">VS</span>
                            <span className="text-lg font-sport uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                              {match.equipes_matchs_equipe_exterieur_idToequipes?.nom || match.exterieur_nom_display || "Équipe inconnue"}
                            </span>
                          </div>
                          
                          {/* Score */}
                          <div className="flex items-center gap-3 mb-2">
                             <div className="font-mono font-bold text-2xl text-foreground tracking-widest group-hover:text-secondary transition-colors">
                              {match.score_final || "- -"}
                            </div>
                          </div>
                          
                          {/* Date */}
                          {match.date_match && (
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              <span>📅</span>
                              <span>
                                {new Date(match.date_match).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                              <span className="text-border">
                                •
                              </span>
                              <span>
                                {new Date(match.date_match).toLocaleTimeString(
                                  "fr-FR",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          {match.pdf_url && (
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
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
