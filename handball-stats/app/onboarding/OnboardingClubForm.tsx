"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClub } from "@/app/actions/club-actions";

export default function OnboardingClubForm() {
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [region, setRegion] = useState("");
  const [departement, setDepartement] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Liste exhaustive des régions et départements français (hors DOM-TOM)
  const regions = [
    { value: "", label: "Choisir une région" },
    { value: "Auvergne-Rhône-Alpes", label: "Auvergne-Rhône-Alpes" },
    { value: "Bourgogne-Franche-Comté", label: "Bourgogne-Franche-Comté" },
    { value: "Bretagne", label: "Bretagne" },
    { value: "Centre-Val de Loire", label: "Centre-Val de Loire" },
    { value: "Corse", label: "Corse" },
    { value: "Grand Est", label: "Grand Est" },
    { value: "Hauts-de-France", label: "Hauts-de-France" },
    { value: "Île-de-France", label: "Île-de-France" },
    { value: "Normandie", label: "Normandie" },
    { value: "Nouvelle-Aquitaine", label: "Nouvelle-Aquitaine" },
    { value: "Occitanie", label: "Occitanie" },
    { value: "Pays de la Loire", label: "Pays de la Loire" },
    {
      value: "Provence-Alpes-Côte d'Azur",
      label: "Provence-Alpes-Côte d'Azur",
    },
    { value: "DOM-TOM", label: "DOM-TOM" },
  ];
  const departementsByRegion: Record<
    string,
    { value: string; label: string }[]
  > = {
    "Auvergne-Rhône-Alpes": [
      { value: "01", label: "Ain (01)" },
      { value: "03", label: "Allier (03)" },
      { value: "07", label: "Ardèche (07)" },
      { value: "15", label: "Cantal (15)" },
      { value: "26", label: "Drôme (26)" },
      { value: "38", label: "Isère (38)" },
      { value: "42", label: "Loire (42)" },
      { value: "43", label: "Haute-Loire (43)" },
      { value: "63", label: "Puy-de-Dôme (63)" },
      { value: "69", label: "Rhône (69)" },
      { value: "73", label: "Savoie (73)" },
      { value: "74", label: "Haute-Savoie (74)" },
    ],
    "Bourgogne-Franche-Comté": [
      { value: "21", label: "Côte-d'Or (21)" },
      { value: "25", label: "Doubs (25)" },
      { value: "39", label: "Jura (39)" },
      { value: "58", label: "Nièvre (58)" },
      { value: "70", label: "Haute-Saône (70)" },
      { value: "71", label: "Saône-et-Loire (71)" },
      { value: "89", label: "Yonne (89)" },
      { value: "90", label: "Territoire de Belfort (90)" },
    ],
    Bretagne: [
      { value: "22", label: "Côtes-d'Armor (22)" },
      { value: "29", label: "Finistère (29)" },
      { value: "35", label: "Ille-et-Vilaine (35)" },
      { value: "56", label: "Morbihan (56)" },
    ],
    "Centre-Val de Loire": [
      { value: "18", label: "Cher (18)" },
      { value: "28", label: "Eure-et-Loir (28)" },
      { value: "36", label: "Indre (36)" },
      { value: "37", label: "Indre-et-Loire (37)" },
      { value: "41", label: "Loir-et-Cher (41)" },
      { value: "45", label: "Loiret (45)" },
    ],
    Corse: [
      { value: "2A", label: "Corse-du-Sud (2A)" },
      { value: "2B", label: "Haute-Corse (2B)" },
    ],
    "Grand Est": [
      { value: "08", label: "Ardennes (08)" },
      { value: "10", label: "Aube (10)" },
      { value: "51", label: "Marne (51)" },
      { value: "52", label: "Haute-Marne (52)" },
      { value: "54", label: "Meurthe-et-Moselle (54)" },
      { value: "55", label: "Meuse (55)" },
      { value: "57", label: "Moselle (57)" },
      { value: "67", label: "Bas-Rhin (67)" },
      { value: "68", label: "Haut-Rhin (68)" },
      { value: "88", label: "Vosges (88)" },
    ],
    "Hauts-de-France": [
      { value: "02", label: "Aisne (02)" },
      { value: "59", label: "Nord (59)" },
      { value: "60", label: "Oise (60)" },
      { value: "62", label: "Pas-de-Calais (62)" },
      { value: "80", label: "Somme (80)" },
    ],
    "Île-de-France": [
      { value: "75", label: "Paris (75)" },
      { value: "77", label: "Seine-et-Marne (77)" },
      { value: "78", label: "Yvelines (78)" },
      { value: "91", label: "Essonne (91)" },
      { value: "92", label: "Hauts-de-Seine (92)" },
      { value: "93", label: "Seine-Saint-Denis (93)" },
      { value: "94", label: "Val-de-Marne (94)" },
      { value: "95", label: "Val-d'Oise (95)" },
    ],
    Normandie: [
      { value: "14", label: "Calvados (14)" },
      { value: "27", label: "Eure (27)" },
      { value: "50", label: "Manche (50)" },
      { value: "61", label: "Orne (61)" },
      { value: "76", label: "Seine-Maritime (76)" },
    ],
    "Nouvelle-Aquitaine": [
      { value: "16", label: "Charente (16)" },
      { value: "17", label: "Charente-Maritime (17)" },
      { value: "19", label: "Corrèze (19)" },
      { value: "23", label: "Creuse (23)" },
      { value: "24", label: "Dordogne (24)" },
      { value: "33", label: "Gironde (33)" },
      { value: "40", label: "Landes (40)" },
      { value: "47", label: "Lot-et-Garonne (47)" },
      { value: "64", label: "Pyrénées-Atlantiques (64)" },
      { value: "79", label: "Deux-Sèvres (79)" },
      { value: "86", label: "Vienne (86)" },
      { value: "87", label: "Haute-Vienne (87)" },
    ],
    Occitanie: [
      { value: "09", label: "Ariège (09)" },
      { value: "11", label: "Aude (11)" },
      { value: "12", label: "Aveyron (12)" },
      { value: "30", label: "Gard (30)" },
      { value: "31", label: "Haute-Garonne (31)" },
      { value: "32", label: "Gers (32)" },
      { value: "34", label: "Hérault (34)" },
      { value: "46", label: "Lot (46)" },
      { value: "48", label: "Lozère (48)" },
      { value: "65", label: "Hautes-Pyrénées (65)" },
      { value: "66", label: "Pyrénées-Orientales (66)" },
      { value: "81", label: "Tarn (81)" },
      { value: "82", label: "Tarn-et-Garonne (82)" },
    ],
    "Pays de la Loire": [
      { value: "44", label: "Loire-Atlantique (44)" },
      { value: "49", label: "Maine-et-Loire (49)" },
      { value: "53", label: "Mayenne (53)" },
      { value: "72", label: "Sarthe (72)" },
      { value: "85", label: "Vendée (85)" },
    ],
    "Provence-Alpes-Côte d'Azur": [
      { value: "04", label: "Alpes-de-Haute-Provence (04)" },
      { value: "05", label: "Hautes-Alpes (05)" },
      { value: "06", label: "Alpes-Maritimes (06)" },
      { value: "13", label: "Bouches-du-Rhône (13)" },
      { value: "83", label: "Var (83)" },
      { value: "84", label: "Vaucluse (84)" },
    ],
    "DOM-TOM": [
      { value: "971", label: "Guadeloupe (971)" },
      { value: "972", label: "Martinique (972)" },
      { value: "973", label: "Guyane (973)" },
      { value: "974", label: "La Réunion (974)" },
      { value: "976", label: "Mayotte (976)" },
    ],
  };

  const departementsOptions =
    region && departementsByRegion[region] ? departementsByRegion[region] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createClub({ nom, ville, region, departement });
      if (res.success) {
        window.location.href = "/dashboard";
      } else {
        setError(res.error || "Erreur lors de la création du club");
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du club");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full bg-card/40 rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center font-sport uppercase">
          Bienvenue !
        </h1>
        <p className="mb-6 text-muted-foreground text-center">
          Pour commencer, créez votre premier club afin d'accéder à toutes les
          fonctionnalités du dashboard.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nom du club *
            </label>
            <input
              name="nom"
              required
              className="w-full px-3 py-2 border rounded"
              placeholder="Nom du club"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ville</label>
            <input
              name="ville"
              className="w-full px-3 py-2 border rounded"
              placeholder="Ville"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Région</label>
            <select
              name="region"
              className="w-full px-3 py-2 border rounded"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setDepartement("");
              }}
              required
            >
              {regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Département
            </label>
            <select
              name="departement"
              className="w-full px-3 py-2 border rounded"
              value={departement}
              onChange={(e) => setDepartement(e.target.value)}
              required={!!region}
              disabled={!region}
            >
              <option value="">
                {region
                  ? "Choisir un département"
                  : "Sélectionnez d'abord une région"}
              </option>
              {departementsOptions.map((dep) => (
                <option key={dep.value} value={dep.value}>
                  {dep.label}
                </option>
              ))}
            </select>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? "Création..." : "Créer le club"}
          </Button>
        </form>
        <div className="flex flex-col gap-4 mt-8">
          <Button asChild className="w-full" variant="secondary">
            <Link href="/dashboard">Passer (démo)</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
