"use client";

import { useState, useTransition } from "react";
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
import { triggerScraping, getCompetitionsStatus } from "@/app/actions";
import { toast } from "sonner";

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

type Props = {
  initialData: StatusData | null;
  competitionIds: number[];
  error?: string;
};

export default function SuiviCompetitionsClient({
  initialData,
  competitionIds,
  error,
}: Props) {
  const router = useRouter();
  const [statusData, setStatusData] = useState<StatusData | null>(initialData);
  const [isPending, startTransition] = useTransition();

  const handleRefreshStatus = () => {
    if (competitionIds.length === 0) return;

    startTransition(async () => {
      try {
        const result = await getCompetitionsStatus(competitionIds);

        if (result.success) {
          setStatusData(result.data);
          toast.success("Statut mis à jour");
        } else {
          toast.error(result.error || "Erreur lors de la mise à jour");
        }
      } catch (error) {
        console.error("Erreur refresh:", error);
        toast.error("Erreur lors de la mise à jour du statut");
      }
    });
  };

  const handleRetriggerScraping = () => {
    if (competitionIds.length === 0) return;

    startTransition(async () => {
      try {
        const result = await triggerScraping(competitionIds);

        if (result.success) {
          toast.success(result.message);
          // Rafraîchir le statut après déclenchement
          setTimeout(() => {
            handleRefreshStatus();
          }, 2000);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error("Erreur retrigger:", error);
        toast.error("Erreur lors du redémarrage du scraping");
      }
    });
  };

  // Gestion des cas d'erreur
  if (error || competitionIds.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>
              {error ? "Erreur" : "Aucune compétition à suivre"}
            </CardTitle>
            <CardDescription>
              {error || "Il n'y a aucune compétition en cours de scraping."}
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

  // Chargement initial
  if (!statusData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "termine":
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100";
      case "en_cours":
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100";
      case "erreur":
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "termine":
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "en_cours":
      case "in_progress":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "erreur":
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Suivi du scraping</h1>
              <p className="text-muted-foreground">
                Progression en temps réel des {statusData.summary.total}{" "}
                compétition(s)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshStatus}
              disabled={isPending}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`}
              />
              Actualiser
            </Button>
            {statusData.summary.failed > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleRetriggerScraping}
                disabled={isPending}
              >
                Relancer le scraping
              </Button>
            )}
          </div>
        </div>

        {/* Résumé global */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(statusData.globalStatus)}
              Statut global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statusData.summary.total}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statusData.summary.completed}
                </div>
                <div className="text-sm text-muted-foreground">Terminées</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {statusData.summary.inProgress}
                </div>
                <div className="text-sm text-muted-foreground">En cours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {statusData.summary.pending}
                </div>
                <div className="text-sm text-muted-foreground">En attente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {statusData.summary.failed}
                </div>
                <div className="text-sm text-muted-foreground">Échouées</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des compétitions */}
        <div className="grid gap-4">
          {statusData.competitions.map((competition) => (
            <Card key={competition.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{competition.nom}</CardTitle>
                    <CardDescription>
                      {competition.equipe.nom} • {competition.equipe.club} •{" "}
                      {competition.saison}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(competition.scrapingStatus)}>
                    {getStatusIcon(competition.scrapingStatus)}
                    <span className="ml-1">
                      {competition.scrapingStatus || "En attente"}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Barre de progression si en cours */}
                  {competition.scrapingStatus === "EN_COURS" && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progression</span>
                        <span>{competition.scrapingProgress}%</span>
                      </div>
                      <Progress value={competition.scrapingProgress} />
                      {competition.scrapingStep && (
                        <p className="text-sm text-muted-foreground">
                          {competition.scrapingStep}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Statistiques */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Matchs trouvés</div>
                      <div className="text-muted-foreground">
                        {competition.matchsCount}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Avec statistiques</div>
                      <div className="text-muted-foreground">
                        {competition.matchsWithStatsCount}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Dernier scraping</div>
                      <div className="text-muted-foreground">
                        {competition.lastScrapedAt
                          ? new Date(competition.lastScrapedAt).toLocaleString(
                              "fr-FR",
                            )
                          : "Jamais"}
                      </div>
                    </div>
                  </div>

                  {/* Message d'erreur si présent */}
                  {competition.scrapingError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                      <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-200">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Erreur:</span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {competition.scrapingError}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
