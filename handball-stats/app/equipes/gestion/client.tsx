"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  Building2,
  MapPin,
  FileText,
  Users,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import { updateEquipe } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Equipe {
  id: number;
  nom: string;
  ville: string;
  club?: {
    id: number;
    nom: string;
    ville: string | null;
    region: string | null;
    departement: string | null;
    codeFfhb: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  region?: string;
  departement?: string;
  notes?: string | null;
  hasCustomData?: boolean;
  _count?: {
    joueurs: number;
    competitions: number;
  };
}

const REGIONS = [
  "Bretagne",
  "Pays de la Loire",
  "Normandie",
  "Île-de-France",
  "Autre",
];

const DEPARTEMENTS = [
  { code: "22", nom: "Côtes-d'Armor" },
  { code: "29", nom: "Finistère" },
  { code: "35", nom: "Ille-et-Vilaine" },
  { code: "56", nom: "Morbihan" },
  { code: "44", nom: "Loire-Atlantique" },
  { code: "49", nom: "Maine-et-Loire" },
  { code: "53", nom: "Mayenne" },
  { code: "72", nom: "Sarthe" },
  { code: "85", nom: "Vendée" },
];

interface EquipesGestionClientProps {
  initialEquipes: Equipe[];
  error?: string;
}

export default function EquipesGestionClient({
  initialEquipes,
  error,
}: EquipesGestionClientProps) {
  const [equipes, setEquipes] = useState<Equipe[]>(initialEquipes);
  const [selectedEquipes, setSelectedEquipes] = useState<number[]>([]);
  const [modifications, setModifications] = useState<{
    [key: number]: Partial<Equipe>;
  }>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleEquipeToggle = (equipeId: number) => {
    setSelectedEquipes((prev) =>
      prev.includes(equipeId)
        ? prev.filter((id) => id !== equipeId)
        : [...prev, equipeId],
    );
  };

  const selectAllEquipes = () => {
    setSelectedEquipes(equipes.map((e) => e.id));
  };

  const clearSelection = () => {
    setSelectedEquipes([]);
  };

  const handleFieldChange = (
    equipeId: number,
    field: keyof Equipe,
    value: string,
  ) => {
    setModifications((prev) => ({
      ...prev,
      [equipeId]: {
        ...prev[equipeId],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    const updatedEquipes = selectedEquipes.filter((id) => modifications[id]);

    if (updatedEquipes.length === 0) {
      toast.error("Aucune modification à sauvegarder");
      return;
    }

    startTransition(async () => {
      try {
        const results = await Promise.allSettled(
          updatedEquipes.map(async (equipeId) => {
            const changes = modifications[equipeId];
            const result = await updateEquipe(equipeId, changes);

            if (result.success) {
              return { equipeId, data: result.data };
            } else {
              throw new Error(`Équipe ${equipeId}: ${result.error}`);
            }
          }),
        );

        const successes = results.filter(
          (r) => r.status === "fulfilled",
        ).length;
        const failures = results.filter((r) => r.status === "rejected");

        if (successes > 0) {
          // Mettre à jour l'état local avec les modifications réussies
          setEquipes((prev) =>
            prev.map((equipe) => {
              if (modifications[equipe.id]) {
                return { ...equipe, ...modifications[equipe.id] };
              }
              return equipe;
            }),
          );

          // Effacer les modifications sauvegardées
          const clearedMods = { ...modifications };
          updatedEquipes.forEach((id) => {
            delete clearedMods[id];
          });
          setModifications(clearedMods);

          toast.success(`${successes} équipe(s) mise(s) à jour avec succès`);
          router.refresh();
        }

        if (failures.length > 0) {
          failures.forEach((failure) => {
            if (failure.status === "rejected") {
              console.error("Erreur sauvegarde:", failure.reason);
            }
          });
          toast.error(`${failures.length} erreur(s) lors de la sauvegarde`);
        }
      } catch (error) {
        console.error("Erreur sauvegarde générale:", error);
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  };

  const getEquipeWithModifications = (equipe: Equipe): Equipe => {
    return { ...equipe, ...modifications[equipe.id] };
  };

  const hasUnsavedChanges = selectedEquipes.some((id) => modifications[id]);

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
        <div className="bg-gradient-to-r from-primary/90 to-secondary/90 text-primary-foreground p-8 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 font-sport text-9xl">
            ⚙️
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <Link
                href="/equipes"
                className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour aux équipes
              </Link>
              <h1 className="text-4xl font-sport font-extrabold uppercase tracking-tight">
                Gestion Avancée
              </h1>
              <p className="text-primary-foreground/80 mt-2 text-lg font-medium">
                Configuration détaillée de vos équipes
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isPending}
                variant="secondary"
                size="sm"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder ({Object.keys(modifications).length})
              </Button>
            </div>
          </div>
        </div>

        {/* Actions en lot */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sport uppercase tracking-wide">
              <Building2 className="h-5 w-5 text-primary" />
              Sélection Multiple
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <span className="text-sm text-muted-foreground">
                {selectedEquipes.length} équipe(s) sélectionnée(s)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllEquipes}
                disabled={isPending}
              >
                Tout sélectionner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={selectedEquipes.length === 0 || isPending}
              >
                Désélectionner
              </Button>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="ml-auto">
                  {Object.keys(modifications).length} modification(s) en attente
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Liste des équipes */}
        <div className="space-y-6">
          {equipes.map((equipe) => {
            const equipeWithMods = getEquipeWithModifications(equipe);
            const isSelected = selectedEquipes.includes(equipe.id);
            const hasModifications = !!modifications[equipe.id];

            return (
              <Card
                key={equipe.id}
                className={`transition-all duration-300 ${
                  isSelected
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:shadow-md"
                } ${hasModifications ? "border-orange-300 bg-orange-50/50" : ""}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleEquipeToggle(equipe.id)}
                        disabled={isPending}
                      />
                      <div>
                        <h3 className="text-xl font-sport uppercase font-bold">
                          {equipe.nom}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {equipe.ville}
                          </div>
                          {equipe.club && (
                            <Badge variant="outline" className="text-xs">
                              {equipe.club.nom}
                            </Badge>
                          )}
                          {equipe._count && (
                            <>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {equipe._count.joueurs} joueurs
                              </div>
                              <div className="flex items-center gap-1">
                                <Trophy className="h-4 w-4" />
                                {equipe._count.competitions} compétitions
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {hasModifications && (
                      <Badge variant="secondary">Modifiée</Badge>
                    )}
                  </div>
                </CardHeader>

                {isSelected && (
                  <CardContent className="space-y-6 pt-0">
                    {/* Informations géographiques */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`region-${equipe.id}`}>Région</Label>
                        <Select
                          value={equipeWithMods.region || ""}
                          onValueChange={(value) =>
                            handleFieldChange(equipe.id, "region", value)
                          }
                          disabled={isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une région" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Aucune région</SelectItem>
                            {REGIONS.map((region) => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`departement-${equipe.id}`}>
                          Département
                        </Label>
                        <Select
                          value={equipeWithMods.departement || ""}
                          onValueChange={(value) =>
                            handleFieldChange(equipe.id, "departement", value)
                          }
                          disabled={isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un département" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Aucun département</SelectItem>
                            {DEPARTEMENTS.map((dept) => (
                              <SelectItem key={dept.code} value={dept.code}>
                                {dept.code} - {dept.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label htmlFor={`notes-${equipe.id}`}>
                        <FileText className="inline h-4 w-4 mr-1" />
                        Notes et commentaires
                      </Label>
                      <textarea
                        id={`notes-${equipe.id}`}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-none"
                        rows={3}
                        placeholder="Ajoutez des notes ou commentaires sur cette équipe..."
                        value={equipeWithMods.notes || ""}
                        onChange={(e) =>
                          handleFieldChange(equipe.id, "notes", e.target.value)
                        }
                        disabled={isPending}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {equipes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucune équipe trouvée</p>
            <p className="text-sm mt-2">
              Vous n'avez accès à aucune équipe pour le moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
