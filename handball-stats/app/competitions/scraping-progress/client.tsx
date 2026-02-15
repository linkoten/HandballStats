"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowLeft,
  Trophy,
  Database,
  Clock,
} from "lucide-react";
import { getScrapingStatus } from "@/app/actions";
import { toast } from "sonner";

interface Competition {
  id: number;
  nom: string;
  scrapingStatus: string;
  equipe: string;
  saison: string;
  progress?: number;
}

interface ScrapingProgressClientProps {
  competitionIds: string;
}

export default function ScrapingProgressClient({
  competitionIds,
}: ScrapingProgressClientProps) {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // États de suivi
  const [globalProgress, setGlobalProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Fonction pour récupérer le statut
  const fetchScrapingStatus = async () => {
    try {
      setLoading(true);
      const result = await getScrapingStatus(competitionIds);

      if (result.success && result.data) {
        const comps = result.data.competitions;
        setCompetitions(comps);
        setTotalCount(comps.length);

        // Calcul du progress global basé sur la moyenne des progress individuels
        const completed = comps.filter(
          (c) => c.scrapingStatus === "COMPLETED",
        ).length;
        
        // Moyenne des progress individuels pour un suivi en temps réel
        const totalProgress = comps.reduce((sum, comp) => sum + (comp.progress || 0), 0);
        const globalProg = comps.length > 0 ? Math.round(totalProgress / comps.length) : 0;

        setCompletedCount(completed);
        setGlobalProgress(Math.round(globalProg));

        setError(null);
      } else {
        setError(result.error || "Erreur lors de la récupération du statut");
      }
    } catch (err) {
      console.error("Erreur fetch status:", err);
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir l'icône du statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "IN_PROGRESS":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "ERROR":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  // Fonction pour obtenir le badge du statut
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary">En attente</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="default">En cours</Badge>;
      case "COMPLETED":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Terminé
          </Badge>
        );
      case "ERROR":
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  // Rechargement périodique
  useEffect(() => {
    fetchScrapingStatus();

    // Recharger toutes les 3 secondes tant que ce n'est pas terminé
    const interval = setInterval(() => {
      if (completedCount < totalCount) {
        fetchScrapingStatus();
        setRefreshCount((prev) => prev + 1);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [competitionIds, completedCount, totalCount]);

  // Notification de fin
  useEffect(() => {
    if (
      completedCount > 0 &&
      completedCount === totalCount &&
      refreshCount > 0
    ) {
      toast.success(
        `🎉 Scraping terminé ! ${completedCount} compétition(s) récupérée(s)`,
      );
    }
  }, [completedCount, totalCount, refreshCount]);

  const allCompleted = completedCount === totalCount && totalCount > 0;
  const hasErrors = competitions.some((c) => c.scrapingStatus === "ERROR");

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-20 text-8xl">
            🏆
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <h1 className="text-4xl font-bold mb-2">📊 Suivi du Scraping</h1>
              <p className="text-white/80 text-lg">
                Récupération des données de vos compétitions en cours...
              </p>
            </div>
            <Button
              onClick={() => router.push("/dashboard")}
              variant="secondary"
              size="sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Progress global */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Progression Globale
                </CardTitle>
                <CardDescription>
                  {completedCount} / {totalCount} compétitions terminées
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {globalProgress}%
                </div>
                {allCompleted && (
                  <div className="text-sm text-green-600 font-medium">
                    ✅ Terminé !
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={globalProgress} className="h-3" />
            {hasErrors && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Certaines compétitions ont rencontré des erreurs
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des compétitions */}
        <div className="grid gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Détails par Compétition
          </h2>

          {loading && competitions.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-3" />
                <span>Chargement du statut...</span>
              </CardContent>
            </Card>
          ) : error && competitions.length === 0 ? (
            <Card>
              <CardContent className="text-center p-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-600 mb-2">
                  Erreur
                </h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchScrapingStatus}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          ) : (
            competitions.map((competition) => (
              <Card key={competition.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{competition.nom}</h3>
                        {getStatusBadge(competition.scrapingStatus)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>🏃‍♂️ {competition.equipe}</span>
                        <span>📅 {competition.saison}</span>
                        <span>🆔 ID: {competition.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(competition.scrapingStatus)}
                      <span className="text-2xl font-bold text-primary">
                        {competition.progress || 0}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progression</span>
                      <span>{competition.progress || 0}%</span>
                    </div>
                    <Progress
                      value={competition.progress || 0}
                      className={`h-2 ${
                        competition.scrapingStatus === "ERROR"
                          ? "bg-red-100"
                          : competition.scrapingStatus === "COMPLETED"
                            ? "bg-green-100"
                            : "bg-blue-100"
                      }`}
                    />
                  </div>

                  {competition.scrapingStatus === "ERROR" && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      ❌ Une erreur est survenue lors du téléchargement
                    </div>
                  )}

                  {competition.scrapingStatus === "COMPLETED" && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      ✅ Données récupérées avec succès !
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Actions */}
        {allCompleted && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="text-center p-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-700 mb-2">
                🎉 Scraping Terminé !
              </h3>
              <p className="text-green-600 mb-6">
                Toutes vos compétitions ont été configurées avec succès. Vous
                pouvez maintenant accéder à vos données depuis le tableau de
                bord.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => router.push("/dashboard")} size="lg">
                  🏠 Aller au Dashboard
                </Button>
                <Button
                  onClick={() => router.push("/competitions")}
                  variant="outline"
                  size="lg"
                >
                  📊 Voir les Compétitions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rafraîchissement manuel */}
        <div className="flex justify-center">
          <Button
            onClick={fetchScrapingStatus}
            variant="outline"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Actualiser le statut
          </Button>
        </div>
      </div>
    </div>
  );
}
