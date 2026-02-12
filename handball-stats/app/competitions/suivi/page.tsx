"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

type CompetitionStatus = {
  id: number;
  nom: string;
  saison: string;
  phase: string | null;
  equipe: {
    nom: string;
    club: string;
  };
  scrapingStatus: string;
  scrapingProgress: number;
  scrapingStep: string | null;
  scrapingError: string | null;
  lastScrapedAt: Date | null;
  matchsCount: number;
  matchsWithStatsCount: number;
};

type StatusData = {
  globalStatus: string;
  competitions: CompetitionStatus[];
  summary: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    failed: number;
  };
};

export default function SuiviCompetitionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [competitionIds, setCompetitionIds] = useState<number[]>([]);

  useEffect(() => {
    // Récupérer les IDs depuis les query params ou localStorage
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get("ids");

    if (idsParam) {
      const ids = idsParam.split(",").map(Number);
      setCompetitionIds(ids);
      localStorage.setItem("tracking_competitions", JSON.stringify(ids));
    } else {
      const stored = localStorage.getItem("tracking_competitions");
      if (stored) {
        setCompetitionIds(JSON.parse(stored));
      }
    }
  }, []);

  useEffect(() => {
    if (competitionIds.length === 0) {
      setLoading(false);
      return;
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll toutes les 5 secondes

    return () => clearInterval(interval);
  }, [competitionIds]);

  async function fetchStatus() {
    if (competitionIds.length === 0) return;

    try {
      const response = await fetch("/api/competitions/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionIds }),
      });

      if (response.ok) {
        const data = await response.json();
        setStatusData(data);
        setLoading(false);

        // Arrêter le polling si tout est terminé
        if (
          data.globalStatus === "COMPLETED" ||
          (data.summary.inProgress === 0 && data.summary.pending === 0)
        ) {
          localStorage.removeItem("tracking_competitions");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du statut:", error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (competitionIds.length === 0 || !statusData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Aucune compétition à suivre</CardTitle>
            <CardDescription>
              Il n'y a aucune compétition en cours de scraping.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full"
            >
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = Math.round(
    ((statusData.summary.completed + statusData.summary.failed) /
      statusData.summary.total) *
      100
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Suivi du scraping</h1>
            <p className="text-muted-foreground">
              {statusData.summary.total} compétition(s) en cours de traitement
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>

        {/* Progression globale */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Progression globale</CardTitle>
              <Badge
                variant={
                  statusData.globalStatus === "COMPLETED"
                    ? "default"
                    : statusData.globalStatus === "IN_PROGRESS"
                    ? "secondary"
                    : statusData.globalStatus === "FAILED"
                    ? "destructive"
                    : "outline"
                }
              >
                {statusData.globalStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {statusData.summary.completed} / {statusData.summary.total}{" "}
                  compétitions terminées
                </span>
                <span className="text-sm text-muted-foreground">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-green-600">
                  {statusData.summary.completed}
                </div>
                <div className="text-xs text-muted-foreground">Terminées</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-primary">
                  {statusData.summary.inProgress}
                </div>
                <div className="text-xs text-muted-foreground">En cours</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-muted-foreground">
                  {statusData.summary.pending}
                </div>
                <div className="text-xs text-muted-foreground">En attente</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-destructive">
                  {statusData.summary.failed}
                </div>
                <div className="text-xs text-muted-foreground">Échecs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des compétitions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Détails par compétition</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchStatus}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusData.competitions.map((comp) => (
              <div
                key={comp.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {comp.scrapingStatus === "COMPLETED" && (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      )}
                      {comp.scrapingStatus === "IN_PROGRESS" && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                      )}
                      {comp.scrapingStatus === "PENDING" && (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                      )}
                      {comp.scrapingStatus === "FAILED" && (
                        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                      )}
                      <div>
                        <h3 className="font-semibold">
                          {comp.nom} {comp.phase && `(${comp.phase})`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {comp.equipe.nom} · {comp.equipe.club} · {comp.saison}
                        </p>
                      </div>
                    </div>

                    {comp.matchsCount > 0 && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium text-primary">
                          {comp.matchsWithStatsCount} / {comp.matchsCount}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          matchs avec stats
                        </span>
                      </div>
                    )}

                    {/* Barre de progression par compétition */}
                    {comp.scrapingStatus === "IN_PROGRESS" && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-primary italic animate-pulse">
                            {comp.scrapingStep || "Traitement..."}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {comp.scrapingProgress}%
                          </span>
                        </div>
                        <Progress
                          value={comp.scrapingProgress}
                          className="h-1.5"
                        />
                      </div>
                    )}

                    {comp.scrapingError && (
                      <div className="mt-2 text-sm text-destructive">
                        Erreur: {comp.scrapingError}
                      </div>
                    )}
                  </div>

                  <Badge
                    variant={
                      comp.scrapingStatus === "COMPLETED"
                        ? "default"
                        : comp.scrapingStatus === "IN_PROGRESS"
                        ? "secondary"
                        : comp.scrapingStatus === "FAILED"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {comp.scrapingStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {statusData.globalStatus === "COMPLETED" && (
          <div className="text-center">
            <Button onClick={() => router.push("/dashboard")} size="lg">
              Voir mes données
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
