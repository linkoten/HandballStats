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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Search, Plus } from "lucide-react";

type Club = {
  id: number;
  nom: string;
  ville: string;
  region: string | null;
  departement: string | null;
  equipesCount: number;
};

type Filters = {
  regions: string[];
  departements: string[];
  villes: string[];
};

export default function OnboardingClubPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [filters, setFilters] = useState<Filters>({
    regions: [],
    departements: [],
    villes: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedDepartement, setSelectedDepartement] = useState<string>("all");
  const [selectedVille, setSelectedVille] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedClub, setSelectedClub] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Formulaire création
  const [newClub, setNewClub] = useState({
    nom: "",
    club: "",
    ville: "",
    region: "",
    departement: "",
  });

  useEffect(() => {
    fetchClubs();
  }, [selectedRegion, selectedDepartement, selectedVille]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredClubs(clubs);
    } else {
      const filtered = clubs.filter(
        (club) =>
          club.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          club.ville?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClubs(filtered);
    }
  }, [searchTerm, clubs]);

  async function fetchClubs() {
    try {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.append("region", selectedRegion);
      if (selectedDepartement !== "all")
        params.append("departement", selectedDepartement);
      if (selectedVille !== "all") params.append("ville", selectedVille);

      const response = await fetch(`/api/clubs?${params.toString()}`);
      const data = await response.json();

      setClubs(data.clubs);
      setFilteredClubs(data.clubs);
      setFilters(data.filters);
    } catch (error) {
      console.error("Erreur chargement clubs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    if (!selectedClub) return;

    setSaving(true);
    try {
      const response = await fetch("/api/onboarding/select-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: selectedClub }),
      });

      if (response.ok) {
        router.push("/onboarding/teams");
      } else {
        console.error("Erreur sauvegarde club");
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateClub() {
    if (!newClub.nom || !newClub.club || !newClub.ville) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/clubs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClub),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateDialog(false);
        router.push("/onboarding/teams");
      } else {
        alert(data.error || "Erreur lors de la création du club");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la création du club");
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
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -z-10" />

          <CardHeader className="bg-muted/30 border-b border-border/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-4xl md:text-5xl font-sport font-extrabold uppercase tracking-tighter text-foreground mb-2">
                  Bienvenue ! 🎉
                </CardTitle>
                <CardDescription className="text-base font-medium text-muted-foreground uppercase tracking-wide">
                  Commençons par sélectionner votre club principal
                </CardDescription>
              </div>
              <Dialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
              >
                <DialogTrigger asChild>
                  <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg font-sport uppercase tracking-wide">
                    <Plus className="mr-2 h-4 w-4" />✨ Créer un club
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border border-border/50">
                  <DialogHeader>
                    <DialogTitle className="font-sport uppercase tracking-wide">
                      Créer un nouveau club
                    </DialogTitle>
                    <DialogDescription>
                      Remplissez les informations de votre club
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="club"
                          className="text-muted-foreground font-bold text-xs uppercase tracking-wide"
                        >
                          Nom du club *
                        </Label>
                        <Input
                          id="club"
                          placeholder="ex: ASCR Handball"
                          value={newClub.club}
                          onChange={(e) =>
                            setNewClub({ ...newClub, club: e.target.value })
                          }
                          className="bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="nom"
                          className="text-muted-foreground font-bold text-xs uppercase tracking-wide"
                        >
                          Nom de l'équipe *
                        </Label>
                        <Input
                          id="nom"
                          placeholder="ex: ASCR 1 Masculin"
                          value={newClub.nom}
                          onChange={(e) =>
                            setNewClub({ ...newClub, nom: e.target.value })
                          }
                          className="bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="ville"
                          className="text-muted-foreground font-bold text-xs uppercase tracking-wide"
                        >
                          Ville *
                        </Label>
                        <Input
                          id="ville"
                          placeholder="ex: Rennes"
                          value={newClub.ville}
                          onChange={(e) =>
                            setNewClub({ ...newClub, ville: e.target.value })
                          }
                          className="bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="region"
                          className="text-muted-foreground font-bold text-xs uppercase tracking-wide"
                        >
                          Région
                        </Label>
                        <Input
                          id="region"
                          placeholder="ex: Bretagne"
                          value={newClub.region}
                          onChange={(e) =>
                            setNewClub({ ...newClub, region: e.target.value })
                          }
                          className="bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="departement"
                        className="text-muted-foreground font-bold text-xs uppercase tracking-wide"
                      >
                        Département
                      </Label>
                      <Input
                        id="departement"
                        placeholder="ex: 35"
                        value={newClub.departement}
                        onChange={(e) =>
                          setNewClub({
                            ...newClub,
                            departement: e.target.value,
                          })
                        }
                        className="bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-colors"
                      />
                    </div>
                    <Button
                      onClick={handleCreateClub}
                      disabled={saving}
                      className="w-full font-sport uppercase tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Création...
                        </>
                      ) : (
                        "Créer le club"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Filtres */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-lg border border-border/50">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Région
                </Label>
                <Select
                  value={selectedRegion}
                  onValueChange={(value) => {
                    setSelectedRegion(value);
                    // Réinitialiser les filtres enfants quand on change la région
                    setSelectedDepartement("all");
                    setSelectedVille("all");
                  }}
                >
                  <SelectTrigger className="bg-background/50 border-input hover:border-primary/50 focus:ring-primary/20">
                    <SelectValue placeholder="Toutes les régions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les régions</SelectItem>
                    {filters.regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Département
                </Label>
                <Select
                  value={selectedDepartement}
                  onValueChange={(value) => {
                    setSelectedDepartement(value);
                    // Réinitialiser la ville quand on change le département
                    setSelectedVille("all");
                  }}
                >
                  <SelectTrigger className="bg-background/50 border-input hover:border-primary/50 focus:ring-primary/20">
                    <SelectValue placeholder="Tous les départements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les départements</SelectItem>
                    {filters.departements.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Ville
                </Label>
                <Select value={selectedVille} onValueChange={setSelectedVille}>
                  <SelectTrigger className="bg-background/50 border-input hover:border-primary/50 focus:ring-primary/20">
                    <SelectValue placeholder="Toutes les villes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    {filters.villes.map((ville) => (
                      <SelectItem key={ville} value={ville}>
                        {ville}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Recherche
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un club..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Liste des clubs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredClubs.map((club) => (
                <Card
                  key={club.id}
                  className={`cursor-pointer transition-all duration-200 group relative overflow-hidden ${
                    selectedClub === club.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border/50 hover:border-primary/50 hover:bg-card/60 bg-card/40"
                  }`}
                  onClick={() => setSelectedClub(club.id)}
                >
                  {selectedClub === club.id && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                  )}
                  <CardContent className="p-5 relative z-10">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-sport font-bold uppercase tracking-wide text-lg text-foreground group-hover:text-primary transition-colors">
                        {club.nom}
                      </h3>
                      {selectedClub === club.id && (
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                          <span className="text-primary-foreground text-xs font-bold">
                            ✓
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wide">
                      <span>📍 {club.ville}</span>
                      {club.departement && <span>• {club.departement}</span>}
                    </div>
                    <div className="mt-4 inline-flex items-center px-2 py-1 rounded bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-wide border border-secondary/20">
                      🏀 {club.equipesCount} équipe
                      {club.equipesCount > 1 ? "s" : ""}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredClubs.length === 0 && (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border/50">
                <div className="text-5xl mb-4 opacity-50">🔍</div>
                <p className="text-muted-foreground mb-4 text-lg font-medium">
                  Aucun club trouvé avec ces critères
                </p>
                <Button
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-sport uppercase tracking-wide"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer mon club
                </Button>
              </div>
            )}

            {/* Bouton continuer */}
            <div className="flex justify-end pt-4 border-t border-border/50">
              <Button
                onClick={handleContinue}
                disabled={!selectedClub || saving}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-sport uppercase tracking-wide shadow-lg px-8 transition-all hover:translate-x-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>Continuer →</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
