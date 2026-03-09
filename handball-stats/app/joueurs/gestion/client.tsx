"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getJoueurs, updateJoueursPostes } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const POSTES_PRINCIPAUX = [
  "Gardien",
  "Ailier",
  "Arrière",
  "Demi-Centre",
  "Pivot",
];
const POSTES_SECONDAIRES = [
  "Gardien",
  "Ailier G",
  "Arrière G",
  "Demi-Centre",
  "Arrière D",
  "Ailier D",
  "Pivot",
];

// Configuration des positions sur le terrain (Pourcentages X, Y)
const COURT_POSITIONS = [
  {
    id: "Gardien",
    label: "Gardien",
    short: "GB",
    x: 50,
    y: 15,
    principal: "Gardien",
    secondaire: "Gardien",
  },
  {
    id: "AilierG",
    label: "Ailier Gauche",
    short: "ALG",
    x: 10,
    y: 25,
    principal: "Ailier",
    secondaire: "Ailier G",
  },
  {
    id: "ArriereG",
    label: "Arrière Gauche",
    short: "ARG",
    x: 25,
    y: 55,
    principal: "Arrière",
    secondaire: "Arrière G",
  },
  {
    id: "DemiCentre",
    label: "Demi-Centre",
    short: "DC",
    x: 50,
    y: 65,
    principal: "Demi-Centre",
    secondaire: "Demi-Centre",
  },
  {
    id: "ArriereD",
    label: "Arrière Droit",
    short: "ARD",
    x: 75,
    y: 55,
    principal: "Arrière",
    secondaire: "Arrière D",
  },
  {
    id: "AilierD",
    label: "Ailier Droit",
    short: "ALD",
    x: 90,
    y: 25,
    principal: "Ailier",
    secondaire: "Ailier D",
  },
  {
    id: "Pivot",
    label: "Pivot",
    short: "PIV",
    x: 50,
    y: 45,
    principal: "Pivot",
    secondaire: "Pivot",
  },
];

type Equipe = {
  id: number;
  nom: string;
  club: {
    id: number;
    nom: string;
  };
  _count: {
    joueurs: number;
  };
};

type Joueur = {
  id: number;
  nom: string;
  prenom: string;
  postePrincipal?: string;
  posteSecondaire?: string;
  numLicence?: string;
  equipeId: number;
};

interface JoueursClientProps {
  initialEquipes: Equipe[];
  error?: string;
}

function HandballCourt({
  joueurs,
  selectedJoueurs,
  onJoueurClick,
  isPostePrincipal,
  selectedPoste,
}: {
  joueurs: Joueur[];
  selectedJoueurs: number[];
  onJoueurClick: (joueurId: number) => void;
  isPostePrincipal: boolean;
  selectedPoste: string;
}) {
  const getJoueursByPosition = (position: any) => {
    const posteField = isPostePrincipal ? "postePrincipal" : "posteSecondaire";
    const posteToMatch = isPostePrincipal
      ? position.principal
      : position.secondaire;

    return joueurs.filter((joueur) => joueur[posteField] === posteToMatch);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-[2/3] bg-gradient-to-b from-orange-100 to-orange-200 border-4 border-orange-800 rounded-lg overflow-hidden">
      {/* Terrain de handball stylisé */}
      <div className="absolute inset-2 bg-orange-50 border-2 border-orange-600 rounded">
        {/* Ligne de milieu */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-orange-600 transform -translate-y-px"></div>

        {/* But supérieur */}
        <div className="absolute top-0 left-1/2 w-16 h-8 border-2 border-orange-600 bg-orange-200 transform -translate-x-1/2 rounded-b-lg"></div>

        {/* Zone de but supérieure */}
        <div className="absolute top-0 left-1/2 w-32 h-16 border-2 border-orange-600 transform -translate-x-1/2 rounded-b-3xl border-t-0"></div>

        {/* Cercle central */}
        <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-orange-600 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>

        {/* Positions des joueurs */}
        {COURT_POSITIONS.map((position) => {
          const joueursAtPosition = getJoueursByPosition(position);

          return (
            <div
              key={position.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
              }}
            >
              {/* Indicateur de position */}
              <div
                className={cn(
                  "relative flex flex-col items-center space-y-1 p-2 rounded-lg border-2 transition-all",
                  selectedPoste ===
                    (isPostePrincipal
                      ? position.principal
                      : position.secondaire)
                    ? "bg-blue-100 border-blue-500 shadow-lg"
                    : "bg-white border-gray-300",
                )}
              >
                <div className="text-xs font-bold text-gray-700">
                  {position.short}
                </div>

                {/* Joueurs à cette position */}
                <div className="flex flex-col space-y-1 min-w-[80px]">
                  {joueursAtPosition.map((joueur) => (
                    <button
                      key={joueur.id}
                      onClick={() => onJoueurClick(joueur.id)}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-all text-center",
                        selectedJoueurs.includes(joueur.id)
                          ? "bg-blue-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200",
                      )}
                    >
                      <div className="font-medium">{joueur.prenom}</div>
                      <div className="text-[10px] opacity-75">{joueur.nom}</div>
                    </button>
                  ))}
                </div>

                {/* Indicateur si aucun joueur */}
                {joueursAtPosition.length === 0 && (
                  <div className="text-xs text-gray-400 italic">Libre</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function JoueursClient({
  initialEquipes,
  error,
}: JoueursClientProps) {
  const [equipes] = useState<Equipe[]>(initialEquipes);
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [selectedEquipe, setSelectedEquipe] = useState<number | null>(null);
  const [selectedPoste, setSelectedPoste] = useState<string>("");
  const [isPostePrincipal, setIsPostePrincipal] = useState(true);
  const [selectedJoueurs, setSelectedJoueurs] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (equipes.length > 0 && !selectedEquipe) {
      setSelectedEquipe(equipes[0].id);
    }
  }, [equipes, selectedEquipe]);

  useEffect(() => {
    if (selectedEquipe) {
      loadJoueurs(selectedEquipe);
    }
  }, [selectedEquipe]);

  const loadJoueurs = async (equipeId: number) => {
    startTransition(async () => {
      try {
        const result = await getJoueurs(equipeId.toString());
        if (result.success) {
          setJoueurs(result.data);
          setSelectedJoueurs([]); // Reset selection
        } else {
          toast.error(result.error || "Erreur lors du chargement des joueurs");
        }
      } catch (error) {
        console.error("Erreur chargement joueurs:", error);
        toast.error("Erreur lors du chargement des joueurs");
      }
    });
  };

  const handleAssignPoste = async () => {
    if (!selectedPoste || selectedJoueurs.length === 0) {
      toast.error("Sélectionnez un poste et au moins un joueur");
      return;
    }

    startTransition(async () => {
      try {
        const updates = selectedJoueurs.map((joueurId) => ({
          joueurId,
          postePrincipal: isPostePrincipal ? selectedPoste : undefined,
          posteSecondaire: !isPostePrincipal ? selectedPoste : undefined,
        }));

        const result = await updateJoueursPostes(updates);

        if (result.success) {
          // Recharger les joueurs pour voir les changements
          if (selectedEquipe) {
            await loadJoueurs(selectedEquipe);
          }
          setSelectedJoueurs([]);
          toast.success(
            `Poste ${isPostePrincipal ? "principal" : "secondaire"} assigné à ${selectedJoueurs.length} joueur(s)`,
          );
          router.refresh();
        } else {
          toast.error(result.error || "Erreur lors de l'assignation");
        }
      } catch (error) {
        console.error("Erreur assignation postes:", error);
        toast.error("Erreur lors de l'assignation des postes");
      }
    });
  };

  const toggleJoueurSelection = (joueurId: number) => {
    setSelectedJoueurs((prev) =>
      prev.includes(joueurId)
        ? prev.filter((id) => id !== joueurId)
        : [...prev, joueurId],
    );
  };

  const selectAllJoueurs = () => {
    setSelectedJoueurs(joueurs.map((j) => j.id));
  };

  const clearSelection = () => {
    setSelectedJoueurs([]);
  };

  const filteredJoueurs = selectedPoste
    ? joueurs.filter((joueur) => {
        const posteField = isPostePrincipal
          ? "postePrincipal"
          : "posteSecondaire";
        return joueur[posteField] !== selectedPoste;
      })
    : joueurs;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.refresh()}>Réessayer</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent/90 to-primary/90 text-primary-foreground p-8 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 font-sport text-9xl">
            ⚽
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <h1 className="text-4xl font-sport font-extrabold uppercase tracking-tight">
                Gestion des Joueurs
              </h1>
              <p className="text-primary-foreground/80 mt-2 text-lg font-medium">
                Organisez les postes de vos joueurs sur le terrain
              </p>
            </div>
          </div>
        </div>

        {/* Sélection équipe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sport uppercase tracking-wide">
              <Users className="h-5 w-5 text-primary" />
              Sélectionner une Équipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedEquipe?.toString() || ""}
              onValueChange={(value) => setSelectedEquipe(Number(value))}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir une équipe" />
              </SelectTrigger>
              <SelectContent>
                {equipes.map((equipe) => (
                  <SelectItem key={equipe.id} value={equipe.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{equipe.nom}</span>
                      <Badge variant="outline" className="text-xs">
                        {equipe.club.nom}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        ({equipe._count.joueurs} joueurs)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Configuration des postes */}
        {selectedEquipe && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-sport uppercase tracking-wide">
                <Shield className="h-5 w-5 text-secondary" />
                Assignation de Postes
              </CardTitle>
              <CardDescription>
                Sélectionnez les joueurs et assignez-leur un poste sur le
                terrain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Type de poste */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={isPostePrincipal}
                    onCheckedChange={(checked) => {
                      setIsPostePrincipal(!!checked);
                      setSelectedPoste("");
                    }}
                  />
                  <span>Poste Principal</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!isPostePrincipal}
                    onCheckedChange={(checked) => {
                      setIsPostePrincipal(!checked);
                      setSelectedPoste("");
                    }}
                  />
                  <span>Poste Secondaire</span>
                </label>
              </div>

              {/* Sélection du poste */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Poste à assigner :
                </label>
                <Select
                  value={selectedPoste}
                  onValueChange={setSelectedPoste}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un poste" />
                  </SelectTrigger>
                  <SelectContent>
                    {(isPostePrincipal
                      ? POSTES_PRINCIPAUX
                      : POSTES_SECONDAIRES
                    ).map((poste) => (
                      <SelectItem key={poste} value={poste}>
                        {poste}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleAssignPoste}
                  disabled={
                    !selectedPoste || selectedJoueurs.length === 0 || isPending
                  }
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Assigner ({selectedJoueurs.length} joueur
                  {selectedJoueurs.length > 1 ? "s" : ""})
                </Button>
                <Button
                  variant="outline"
                  onClick={selectAllJoueurs}
                  disabled={joueurs.length === 0 || isPending}
                >
                  Tout sélectionner
                </Button>
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  disabled={selectedJoueurs.length === 0 || isPending}
                >
                  Désélectionner
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Terrain de handball */}
        {selectedEquipe && joueurs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-sport uppercase tracking-wide">
                <Shield className="h-5 w-5 text-accent" />
                Disposition sur le Terrain
              </CardTitle>
              <CardDescription>
                Visualisation des positions{" "}
                {isPostePrincipal ? "principales" : "secondaires"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HandballCourt
                joueurs={joueurs}
                selectedJoueurs={selectedJoueurs}
                onJoueurClick={toggleJoueurSelection}
                isPostePrincipal={isPostePrincipal}
                selectedPoste={selectedPoste}
              />
            </CardContent>
          </Card>
        )}

        {/* Liste des joueurs */}
        {selectedEquipe && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-sport uppercase tracking-wide">
                <User className="h-5 w-5 text-primary" />
                Liste des Joueurs {selectedPoste && `(Poste: ${selectedPoste})`}
              </CardTitle>
              <CardDescription>
                {filteredJoueurs.length} joueur
                {filteredJoueurs.length > 1 ? "s" : ""} affiché
                {filteredJoueurs.length > 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredJoueurs.length > 0 ? (
                <div className="grid gap-3">
                  {filteredJoueurs.map((joueur) => (
                    <div
                      key={joueur.id}
                      className={cn(
                        "flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all",
                        selectedJoueurs.includes(joueur.id)
                          ? "bg-blue-50 border-blue-500 shadow-md"
                          : "hover:bg-muted/50",
                      )}
                      onClick={() => toggleJoueurSelection(joueur.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedJoueurs.includes(joueur.id)}
                        />
                        <div>
                          <h3 className="font-semibold">
                            {joueur.prenom} {joueur.nom}
                          </h3>
                          <div className="flex gap-2 text-sm text-muted-foreground">
                            {joueur.numLicence && (
                              <span>Licence: {joueur.numLicence}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {joueur.postePrincipal && (
                          <Badge variant="default" className="text-xs">
                            P: {joueur.postePrincipal}
                          </Badge>
                        )}
                        {joueur.posteSecondaire && (
                          <Badge variant="outline" className="text-xs">
                            S: {joueur.posteSecondaire}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Aucun joueur trouvé</p>
                  <p className="text-sm mt-2">
                    {selectedPoste
                      ? `Aucun joueur disponible pour le poste ${selectedPoste}`
                      : "Cette équipe n'a pas encore de joueurs"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
