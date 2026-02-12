"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

// Types adaptés pour le suivi du rescraping d'une équipe

type CompetitionProgress = {
  id: number;
  nom: string;
  saison: string;
  progress: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  currentStep: string;
  matchsTotal: number;
  matchsProcessed: number;
  matchsWithStats: number;
  error?: string | null;
};

type UpdateStatus = {
  globalStatus: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  globalProgress: number;
  currentStep: string;
  competitions: CompetitionProgress[];
  summary: {
    totalMatches: number;
    processedMatches: number;
    matchesWithStats: number;
    totalCompetitions: number;
    completedCompetitions: number;
  };
  error?: string | null;
};

export default function SuiviUpdateEquipePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-pink-900/10">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    }>
      <SuiviUpdateEquipePageContent />
    </Suspense>
  );
}

function SuiviUpdateEquipePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const equipeId = searchParams.get("equipeId");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    if (!equipeId) {
      setLoading(false);
      return;
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000); // Plus fréquent pour un meilleur feedback
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [equipeId]);

  async function fetchStatus() {
    if (!equipeId) return;
    try {
      const response = await fetch(
        `/api/equipes/update-status?equipeId=${equipeId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setLoading(false);
        if (data.globalStatus === "COMPLETED") {
          // Redirection automatique vers le dashboard après 3 secondes
          setTimeout(() => {
            router.push("/dashboard");
          }, 3000);
        }
      }
    } catch (error) {
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

  if (!equipeId || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Aucune mise à jour en cours</CardTitle>
            <CardDescription>
              Lancez une mise à jour depuis la page de l'équipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/equipes")} className="w-full">
              Retour aux équipes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mise à jour de l'équipe</h1>
            <p className="text-muted-foreground">
              Suivi du rescraping incrémental de l'équipe #{equipeId}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/equipes/${equipeId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'équipe
          </Button>
        </div>

        {/* Progression globale */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Progression globale</CardTitle>
              <Badge
                variant={
                  status.globalStatus === "COMPLETED"
                    ? "default"
                    : status.globalStatus === "IN_PROGRESS"
                      ? "secondary"
                      : status.globalStatus === "FAILED"
                        ? "destructive"
                        : "outline"
                }
              >
                {status.globalStatus === "IN_PROGRESS"
                  ? "EN COURS"
                  : status.globalStatus === "COMPLETED"
                    ? "TERMINÉ"
                    : status.globalStatus === "FAILED"
                      ? "ÉCHEC"
                      : "ATTENTE"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {status.summary.processedMatches} /{" "}
                  {status.summary.totalMatches} matchs traités
                </span>
                <span className="text-sm text-muted-foreground">
                  {status.globalProgress}%
                </span>
              </div>
              <Progress value={status.globalProgress} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-primary">
                  {status.summary.totalCompetitions}
                </div>
                <div className="text-xs text-muted-foreground">
                  Compétitions
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-green-600">
                  {status.summary.matchesWithStats}
                </div>
                <div className="text-xs text-muted-foreground">Avec stats</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-muted-foreground">
                  {status.summary.completedCompetitions}
                </div>
                <div className="text-xs text-muted-foreground">Terminées</div>
              </div>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-primary italic animate-pulse">
                {status.currentStep || "Traitement..."}
              </span>
            </div>
            {status.error && (
              <div className="mt-2 text-sm text-destructive">
                Erreur: {status.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Détails par compétition */}
        {status.competitions.length > 0 && (
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
              {status.competitions.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {comp.status === "COMPLETED" && (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        )}
                        {comp.status === "IN_PROGRESS" && (
                          <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                        )}
                        {comp.status === "PENDING" && (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                        )}
                        {comp.status === "FAILED" && (
                          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        )}
                        <div>
                          <h3 className="font-semibold">{comp.nom}</h3>
                          <p className="text-sm text-muted-foreground">
                            {comp.saison}
                          </p>
                        </div>
                      </div>

                      {comp.matchsTotal > 0 && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium text-primary">
                            {comp.matchsWithStats} / {comp.matchsTotal}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            matchs avec stats
                          </span>
                        </div>
                      )}

                      {/* Barre de progression par compétition */}
                      {comp.status === "IN_PROGRESS" && (
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-primary italic animate-pulse">
                              {comp.currentStep || "Traitement..."}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {comp.progress}%
                            </span>
                          </div>
                          <Progress value={comp.progress} className="h-1.5" />
                        </div>
                      )}

                      {comp.error && (
                        <div className="mt-2 text-sm text-destructive">
                          Erreur: {comp.error}
                        </div>
                      )}
                    </div>

                    <Badge
                      variant={
                        comp.status === "COMPLETED"
                          ? "default"
                          : comp.status === "IN_PROGRESS"
                            ? "secondary"
                            : comp.status === "FAILED"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {comp.status === "IN_PROGRESS"
                        ? "EN COURS"
                        : comp.status === "COMPLETED"
                          ? "TERMINÉ"
                          : comp.status === "FAILED"
                            ? "ÉCHEC"
                            : "ATTENTE"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {status.globalStatus === "COMPLETED" && (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center justify-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  Mise à jour terminée ! Redirection vers le dashboard dans 3
                  secondes...
                </span>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push("/dashboard")} size="lg">
                Aller au dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/equipes/${equipeId}`)}
                size="lg"
              >
                Voir l'équipe
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
