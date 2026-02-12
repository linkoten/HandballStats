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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, Trophy, ArrowLeft, Shield } from "lucide-react";

type Competition = {
  id: number;
  nom: string;
  saison: string;
  scrapingStatus: string;
  lastScrapedAt: string | null;
  equipe: {
    nom: string;
  };
};

type UserData = {
  tokensRemaining: number;
  subscription: string;
};

export default function OnboardingCompetitionPage() {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [filteredCompetitions, setFilteredCompetitions] = useState<
    Competition[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    fetchUserDataAndCompetitions();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCompetitions(competitions);
    } else {
      const filtered = competitions.filter(
        (comp) =>
          comp.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comp.equipe.nom.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredCompetitions(filtered);
    }
  }, [searchTerm, competitions]);

  async function fetchUserDataAndCompetitions() {
    try {
      // Récupérer les données utilisateur
      const userResponse = await fetch("/api/user/me");
      const user = await userResponse.json();
      setUserData(user);

      // Récupérer l'équipe sélectionnée
      const teamsResponse = await fetch("/api/onboarding/get-selected-teams");
      const { equipeIds } = await teamsResponse.json();

      if (!equipeIds || equipeIds.length === 0) {
        router.push("/onboarding/teams");
        return;
      }

      // Récupérer les compétitions pour ces équipes
      const competitionsResponse = await fetch(
        `/api/competitions?equipe_ids=${equipeIds.join(",")}`,
      );
      const data = await competitionsResponse.json();
      setCompetitions(data);
      setFilteredCompetitions(data);
    } catch (error) {
      console.error("Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectCompetition(competitionId: number) {
    // Rediriger vers le dashboard ou une page de détails
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-blue-500/5 rotate-12 scale-150 blur-3xl pointer-events-none" />
      <div className="fixed inset-0 bg-orange-500/5 -rotate-12 scale-150 blur-3xl pointer-events-none" />
      <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02] pointer-events-none" />

      <div className="w-full max-w-5xl relative z-10">
        <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-2xl">
          <CardHeader className="border-b border-border/50 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-3xl font-sport font-extrabold uppercase tracking-tighter italic">
                  Sélectionnez votre{" "}
                  <span className="text-primary">compétition</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground text-lg">
                  Choisissez une compétition existante ou créez-en une nouvelle
                  pour commencer l'analyse
                </CardDescription>
              </div>
              <Button
                onClick={() => router.push("/onboarding/create-competition")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-300 hover:scale-105"
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer une compétition
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher une compétition par nom ou équipe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all duration-300 text-lg"
              />
            </div>

            {/* Liste des compétitions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredCompetitions.map((competition) => {
                return (
                  <Card
                    key={competition.id}
                    className="group cursor-pointer bg-card/40 backdrop-blur-md border-border/50 hover:border-primary/50 hover:bg-card/60 hover:shadow-lg transition-all duration-300"
                    onClick={() => handleSelectCompetition(competition.id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {competition.nom}
                          </h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Shield className="h-4 w-4 mr-2 text-primary/70" />
                            {competition.equipe.nom}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className="bg-primary/5 text-primary border-primary/20"
                            >
                              📅 {competition.saison}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={
                                competition.scrapingStatus === "COMPLETED"
                                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                                  : competition.scrapingStatus === "PENDING"
                                    ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                    : "bg-red-500/10 text-red-600 border-red-500/20"
                              }
                            >
                              {competition.scrapingStatus === "COMPLETED"
                                ? "✓ Actif"
                                : competition.scrapingStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredCompetitions.length === 0 && (
              <div className="text-center py-16 bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl flex flex-col items-center justify-center">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <Trophy className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Aucune compétition trouvée
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Nous n'avons pas trouvé de compétition correspondant à votre
                  recherche. Vous pouvez en créer une nouvelle.
                </p>
                <Button
                  onClick={() => router.push("/onboarding/create-competition")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer ma première compétition
                </Button>
              </div>
            )}

            {/* Boutons */}
            <div className="flex justify-start">
              <Button
                variant="ghost"
                onClick={() => router.push("/onboarding/teams")}
                className="hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux équipes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
