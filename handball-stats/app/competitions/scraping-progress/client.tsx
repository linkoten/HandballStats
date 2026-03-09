"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Trophy,
  Zap,
  ArrowRight,
  RotateCcw,
  Clock,
  Database,
  AlertTriangle,
} from "lucide-react";
import {
  getScrapingStatus,
  consumeTokenOnSuccess,
} from "@/app/actions/scraping-actions";
import type { CompetitionStatus } from "@/app/actions/scraping-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScrapingProgressClientProps {
  competitionIds: number[];
}

const POLL_INTERVAL = 3000; // 3 secondes

type GlobalStatus = "loading" | "in_progress" | "all_done" | "partial_error";

function getGlobalStatus(competitions: CompetitionStatus[]): GlobalStatus {
  if (competitions.length === 0) return "loading";
  const allDone = competitions.every(
    (c) => c.scrapingStatus === "COMPLETED" || c.scrapingStatus === "FAILED",
  );
  if (!allDone) return "in_progress";
  const hasFailed = competitions.some((c) => c.scrapingStatus === "FAILED");
  return hasFailed ? "partial_error" : "all_done";
}

function StatusIcon({
  status,
  size = 24,
}: {
  status: CompetitionStatus["scrapingStatus"];
  size?: number;
}) {
  if (status === "COMPLETED")
    return <CheckCircle2 size={size} className="text-emerald-400 shrink-0" />;
  if (status === "FAILED")
    return <XCircle size={size} className="text-red-400 shrink-0" />;
  if (status === "IN_PROGRESS")
    return (
      <Loader2 size={size} className="text-secondary animate-spin shrink-0" />
    );
  return <Clock size={size} className="text-white/30 shrink-0" />;
}

function ProgressBar({
  progress,
  status,
}: {
  progress: number;
  status: CompetitionStatus["scrapingStatus"];
}) {
  const colorClass =
    status === "COMPLETED"
      ? "bg-emerald-400"
      : status === "FAILED"
        ? "bg-red-400"
        : status === "IN_PROGRESS"
          ? "bg-secondary"
          : "bg-white/20";

  return (
    <div className="relative h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
          colorClass,
          status === "IN_PROGRESS" && progress < 100 && "animate-pulse",
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function ScrapingProgressClient({
  competitionIds,
}: ScrapingProgressClientProps) {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<CompetitionStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const consumedRef = useRef<Set<number>>(new Set());
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  const fetchStatus = useCallback(async () => {
    const res = await getScrapingStatus(competitionIds);
    if (!isMounted.current) return;

    if (!res.success || !res.data) {
      toast.error("Erreur lors de la récupération du statut");
      return;
    }

    setCompetitions(res.data);
    setIsLoading(false);

    // Consommer les tokens pour les compétitions nouvellement complétées
    for (const comp of res.data) {
      if (
        comp.scrapingStatus === "COMPLETED" &&
        !comp.tokenConsumed &&
        !consumedRef.current.has(comp.id)
      ) {
        consumedRef.current.add(comp.id); // optimistic pour éviter les appels doubles
        const tokenRes = await consumeTokenOnSuccess(comp.id);
        if (tokenRes.success) {
          toast.success(`Token consommé pour "${comp.nom}"`, {
            description: "Scraping complété avec succès 🎉",
            icon: <Zap size={16} className="text-secondary" />,
          });
        } else if (tokenRes.error && tokenRes.error !== "Tokens insuffisants") {
          consumedRef.current.delete(comp.id); // retry possible
        }
      }
    }
  }, [competitionIds]);

  useEffect(() => {
    isMounted.current = true;
    fetchStatus();

    pollRef.current = setInterval(async () => {
      const res = await getScrapingStatus(competitionIds);
      if (!isMounted.current) return;
      if (!res.success || !res.data) return;

      setCompetitions(res.data);

      // Consommer tokens pour nouvelles complétions
      for (const comp of res.data) {
        if (
          comp.scrapingStatus === "COMPLETED" &&
          !comp.tokenConsumed &&
          !consumedRef.current.has(comp.id)
        ) {
          consumedRef.current.add(comp.id);
          const tokenRes = await consumeTokenOnSuccess(comp.id);
          if (tokenRes.success) {
            toast.success(`Token consommé pour "${comp.nom}"`, {
              description: "Scraping complété avec succès 🎉",
              icon: <Zap size={16} className="text-secondary" />,
            });
          } else {
            consumedRef.current.delete(comp.id);
          }
        }
      }

      // Arrêter le polling si tout est terminé
      const allDone = res.data.every(
        (c) =>
          c.scrapingStatus === "COMPLETED" || c.scrapingStatus === "FAILED",
      );
      if (allDone && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, POLL_INTERVAL);

    return () => {
      isMounted.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus, competitionIds]);

  const globalStatus = getGlobalStatus(competitions);
  const completedCount = competitions.filter(
    (c) => c.scrapingStatus === "COMPLETED",
  ).length;
  const failedCount = competitions.filter(
    (c) => c.scrapingStatus === "FAILED",
  ).length;
  const totalProgress =
    competitions.length > 0
      ? Math.round(
          competitions.reduce((acc, c) => acc + c.scrapingProgress, 0) /
            competitions.length,
        )
      : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative overflow-hidden bg-primary rounded-b-[3rem] p-8 md:p-16 shadow-2xl border-b-8 border-secondary/50">
        <div className="absolute top-0 right-0 p-4 opacity-10 font-sport text-9xl italic uppercase pointer-events-none select-none">
          Sync
        </div>

        {/* Animated grid overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center gap-3 text-secondary font-sport italic animate-in slide-in-from-left duration-500 mb-4">
            <Zap size={20} className="fill-current" />
            <span className="text-sm uppercase tracking-widest">
              Synchronisation en cours
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-sport font-black italic uppercase text-white tracking-tighter leading-none mb-6">
            Récupération des{" "}
            <span className="text-secondary">Statistiques</span>
          </h1>

          {/* Global progress */}
          {!isLoading && (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
                    Progression globale
                  </span>
                  <Badge
                    className={cn(
                      "font-sport italic text-sm",
                      globalStatus === "all_done"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : globalStatus === "partial_error"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-secondary/20 text-secondary border-secondary/30",
                    )}
                  >
                    {globalStatus === "all_done" && "✓ Terminé"}
                    {globalStatus === "partial_error" &&
                      `${completedCount}/${competitions.length} OK`}
                    {globalStatus === "in_progress" && "En cours…"}
                    {globalStatus === "loading" && "Chargement…"}
                  </Badge>
                </div>
                <span className="text-5xl font-sport font-black italic text-white/90">
                  {totalProgress}%
                </span>
              </div>

              {/* Big progress bar */}
              <div className="relative h-3 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out",
                    globalStatus === "all_done"
                      ? "bg-emerald-400"
                      : globalStatus === "partial_error"
                        ? "bg-orange-400"
                        : "bg-secondary",
                  )}
                  style={{ width: `${totalProgress}%` }}
                />
                {globalStatus === "in_progress" && (
                  <div
                    className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"
                    style={{ left: `${Math.max(0, totalProgress - 10)}%` }}
                  />
                )}
              </div>

              <div className="flex gap-6 text-xs font-bold uppercase tracking-widest text-white/50">
                <span>
                  <span className="text-emerald-400">{completedCount}</span>{" "}
                  complétées
                </span>
                {failedCount > 0 && (
                  <span>
                    <span className="text-red-400">{failedCount}</span> échouées
                  </span>
                )}
                <span>
                  <span className="text-white/80">{competitions.length}</span>{" "}
                  total
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Competition cards */}
      <div className="max-w-5xl mx-auto px-4 -mt-6 pb-20 space-y-4 relative z-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={48} className="text-primary animate-spin" />
            <p className="text-muted-foreground font-bold uppercase text-sm tracking-widest">
              Connexion au serveur…
            </p>
          </div>
        ) : (
          <>
            {competitions.map((comp, index) => (
              <div
                key={comp.id}
                className={cn(
                  "rounded-[2rem] border-2 overflow-hidden transition-all duration-500",
                  "bg-card shadow-lg",
                  comp.scrapingStatus === "COMPLETED" &&
                    "border-emerald-500/30 shadow-emerald-500/5",
                  comp.scrapingStatus === "FAILED" &&
                    "border-red-500/30 shadow-red-500/5",
                  comp.scrapingStatus === "IN_PROGRESS" &&
                    "border-secondary/30 shadow-secondary/5",
                  comp.scrapingStatus === "PENDING" && "border-border",
                )}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Top accent line */}
                <div
                  className={cn(
                    "h-1 w-full",
                    comp.scrapingStatus === "COMPLETED" && "bg-emerald-400",
                    comp.scrapingStatus === "FAILED" && "bg-red-400",
                    comp.scrapingStatus === "IN_PROGRESS" && "bg-secondary",
                    comp.scrapingStatus === "PENDING" && "bg-white/10",
                  )}
                />

                <div className="p-6 md:p-8 space-y-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {comp.equipe?.club && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {comp.equipe.club.nom}
                          </span>
                        )}
                        {comp.equipe?.club && comp.equipe && (
                          <span className="text-muted-foreground/40 text-[10px]">
                            /
                          </span>
                        )}
                        {comp.equipe && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {comp.equipe.nom}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl md:text-2xl font-sport font-black italic uppercase leading-tight text-foreground truncate">
                        {comp.nom}
                      </h2>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-black uppercase"
                      >
                        Saison {comp.saison}
                      </Badge>
                    </div>

                    <StatusIcon status={comp.scrapingStatus} size={32} />
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {comp.scrapingStatus === "PENDING" && "En attente"}
                        {comp.scrapingStatus === "IN_PROGRESS" &&
                          (comp.scrapingStep || "Traitement en cours…")}
                        {comp.scrapingStatus === "COMPLETED" &&
                          "Synchronisation terminée"}
                        {comp.scrapingStatus === "FAILED" &&
                          "Échec du scraping"}
                      </span>
                      <span className="text-sm font-sport font-black italic text-foreground">
                        {comp.scrapingProgress}%
                      </span>
                    </div>
                    <ProgressBar
                      progress={comp.scrapingProgress}
                      status={comp.scrapingStatus}
                    />
                  </div>

                  {/* Error message */}
                  {comp.scrapingStatus === "FAILED" && comp.scrapingError && (
                    <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                      <AlertTriangle
                        size={16}
                        className="text-red-400 mt-0.5 shrink-0"
                      />
                      <p className="text-xs text-red-400 font-medium">
                        {comp.scrapingError}
                      </p>
                    </div>
                  )}

                  {/* Success token badge */}
                  {comp.scrapingStatus === "COMPLETED" && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
                        <Database size={12} className="text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                          {comp.tokenConsumed ||
                          consumedRef.current.has(comp.id)
                            ? "1 Token consommé"
                            : "Finalisation…"}
                        </span>
                      </div>
                      {comp.lastScrapedAt && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {new Date(comp.lastScrapedAt).toLocaleTimeString(
                            "fr-FR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* CTA finale */}
            {(globalStatus === "all_done" ||
              globalStatus === "partial_error") && (
              <div className="rounded-[2rem] bg-primary border-2 border-secondary/30 p-8 md:p-10 text-white space-y-6 shadow-2xl">
                <div className="flex items-start gap-4">
                  {globalStatus === "all_done" ? (
                    <CheckCircle2
                      size={40}
                      className="text-emerald-400 shrink-0 mt-1"
                    />
                  ) : (
                    <AlertTriangle
                      size={40}
                      className="text-orange-400 shrink-0 mt-1"
                    />
                  )}
                  <div>
                    <p className="text-secondary font-sport italic text-xs uppercase tracking-widest mb-1">
                      {globalStatus === "all_done"
                        ? "Mission accomplie"
                        : "Synchronisation partielle"}
                    </p>
                    <h3 className="text-3xl md:text-4xl font-sport font-black italic uppercase leading-none">
                      {globalStatus === "all_done" ? (
                        <>
                          Données{" "}
                          <span className="text-secondary">synchronisées</span>
                        </>
                      ) : (
                        <>
                          {completedCount} sur{" "}
                          <span className="text-secondary">
                            {competitions.length}
                          </span>{" "}
                          OK
                        </>
                      )}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => router.push("/competitions")}
                    className="flex-1 h-14 bg-secondary text-black hover:bg-white rounded-2xl font-sport italic text-lg uppercase shadow-xl group"
                  >
                    Voir mes compétitions{" "}
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  {globalStatus === "partial_error" && (
                    <Button
                      onClick={() => router.push("/competitions/create")}
                      variant="ghost"
                      className="flex-1 h-14 border-2 border-white/20 text-white hover:bg-white/10 rounded-2xl font-sport italic text-lg uppercase"
                    >
                      <RotateCcw className="mr-2" size={18} />
                      Reconfigurer
                    </Button>
                  )}

                  <Button
                    onClick={() => router.push("/dashboard")}
                    variant="ghost"
                    className="flex-1 h-14 border-2 border-white/20 text-white hover:bg-white/10 rounded-2xl font-sport italic text-lg uppercase"
                  >
                    Dashboard
                  </Button>
                </div>
              </div>
            )}

            {/* Avertissement pendant le scraping */}
            {globalStatus === "in_progress" && (
              <div className="rounded-2xl bg-secondary/10 border border-secondary/20 px-6 py-4 flex items-center gap-3">
                <Loader2
                  size={16}
                  className="text-secondary animate-spin shrink-0"
                />
                <p className="text-sm font-medium text-foreground/70">
                  Récupération en cours, ne fermez pas cette page. Cette
                  opération peut prendre quelques minutes.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(500%);
          }
        }
      `}</style>
    </div>
  );
}
