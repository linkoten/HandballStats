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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Search, Plus, Trophy, ArrowLeft } from "lucide-react";

type Equipe = {
  id: number;
  nom: string;
  saison: string;
  nom_competition: string;
  club_id: number;
};

type UserData = {
  tokensRemaining: number;
  subscription: string;
};

export default function OnboardingTeamsPage() {
  const router = useRouter();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [filteredEquipes, setFilteredEquipes] = useState<Equipe[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<number | null>(null);

  // Formulaire création équipe
  const [newEquipe, setNewEquipe] = useState({
    nom: "",
    ville: "",
    region: "",
    departement: "",
  });

  useEffect(() => {
    fetchUserDataAndEquipes();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredEquipes(equipes);
    } else {
      const filtered = equipes.filter(
        (equipe) =>
          equipe.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          equipe.nom_competition
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
      setFilteredEquipes(filtered);
    }
  }, [searchTerm, equipes]);

  async function fetchUserDataAndEquipes() {
    try {
      // Récupérer les données utilisateur (tokens disponibles)
      const userResponse = await fetch("/api/user/me");
      const user = await userResponse.json();
      setUserData(user);

      // Récupérer le club sélectionné
      const clubResponse = await fetch("/api/onboarding/get-selected-club");
      const { clubId } = await clubResponse.json();

      if (!clubId) {
        router.push("/onboarding/club");
        return;
      }

      setClubId(clubId);

      // Récupérer toutes les équipes du club (sans filtre de saison)
      const equipesResponse = await fetch(`/api/equipes?club_id=${clubId}`);
      const data = await equipesResponse.json();
      setEquipes(data);
      setFilteredEquipes(data);
    } catch (error) {
      console.error("Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectEquipe(equipeId: number) {
    try {
      // Sauvegarder l'équipe sélectionnée
      const response = await fetch("/api/onboarding/select-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipeIds: [equipeId] }),
      });

      if (response.ok) {
        // Rediriger vers la configuration de compétition
        router.push("/onboarding/competition");
      } else {
        console.error("Erreur sauvegarde équipe");
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
  }

  async function handleCreateEquipe(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;

    setSaving(true);
    try {
      const response = await fetch("/api/equipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newEquipe,
          clubId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateDialog(false);
        setNewEquipe({ nom: "", ville: "", region: "", departement: "" });
        // Recharger les équipes
        fetchUserDataAndEquipes();
      } else {
        alert(data.error || "Erreur lors de la création de l'équipe");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la création de l'équipe");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
        <Card className="bg-card/40 backdrop-blur-md shadow-2xl border border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10" />

          <CardHeader className="bg-muted/30 border-b border-border/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-4xl md:text-5xl font-sport font-extrabold uppercase tracking-tighter text-foreground mb-2">
                  🏀 Sélectionnez votre équipe
                </CardTitle>
                <CardDescription className="text-base font-medium text-muted-foreground uppercase tracking-wide">
                  Cliquez sur une équipe pour configurer sa compétition
                </CardDescription>
              </div>
              <Dialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
              >
                <DialogTrigger asChild>
                  <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg font-sport uppercase tracking-wide">
                    <Plus className="mr-2 h-4 w-4" />✨ Créer une équipe
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border border-border/50">
                  <DialogHeader>
                    <DialogTitle className="font-sport uppercase tracking-wide text-foreground">
                      Créer une nouvelle équipe
                    </DialogTitle>
                    <DialogDescription>
                      Remplissez les informations de votre équipe
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={handleCreateEquipe}
                    className="space-y-4 mt-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nom">Nom de l'équipe *</Label>
                        <Input
                          id="nom"
                          className="bg-transparent border-input hover:border-primary/50 focus:border-primary transition-colors"
                          placeholder="ex: ASCR 1 Masculin"
                          value={newEquipe.nom}
                          onChange={(e) =>
                            setNewEquipe({ ...newEquipe, nom: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ville">Ville *</Label>
                        <Input
                          id="ville"
                          className="bg-transparent border-input hover:border-primary/50 focus:border-primary transition-colors"
                          placeholder="ex: Rennes"
                          value={newEquipe.ville}
                          onChange={(e) =>
                            setNewEquipe({
                              ...newEquipe,
                              ville: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="region">Région</Label>
                        <Input
                          id="region"
                          className="bg-transparent border-input hover:border-primary/50 focus:border-primary transition-colors"
                          placeholder="ex: Bretagne"
                          value={newEquipe.region}
                          onChange={(e) =>
                            setNewEquipe({
                              ...newEquipe,
                              region: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="departement">Département</Label>
                        <Input
                          id="departement"
                          className="bg-transparent border-input hover:border-primary/50 focus:border-primary transition-colors"
                          placeholder="ex: 35"
                          value={newEquipe.departement}
                          onChange={(e) =>
                            setNewEquipe({
                              ...newEquipe,
                              departement: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                        disabled={saving}
                        className="hover:bg-accent hover:text-accent-foreground"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Création...
                          </>
                        ) : (
                          "Créer l'équipe"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher une équipe ou compétition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all duration-300"
              />
            </div>

            {/* Liste des équipes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredEquipes.map((equipe) => {
                return (
                  <Card
                    key={equipe.id}
                    className="group cursor-pointer bg-card/40 backdrop-blur-md border-border/50 hover:border-primary/50 hover:bg-card/60 hover:shadow-lg transition-all duration-300"
                    onClick={() => handleSelectEquipe(equipe.id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                            {equipe.nom}
                          </h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Trophy className="h-4 w-4 mr-2 text-primary" />
                            {equipe.nom_competition}
                          </div>
                          <Badge
                            variant="outline"
                            className="mt-2 bg-primary/10 text-primary border-primary/20"
                          >
                            📅 {equipe.saison}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredEquipes.length === 0 && (
              <div className="text-center py-12 bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl">
                <div className="text-6xl mb-4 opacity-50">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-lg font-medium">
                  Aucune équipe trouvée
                </p>
              </div>
            )}

            {/* Boutons */}
            <div className="flex justify-start">
              <Button
                variant="ghost"
                onClick={() => router.push("/onboarding/club")}
                className="hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
