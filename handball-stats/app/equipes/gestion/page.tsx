"use client";

import { useState, useEffect } from "react";
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
  { code: "50", nom: "Manche" },
  { code: "53", nom: "Mayenne" },
  { code: "72", nom: "Sarthe" },
  { code: "85", nom: "Vendée" },
];

export default function GestionEquipesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Champs du formulaire
  const [ville, setVille] = useState("");
  const [club, setClub] = useState("");
  const [region, setRegion] = useState("");
  const [departement, setDepartement] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchEquipes();
  }, []);

  const fetchEquipes = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/equipes/all");
      const data = await response.json();
      setEquipes(data);
    } catch (error) {
      console.error("Erreur lors du chargement des équipes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(equipes.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectEquipe = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) {
      alert("Veuillez sélectionner au moins une équipe");
      return;
    }

    if (!ville && !region && !departement && !notes) {
      alert("Veuillez remplir au moins un champ");
      return;
    }

    setUpdating(true);
    try {
      // Mettre à jour les métadonnées pour chaque équipe sélectionnée
      const promises = selectedIds.map((equipeId) =>
        fetch(`/api/equipes/${equipeId}/metadata`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ville: ville || undefined,
            region: region && region !== "none" ? region : undefined,
            departement:
              departement && departement !== "none" ? departement : undefined,
            notes: notes || undefined,
          }),
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.ok).length;

      if (successCount === selectedIds.length) {
        alert(`✅ ${successCount} équipe(s) mise(s) à jour avec succès !`);
      } else {
        alert(
          `⚠️ ${successCount}/${selectedIds.length} équipe(s) mise(s) à jour`
        );
      }

      // Réinitialiser les champs et la sélection
      setVille("");
      setClub("");
      setRegion("");
      setDepartement("");
      setNotes("");
      setSelectedIds([]);

      // Recharger les équipes
      await fetchEquipes();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert(
        `❌ Erreur: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    } finally {
      setUpdating(false);
    }
  };

  const allSelected =
    equipes.length > 0 && selectedIds.length === equipes.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/equipes"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium mb-6 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">
              ←
            </span>
            Retour aux équipes
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-5xl">⚙️</div>
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Gestion des Équipes
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                {selectedIds.length > 0 && (
                  <span className="font-semibold text-blue-600">
                    {selectedIds.length} équipe(s) sélectionnée(s)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des équipes */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Liste des équipes ({equipes.length})</span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <Label
                      htmlFor="select-all"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Tout sélectionner
                    </Label>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-gray-500">
                    Chargement...
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {equipes.map((equipe) => (
                      <div
                        key={equipe.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          selectedIds.includes(equipe.id)
                            ? "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700"
                            : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                        }`}
                      >
                        <Checkbox
                          id={`equipe-${equipe.id}`}
                          checked={selectedIds.includes(equipe.id)}
                          onCheckedChange={(checked) =>
                            handleSelectEquipe(equipe.id, checked as boolean)
                          }
                          className="data-[state=checked]:bg-blue-600"
                        />
                        <Label
                          htmlFor={`equipe-${equipe.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{equipe.nom}</span>
                            {equipe.hasCustomData && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                ✏️ Personnalisé
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {equipe.club && (
                              <span className="mr-3">🏢 {equipe.club.nom}</span>
                            )}
                            {equipe.ville && (
                              <span className="mr-3">📍 {equipe.ville}</span>
                            )}
                            {equipe.departement && (
                              <span className="mr-3">
                                🗺️ {equipe.departement}
                              </span>
                            )}
                            {equipe.region && <span>🌍 {equipe.region}</span>}
                          </div>
                          {equipe.notes && (
                            <div className="text-xs text-gray-400 mt-1 italic">
                              📝 {equipe.notes}
                            </div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Formulaire de mise à jour */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Personnaliser les équipes</CardTitle>
                <p className="text-sm text-gray-500 mt-2">
                  ✏️ Ces modifications sont personnelles et n'affectent que
                  votre compte
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    ℹ️ <strong>Le nom de l'équipe</strong> ne peut pas être
                    modifié (donnée factuelle partagée)
                  </p>
                </div>

                <div>
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    placeholder="Ex: Rennes"
                  />
                </div>

                <div>
                  <Label htmlFor="region">Région</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger id="region">
                      <SelectValue placeholder="Sélectionner une région" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="departement">Département</Label>
                  <Select value={departement} onValueChange={setDepartement}>
                    <SelectTrigger id="departement">
                      <SelectValue placeholder="Sélectionner un département" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {DEPARTEMENTS.map((d) => (
                        <SelectItem key={d.code} value={d.code}>
                          {d.code} - {d.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes personnelles</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Équipe très technique"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleBulkUpdate}
                    disabled={
                      selectedIds.length === 0 ||
                      updating ||
                      (!ville &&
                        (!region || region === "none") &&
                        (!departement || departement === "none") &&
                        !notes)
                    }
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {updating
                      ? "Mise à jour..."
                      : `Personnaliser ${selectedIds.length} équipe(s)`}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Seuls les champs remplis seront mis à jour
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
