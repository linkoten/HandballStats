"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

type Competition = {
  id: number;
  nom: string;
  saison: string;
  phase: string | null;
  equipe: string;
  club: string;
  scrapingStatus: string;
  scrapingError: string | null;
  lastScrapedAt: string | null;
  matchsCount: number;
  createdAt: string;
};

export default function DebugCompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<{ [key: number]: string }>({});
  const [loadingLogs, setLoadingLogs] = useState<{ [key: number]: boolean }>(
    {}
  );

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/debug/competitions");
        const data = await response.json();
        setCompetitions(data.competitions || []);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const fetchLogs = async (competitionId: number) => {
    setLoadingLogs((prev) => ({ ...prev, [competitionId]: true }));
    try {
      const response = await fetch(
        `/api/debug/competitions?id=${competitionId}`
      );
      const data = await response.json();
      setLogs((prev) => ({ ...prev, [competitionId]: data.logs }));
    } catch (error) {
      console.error("Erreur lors de la récupération des logs:", error);
      setLogs((prev) => ({
        ...prev,
        [competitionId]: "Erreur lors de la récupération des logs",
      }));
    } finally {
      setLoadingLogs((prev) => ({ ...prev, [competitionId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500";
      case "PENDING":
        return "bg-yellow-500";
      case "IN_PROGRESS":
        return "bg-blue-500";
      case "FAILED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Debug Compétitions</h1>

      {competitions.length === 0 ? (
        <p className="text-muted-foreground">Aucune compétition trouvée</p>
      ) : (
        <div className="space-y-4">
          {competitions.map((comp) => (
            <Card key={comp.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {comp.nom} - {comp.saison}
                    {comp.phase && ` (${comp.phase})`}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(comp.scrapingStatus)}>
                      {comp.scrapingStatus}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchLogs(comp.id)}
                      disabled={loadingLogs[comp.id]}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      {loadingLogs[comp.id] ? "Chargement..." : "Voir logs"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>
                  <strong>Équipe:</strong> {comp.equipe}
                </p>
                <p>
                  <strong>Club:</strong> {comp.club}
                </p>
                <p>
                  <strong>Matchs récupérés:</strong> {comp.matchsCount}
                </p>
                <p>
                  <strong>Créé le:</strong>{" "}
                  {new Date(comp.createdAt).toLocaleString()}
                </p>
                {comp.lastScrapedAt && (
                  <p>
                    <strong>Dernier scraping:</strong>{" "}
                    {new Date(comp.lastScrapedAt).toLocaleString()}
                  </p>
                )}
                {comp.scrapingError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 text-sm font-semibold">
                      Erreur:
                    </p>
                    <p className="text-red-700 text-sm">{comp.scrapingError}</p>
                  </div>
                )}
                {logs[comp.id] && (
                  <div className="mt-4 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto">
                    <p className="text-sm font-mono whitespace-pre-wrap">
                      {logs[comp.id]}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
