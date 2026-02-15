"use client";

import { useState, useEffect, useTransition } from "react";
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
import { clearOnboardingData } from "@/app/actions";
import { toast } from "sonner";

type UserData = {
  tokensRemaining: number;
  subscription: string;
  id: number;
  role: string;
};

type Equipe = {
  id: number;
  nom: string;
  ville?: string;
  saison?: string;
  nom_competition?: string;
  club_id?: number;
  _count?: {
    competitions: number;
    joueurs: number;
  };
};

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

interface OnboardingCompetitionClientProps {
  initialUserData: UserData | null;
  initialTokensData: any;
  selectedTeams: Equipe[];
  competitions: Competition[];
  error?: string;
}

export default function OnboardingCompetitionClient({
  initialUserData,
  initialTokensData,
  selectedTeams,
  competitions,
  error,
}: OnboardingCompetitionClientProps) {
  const router = useRouter();
  const [userData] = useState<UserData | null>(initialUserData);
  const [allCompetitions] = useState<Competition[]>(competitions);
  const [filteredCompetitions, setFilteredCompetitions] =
    useState<Competition[]>(competitions);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  // Filtrer les compétitions par terme de recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCompetitions(allCompetitions);
    } else {
      const filtered = allCompetitions.filter(
        (comp) =>
          comp.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comp.equipe.nom.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredCompetitions(filtered);
    }
  }, [searchTerm, allCompetitions]);

  const handleSelectCompetition = async (competitionId: number) => {
    startTransition(async () => {
      try {
        // Nettoyer les données d'onboarding puisque l'utilisateur sélectionne une compétition existante
        await clearOnboardingData();

        toast.success("Redirection vers le dashboard...");

        // Rediriger vers le dashboard
        router.push("/dashboard");
      } catch (error) {
        console.error("Erreur lors de la sélection de compétition:", error);
        toast.error("Erreur lors de la redirection");
      }
    });
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push("/onboarding/teams")}
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button onClick={() => router.refresh()}>Réessayer</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-blue-500/5 rotate-12 scale-150 blur-3xl pointer-events-none" />
      <div className="fixed inset-0 bg-orange-500/5 -rotate-12 scale-150 blur-3xl pointer-events-none" />

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
                disabled={isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer une compétition
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Tokens disponibles */}
            {userData && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">
                        Tokens disponibles
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {userData.tokensRemaining} token(s) pour créer des
                        compétitions
                      </p>
                    </div>
                    <Badge variant="default">{userData.tokensRemaining}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Équipes sélectionnées */}
            {selectedTeams.length > 0 && (
              <Card className="bg-muted/20 border-muted">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 text-sm">
                    Équipes sélectionnées ({selectedTeams.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTeams.map((team) => (
                      <Badge
                        key={team.id}
                        variant="outline"
                        className="text-xs"
                      >
                        {team.nom}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher une compétition par nom ou équipe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all duration-300 text-lg"
                disabled={isPending}
              />
            </div>

            {/* Liste des compétitions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredCompetitions.map((competition) => (
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
                            className="bg-primary/5 text-primary border-primary/20 text-xs"
                          >
                            📅 {competition.saison}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              competition.scrapingStatus === "COMPLETED"
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : competition.scrapingStatus === "PENDING"
                                  ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                  : "bg-red-500/10 text-red-600 border-red-500/20"
                            }`}
                          >
                            {competition.scrapingStatus === "COMPLETED"
                              ? "✓ Actif"
                              : competition.scrapingStatus === "PENDING"
                                ? "⏳ En cours"
                                : "❌ Inactif"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* État vide */}
            {filteredCompetitions.length === 0 && (
              <div className="text-center py-16 bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl flex flex-col items-center justify-center">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <Trophy className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Aucune compétition trouvée
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchTerm
                    ? "Nous n'avons pas trouvé de compétition correspondant à votre recherche."
                    : "Aucune compétition n'existe pour vos équipes sélectionnées."}
                  Vous pouvez en créer une nouvelle.
                </p>
                <Button
                  onClick={() => router.push("/onboarding/create-competition")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer ma première compétition
                </Button>
              </div>
            )}

            {/* Actions de navigation */}
            <div className="flex justify-between items-center pt-4 border-t border-border/50">
              <Button
                variant="ghost"
                onClick={() => router.push("/onboarding/teams")}
                className="hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                disabled={isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux équipes
              </Button>

              {filteredCompetitions.length === 0 && !searchTerm && (
                <Button
                  onClick={() => router.push("/onboarding/create-competition")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={isPending}
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Créer une compétition
                  <Plus className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
