"use client";

import { useState, useEffect } from "react";
import {
  getEquipes,
  getJoueurs,
  updateJoueursPostesBatch,
  type Equipe,
  type Joueur,
} from "@/lib/api/client";
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
// Le terrain est une vue demi-terrain, but en haut.
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
    short: "PVT",
    x: 50,
    y: 40,
    principal: "Pivot",
    secondaire: "Pivot",
  },
];

function HandballCourt({
  selectedPoste,
  onSelectPoste,
  isPrincipal,
}: {
  selectedPoste: string;
  onSelectPoste: (poste: string) => void;
  isPrincipal: boolean;
}) {
  return (
    <div className="relative w-full aspect-[4/3] bg-amber-100/30 rounded-xl border-4 border-amber-900/10 overflow-hidden shadow-inner">
      {/* Terrain SVG Background */}
      <svg
        className="absolute inset-0 w-full h-full text-blue-400 opacity-20 pointer-events-none"
        viewBox="0 0 100 75"
      >
        {/* Zone des 6m */}
        <path
          d="M 10 0 L 10 10 Q 10 35 50 35 Q 90 35 90 10 L 90 0"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="0.5"
        />
        {/* Zone des 9m (Pointillés) */}
        <path
          d="M 5 0 L 5 10 Q 5 45 50 45 Q 95 45 95 10 L 95 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
        {/* But */}
        <rect x="40" y="-2" width="20" height="4" fill="#333" />
      </svg>

      {/* Positions Buttons */}
      {COURT_POSITIONS.map((pos) => {
        const targetValue = isPrincipal ? pos.principal : pos.secondaire;
        const isSelected = selectedPoste === targetValue;

        return (
          <button
            key={pos.id}
            onClick={() => onSelectPoste(targetValue)}
            className={cn(
              "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 group",
              "flex flex-col items-center justify-center",
              "hover:scale-110 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
            )}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs shadow-lg border-2 transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary scale-110 ring-4 ring-primary/20"
                  : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted"
              )}
            >
              {pos.short}
            </div>
            <span
              className={cn(
                "absolute -bottom-6 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-background/80 px-2 py-0.5 rounded-full backdrop-blur-sm transition-opacity",
                isSelected
                  ? "opacity-100 text-primary"
                  : "opacity-0 group-hover:opacity-100 text-muted-foreground"
              )}
            >
              {pos.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function JoueursPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [selectedEquipe, setSelectedEquipe] = useState<number | null>(null);
  const [selectedPoste, setSelectedPoste] = useState<string>("");
  const [isPostePrincipal, setIsPostePrincipal] = useState(true);
  const [selectedJoueurs, setSelectedJoueurs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEquipes();
  }, []);

  useEffect(() => {
    if (selectedEquipe) {
      loadJoueurs(selectedEquipe);
    }
  }, [selectedEquipe]);

  const loadEquipes = async () => {
    try {
      setLoading(true);
      const data = await getEquipes();
      // Utiliser directement les équipes auxquelles l'utilisateur a accès
      setEquipes(data);
      // Sélectionner la première équipe par défaut
      if (data.length > 0) {
        setSelectedEquipe(data[0].id);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des équipes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadJoueurs = async (equipeId: number) => {
    try {
      setLoading(true);
      const data = await getJoueurs(equipeId);
      setJoueurs(data);
      setSelectedJoueurs([]);
    } catch (error) {
      console.error("Erreur lors du chargement des joueurs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoueurToggle = (joueurId: number) => {
    setSelectedJoueurs((prev) =>
      prev.includes(joueurId)
        ? prev.filter((id) => id !== joueurId)
        : [...prev, joueurId]
    );
  };

  const handleSelectAll = () => {
    if (selectedJoueurs.length === joueurs.length) {
      setSelectedJoueurs([]);
    } else {
      setSelectedJoueurs(joueurs.map((j) => j.id));
    }
  };

  const handleAssignPoste = async () => {
    if (!selectedPoste || selectedJoueurs.length === 0) return;

    try {
      setSaving(true);
      const request = isPostePrincipal
        ? {
            joueur_ids: selectedJoueurs,
            poste_principal: selectedPoste,
            operation: "set" as const,
          }
        : {
            joueur_ids: selectedJoueurs,
            postes_secondaires: [selectedPoste],
            operation: "add" as const,
          };

      const response = await updateJoueursPostesBatch(request);

      // Recharger les joueurs après la mise à jour
      if (selectedEquipe) {
        await loadJoueurs(selectedEquipe);
      }

      // Réinitialiser la sélection
      setSelectedJoueurs([]);
      setSelectedPoste("");

      alert(`✅ ${response.updated_count} joueur(s) mis à jour avec succès !`);
    } catch (error) {
      console.error("Erreur lors de l'assignation du poste:", error);
      alert(`❌ Erreur lors de l'assignation du poste`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && equipes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-10 animate-in fade-in slide-in-from-top-5 duration-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <span className="text-2xl text-primary">👥</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-sport font-extrabold uppercase tracking-tighter text-foreground">
            Gestion des Postes
          </h1>
        </div>
        <p className="text-muted-foreground font-medium pl-14">
          Assignez des postes principaux et secondaires à vos joueurs rapidement
        </p>
      </div>

      {/* Sélection de l'équipe */}
      <Card className="mb-6 bg-card/40 backdrop-blur-md border border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="font-sport uppercase tracking-wide">
            Sélectionner une équipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedEquipe?.toString() || ""}
            onValueChange={(value) => setSelectedEquipe(parseInt(value))}
          >
            <SelectTrigger className="w-full bg-background/50 border-input font-medium">
              <SelectValue placeholder="Choisir une équipe..." />
            </SelectTrigger>
            <SelectContent>
              {equipes.map((equipe) => (
                <SelectItem key={equipe.id} value={equipe.id.toString()}>
                  {equipe.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Panneau d'assignation de poste */}
      {selectedEquipe && (
        <Card className="mb-6 bg-card/40 backdrop-blur-md border border-border/50 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl -z-10" />
          <CardHeader>
            <CardTitle className="font-sport uppercase tracking-wide text-primary">
              Assigner un poste
            </CardTitle>
            <CardDescription className="text-xs uppercase tracking-wider font-bold opacity-70">
              Sélectionnez les joueurs ci-dessous, puis choisissez le poste à
              leur assigner
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2 flex flex-col gap-6 justify-center order-2 lg:order-1">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Type de poste
                  </label>
                  <Select
                    value={isPostePrincipal ? "principal" : "secondaire"}
                    onValueChange={(value) => {
                      setIsPostePrincipal(value === "principal");
                      setSelectedPoste("");
                    }}
                  >
                    <SelectTrigger className="bg-background/50 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="principal">Poste Principal</SelectItem>
                      <SelectItem value="secondaire">
                        Poste Secondaire
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-5 bg-card/60 rounded-xl border border-border/50 shadow-sm space-y-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Poste sélectionné
                    </span>
                    <span
                      className={cn(
                        "text-2xl font-sport font-black uppercase tracking-tight",
                        selectedPoste
                          ? "text-primary"
                          : "text-muted-foreground/40"
                      )}
                    >
                      {selectedPoste || "..."}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Joueurs sélectionnés
                    </span>
                    <span className="text-lg font-bold">
                      {selectedJoueurs.length}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        joueur(s)
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleAssignPoste}
                    disabled={
                      !selectedPoste || selectedJoueurs.length === 0 || saving
                    }
                    className="h-12 w-full font-sport uppercase tracking-wider text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        En cours...
                      </>
                    ) : (
                      "Assigner le poste"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedJoueurs([])}
                    disabled={selectedJoueurs.length === 0}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors uppercase font-bold tracking-wide"
                  >
                    Effacer la sélection
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-3 lg:order-2">
                <div className="relative">
                  <div className="absolute -top-4 -left-4 bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                    Terrain Interactif
                  </div>
                  <HandballCourt
                    selectedPoste={selectedPoste}
                    onSelectPoste={setSelectedPoste}
                    isPrincipal={isPostePrincipal}
                  />
                  <p className="text-center text-xs text-muted-foreground mt-3 font-medium">
                    Cliquez sur une position sur le terrain pour la sélectionner
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des joueurs */}
      {selectedEquipe && (
        <Card className="bg-card/30 backdrop-blur-md border border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-sport uppercase tracking-wide">
                  Joueurs ({joueurs.length})
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  Cochez les joueurs pour leur assigner un poste
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs uppercase font-bold tracking-wide"
              >
                {selectedJoueurs.length === joueurs.length
                  ? "Tout désélectionner"
                  : "Tout sélectionner"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : joueurs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 italic">
                Aucun joueur trouvé pour cette équipe
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {joueurs.map((joueur) => (
                  <div
                    key={joueur.id}
                    className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all duration-200 group relative overflow-hidden ${
                      selectedJoueurs.includes(joueur.id)
                        ? "bg-primary/5 border-primary shadow-md"
                        : "bg-background/40 hover:bg-background/60 hover:border-primary/50"
                    }`}
                    onClick={() => handleJoueurToggle(joueur.id)}
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${
                        selectedJoueurs.includes(joueur.id)
                          ? "bg-primary"
                          : "bg-transparent group-hover:bg-primary/30"
                      }`}
                    />

                    <Checkbox
                      checked={selectedJoueurs.includes(joueur.id)}
                      onCheckedChange={() => handleJoueurToggle(joueur.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {joueur.nom_prenom}
                        </span>
                        {joueur.num_maillot && (
                          <Badge
                            variant="outline"
                            className="font-mono font-bold text-xs bg-background/50"
                          >
                            #{joueur.num_maillot}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {joueur.poste_principal ? (
                          <Badge className="text-[10px] uppercase font-bold tracking-wider hover:bg-primary">
                            {joueur.poste_principal}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            Sans poste principal
                          </span>
                        )}
                        {joueur.postes_secondaires &&
                          joueur.postes_secondaires.length > 0 &&
                          joueur.postes_secondaires.map((poste) => (
                            <Badge
                              key={poste}
                              variant="secondary"
                              className="text-[10px] uppercase font-bold tracking-wider"
                            >
                              {poste}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
