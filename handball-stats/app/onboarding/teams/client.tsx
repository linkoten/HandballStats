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
import {
  selectOnboardingTeams,
  createEquipe,
  getOnboardingEquipesByClub,
} from "@/app/actions";
import { toast } from "sonner";

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

type UserData = {
  tokensRemaining: number;
  subscription: string;
  id: number;
  role: string;
};

type Club = {
  id: number;
  nom: string;
  _count: {
    equipes: number;
  };
};

interface OnboardingTeamsClientProps {
  initialUserData: UserData | null;
  initialTokensData: any;
  selectedClub: Club | null;
  initialEquipes: Equipe[];
  error?: string;
}

export default function OnboardingTeamsClient({
  initialUserData,
  initialTokensData,
  selectedClub,
  initialEquipes,
  error,
}: OnboardingTeamsClientProps) {
  const router = useRouter();
  const [equipes, setEquipes] = useState<Equipe[]>(initialEquipes);
  const [filteredEquipes, setFilteredEquipes] =
    useState<Equipe[]>(initialEquipes);
  const [searchTerm, setSearchTerm] = useState("");
  const [userData] = useState<UserData | null>(initialUserData);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEquipes, setSelectedEquipes] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();

  // Formulaire création équipe
  const [newEquipeForm, setNewEquipeForm] = useState({
    nom: "",
    ville: "",
  });

  // Filtrer les équipes par terme de recherche
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEquipes(equipes);
    } else {
      const filtered = equipes.filter(
        (equipe) =>
          equipe.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (equipe.ville &&
            equipe.ville.toLowerCase().includes(searchTerm.toLowerCase())),
      );
      setFilteredEquipes(filtered);
    }
  }, [searchTerm, equipes]);

  const handleEquipeToggle = (equipeId: number) => {
    setSelectedEquipes((prev) =>
      prev.includes(equipeId)
        ? prev.filter((id) => id !== equipeId)
        : [...prev, equipeId],
    );
  };

  const handleSubmitSelectedTeams = async () => {
    if (selectedEquipes.length === 0) {
      toast.error("Veuillez sélectionner au moins une équipe");
      return;
    }

    startTransition(async () => {
      try {
        const result = await selectOnboardingTeams(selectedEquipes);

        if (result.success) {
          toast.success(`${selectedEquipes.length} équipe(s) sélectionnée(s)`);
          router.push("/onboarding/create-competition");
        } else {
          toast.error(
            result.error || "Erreur lors de la sélection des équipes",
          );
        }
      } catch (error) {
        console.error("Erreur sélection équipes:", error);
        toast.error("Erreur lors de la sélection des équipes");
      }
    });
  };

  const handleCreateNewEquipe = async () => {
    if (!newEquipeForm.nom.trim() || !newEquipeForm.ville.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (!selectedClub?.id) {
      toast.error("Aucun club sélectionné");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createEquipe({
          nom: newEquipeForm.nom.trim(),
          ville: newEquipeForm.ville.trim(),
          clubId: selectedClub.id,
        });

        if (result.success && result.data) {
          setEquipes((prev) => [...prev, result.data]);
          setNewEquipeForm({ nom: "", ville: "" });
          setShowCreateDialog(false);
          toast.success("Équipe créée avec succès");

          // Rafraîchir la liste des équipes
          await refreshEquipes();
        } else {
          toast.error(result.error || "Erreur lors de la création de l'équipe");
        }
      } catch (error) {
        console.error("Erreur création équipe:", error);
        toast.error("Erreur lors de la création de l'équipe");
      }
    });
  };

  const refreshEquipes = async () => {
    if (!selectedClub?.id) return;

    startTransition(async () => {
      try {
        const result = await getOnboardingEquipesByClub(selectedClub.id);
        if (result.success) {
          setEquipes(result.data);
        }
      } catch (error) {
        console.error("Erreur refresh équipes:", error);
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
                onClick={() => router.push("/onboarding/club")}
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

  const canContinue = userData?.tokensRemaining && userData.tokensRemaining > 0;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/onboarding/club")}
            disabled={isPending}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-6">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-sport font-extrabold uppercase tracking-tight mb-4">
            Sélection des Équipes
          </h1>
          {selectedClub && (
            <p className="text-xl text-muted-foreground mb-2">
              <span className="font-semibold text-primary">
                {selectedClub.nom}
              </span>
            </p>
          )}
          <p className="text-muted-foreground">
            Choisissez les équipes à suivre dans vos compétitions
          </p>
        </div>

        {/* Tokens disponibles */}
        {userData && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-2">Tokens disponibles</h3>
                  <p className="text-sm text-muted-foreground">
                    Vous avez{" "}
                    <span className="font-bold text-primary">
                      {userData.tokensRemaining}
                    </span>{" "}
                    token(s) pour créer des compétitions
                  </p>
                </div>
                <Badge variant={canContinue ? "default" : "destructive"}>
                  {userData.tokensRemaining} token(s)
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recherche et création */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              Équipes disponibles ({filteredEquipes.length})
            </CardTitle>
            <CardDescription>
              Sélectionnez les équipes que vous souhaitez suivre
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Rechercher une équipe..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled={isPending}
                  />
                </div>
              </div>
              <Dialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={isPending}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer équipe
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer une nouvelle équipe</DialogTitle>
                    <DialogDescription>
                      Ajoutez une équipe au club {selectedClub?.nom}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nom">Nom de l'équipe</Label>
                      <Input
                        id="nom"
                        placeholder="Ex: Seniors Masculins"
                        value={newEquipeForm.nom}
                        onChange={(e) =>
                          setNewEquipeForm((prev) => ({
                            ...prev,
                            nom: e.target.value,
                          }))
                        }
                        disabled={isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ville">Ville</Label>
                      <Input
                        id="ville"
                        placeholder="Ex: Rennes"
                        value={newEquipeForm.ville}
                        onChange={(e) =>
                          setNewEquipeForm((prev) => ({
                            ...prev,
                            ville: e.target.value,
                          }))
                        }
                        disabled={isPending}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                        disabled={isPending}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleCreateNewEquipe}
                        disabled={isPending}
                      >
                        {isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Créer
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Liste des équipes */}
            {isPending && filteredEquipes.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredEquipes.length > 0 ? (
              <div className="grid gap-4 mb-6">
                {filteredEquipes.map((equipe) => (
                  <Card
                    key={equipe.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedEquipes.includes(equipe.id)
                        ? "ring-2 ring-primary bg-primary/5"
                        : "hover:shadow-md"
                    }`}
                    onClick={() => handleEquipeToggle(equipe.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {equipe.nom}
                          </h3>
                          {equipe.ville && (
                            <p className="text-sm text-muted-foreground">
                              {equipe.ville}
                            </p>
                          )}
                          {equipe._count && (
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              <span>
                                {equipe._count.competitions} compétitions
                              </span>
                              <span>{equipe._count.joueurs} joueurs</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center">
                          {selectedEquipes.includes(equipe.id) && (
                            <Badge variant="default">Sélectionnée</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucune équipe trouvée</p>
                <p className="text-sm mt-2">
                  {searchTerm
                    ? `Aucune équipe ne correspond à "${searchTerm}"`
                    : "Ce club n'a pas encore d'équipes"}
                </p>
              </div>
            )}

            {/* Équipes sélectionnées */}
            {selectedEquipes.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedEquipes.length} équipe(s) sélectionnée(s)
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedEquipes.map((equipeId) => {
                    const equipe = equipes.find((e) => e.id === equipeId);
                    return equipe ? (
                      <Badge key={equipeId} variant="default">
                        {equipe.nom}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmitSelectedTeams}
            disabled={selectedEquipes.length === 0 || !canContinue || isPending}
            className="px-12"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuer avec {selectedEquipes.length} équipe(s)
          </Button>
        </div>

        {!canContinue && userData && (
          <div className="text-center mt-4">
            <p className="text-sm text-destructive">
              Vous n'avez plus de tokens disponibles. Veuillez en acheter pour
              continuer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
