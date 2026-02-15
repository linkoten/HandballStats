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
import {
  Loader2,
  Search,
  Plus,
  Building,
  MapPin,
  Users,
  ArrowRight,
} from "lucide-react";
import { selectOnboardingClub, createClub } from "@/app/actions";
import { toast } from "sonner";

type UserData = {
  tokensRemaining: number;
  subscription: string;
  id: number;
  role: string;
};

type Club = {
  id: number;
  nom: string;
  ville: string;
  region: string | null;
  departement: string | null;
  _count: {
    equipes: number;
  };
};

interface OnboardingClubClientProps {
  initialUserData: UserData | null;
  initialTokensData: any;
  clubs: Club[];
  error?: string;
}

export default function OnboardingClubClient({
  initialUserData,
  initialTokensData,
  clubs,
  error,
}: OnboardingClubClientProps) {
  const router = useRouter();
  const [userData] = useState<UserData | null>(initialUserData);
  const [allClubs] = useState<Club[]>(clubs);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>(clubs);
  const [isPending, startTransition] = useTransition();

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedDepartement, setSelectedDepartement] = useState<string>("all");
  const [selectedVille, setSelectedVille] = useState<string>("all");

  // Sélection et création
  const [selectedClub, setSelectedClub] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Formulaire création club
  const [newClubForm, setNewClubForm] = useState({
    nom: "",
    ville: "",
    region: "",
    departement: "",
  });

  // Extraire les valeurs uniques pour les filtres
  const regions = [
    ...new Set(allClubs.map((club) => club.region).filter(Boolean)),
  ].sort();
  const departements = [
    ...new Set(allClubs.map((club) => club.departement).filter(Boolean)),
  ].sort();
  const villes = [
    ...new Set(allClubs.map((club) => club.ville).filter(Boolean)),
  ].sort();

  // Filtrage des clubs
  useEffect(() => {
    let filtered = allClubs;

    // Filtrer par région
    if (selectedRegion !== "all") {
      filtered = filtered.filter((club) => club.region === selectedRegion);
    }

    // Filtrer par département
    if (selectedDepartement !== "all") {
      filtered = filtered.filter(
        (club) => club.departement === selectedDepartement,
      );
    }

    // Filtrer par ville
    if (selectedVille !== "all") {
      filtered = filtered.filter((club) => club.ville === selectedVille);
    }

    // Filtrer par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (club) =>
          club.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          club.ville.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredClubs(filtered);
  }, [
    allClubs,
    selectedRegion,
    selectedDepartement,
    selectedVille,
    searchTerm,
  ]);

  const handleContinue = async () => {
    if (!selectedClub) {
      toast.error("Veuillez sélectionner un club");
      return;
    }

    startTransition(async () => {
      try {
        const result = await selectOnboardingClub(selectedClub);

        if (result.success) {
          toast.success("Club sélectionné avec succès");
          router.push("/onboarding/teams");
        } else {
          toast.error(result.error || "Erreur lors de la sélection du club");
        }
      } catch (error) {
        console.error("Erreur sélection club:", error);
        toast.error("Erreur lors de la sélection du club");
      }
    });
  };

  const handleCreateClub = async () => {
    if (!newClubForm.nom.trim() || !newClubForm.ville.trim()) {
      toast.error("Veuillez remplir au moins le nom et la ville");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createClub({
          nom: newClubForm.nom.trim(),
          ville: newClubForm.ville.trim(),
          region: newClubForm.region.trim() || undefined,
          departement: newClubForm.departement.trim() || undefined,
        });

        if (result.success && result.data) {
          toast.success(
            "Club créé avec succès ! Redirection vers le dashboard...",
          );

          // Rediriger vers le dashboard après création
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        } else {
          toast.error(result.error || "Erreur lors de la création du club");
        }
      } catch (error) {
        console.error("Erreur création club:", error);
        toast.error("Erreur lors de la création du club");
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
            <Button onClick={() => router.refresh()}>Réessayer</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-6">
            <Building className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-sport font-extrabold uppercase tracking-tight mb-4">
            Sélection du Club
          </h1>
          <p className="text-muted-foreground">
            Choisissez votre club ou créez-en un nouveau
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
                <Badge variant="default">
                  {userData.tokensRemaining} token(s)
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtres et recherche */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              Rechercher un club ({filteredClubs.length} clubs)
            </CardTitle>
            <CardDescription>
              Utilisez les filtres pour trouver votre club
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Recherche textuelle */}
              <div className="lg:col-span-2">
                <Label htmlFor="search">Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Nom du club ou ville..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Filtre par région */}
              <div>
                <Label htmlFor="region">Région</Label>
                <Select
                  value={selectedRegion}
                  onValueChange={setSelectedRegion}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les régions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les régions</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region!}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtre par département */}
              <div>
                <Label htmlFor="departement">Département</Label>
                <Select
                  value={selectedDepartement}
                  onValueChange={setSelectedDepartement}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les départements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les départements</SelectItem>
                    {departements.map((dep) => (
                      <SelectItem key={dep} value={dep!}>
                        {dep}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Dialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={isPending}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un club
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un nouveau club</DialogTitle>
                    <DialogDescription>
                      Ajoutez un nouveau club à la base de données
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nom">Nom du club *</Label>
                      <Input
                        id="nom"
                        placeholder="Ex: Association Sportive Club Rennais"
                        value={newClubForm.nom}
                        onChange={(e) =>
                          setNewClubForm((prev) => ({
                            ...prev,
                            nom: e.target.value,
                          }))
                        }
                        disabled={isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ville">Ville *</Label>
                      <Input
                        id="ville"
                        placeholder="Ex: Rennes"
                        value={newClubForm.ville}
                        onChange={(e) =>
                          setNewClubForm((prev) => ({
                            ...prev,
                            ville: e.target.value,
                          }))
                        }
                        disabled={isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="region">Région</Label>
                      <Input
                        id="region"
                        placeholder="Ex: Bretagne"
                        value={newClubForm.region}
                        onChange={(e) =>
                          setNewClubForm((prev) => ({
                            ...prev,
                            region: e.target.value,
                          }))
                        }
                        disabled={isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="departement">Département</Label>
                      <Input
                        id="departement"
                        placeholder="Ex: 35"
                        value={newClubForm.departement}
                        onChange={(e) =>
                          setNewClubForm((prev) => ({
                            ...prev,
                            departement: e.target.value,
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
                      <Button onClick={handleCreateClub} disabled={isPending}>
                        {isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Créer
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {selectedClub && (
                <Button onClick={handleContinue} disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Continuer
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Liste des clubs */}
        <Card>
          <CardContent className="p-6">
            {isPending && filteredClubs.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredClubs.length > 0 ? (
              <div className="grid gap-4 max-h-[600px] overflow-y-auto">
                {filteredClubs.map((club) => (
                  <Card
                    key={club.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedClub === club.id
                        ? "ring-2 ring-primary bg-primary/5"
                        : "hover:shadow-md"
                    }`}
                    onClick={() => setSelectedClub(club.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Building className="w-5 h-5 text-primary" />
                            {club.nom}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {club.ville}
                              {club.departement && ` (${club.departement})`}
                            </span>
                            {club.region && <span>{club.region}</span>}
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {club._count.equipes} équipe(s)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {selectedClub === club.id && (
                            <Badge variant="default">Sélectionné</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Building className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucun club trouvé</p>
                <p className="text-sm mt-2">
                  {searchTerm ||
                  selectedRegion !== "all" ||
                  selectedDepartement !== "all" ||
                  selectedVille !== "all"
                    ? "Aucun club ne correspond à vos filtres"
                    : "Aucun club disponible"}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(true)}
                  className="mt-4"
                  disabled={isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un nouveau club
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Club sélectionné */}
        {selectedClub && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-2">Club sélectionné</h3>
                  {filteredClubs.find((c) => c.id === selectedClub) && (
                    <p className="text-sm text-muted-foreground">
                      {filteredClubs.find((c) => c.id === selectedClub)!.nom} -{" "}
                      {filteredClubs.find((c) => c.id === selectedClub)!.ville}
                    </p>
                  )}
                </div>
                <Button onClick={handleContinue} disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Continuer vers les équipes
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
