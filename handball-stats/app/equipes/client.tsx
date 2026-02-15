"use client";

import { useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Users,
  Plus,
  Edit3,
  Trash2,
  Trophy,
  UserPlus,
  Calendar,
  MapPin,
  Building,
} from "lucide-react";
import Link from "next/link";
import {
  createEquipe,
  updateEquipe,
  deleteEquipe,
  getEquipesByClub,
} from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Club = {
  id: number;
  nom: string;
  _count: {
    equipes: number;
  };
};

type Equipe = {
  id: number;
  nom: string;
  ville: string | null;
  region?: string | null;
  departement?: string | null;
  status?: string;
  clubId: number | null;
  club: {
    id: number;
    nom: string;
  } | null;
  _count: {
    joueurs: number;
    competitions: number;
  };
};

interface EquipesClientProps {
  initialClubs: Club[];
  initialEquipes: Equipe[];
  error?: string;
}

export default function EquipesClient({
  initialClubs,
  initialEquipes,
  error,
}: EquipesClientProps) {
  const { user } = useUser();
  const [clubs] = useState<Club[]>(initialClubs);
  const [equipes, setEquipes] = useState<Equipe[]>(initialEquipes);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(
    clubs.length > 0 ? clubs[0].id : null,
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    ville: "",
    region: "",
    departement: "",
    clubId: selectedClubId || "",
  });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Filtrer les équipes par club sélectionné
  const filteredEquipes = selectedClubId
    ? equipes.filter((equipe) => equipe.club?.id === selectedClubId)
    : equipes;

  const handleRefreshEquipes = async () => {
    if (!selectedClubId) return;

    startTransition(async () => {
      try {
        const result = await getEquipesByClub(String(selectedClubId));
        if (result.success) {
          setEquipes((prev) => [
            ...prev.filter((e) => !e.club || e.club.id !== selectedClubId),
            ...result.data,
          ]);
          toast.success("Équipes actualisées");
        } else {
          toast.error(result.error || "Erreur lors de l'actualisation");
        }
      } catch (error) {
        console.error("Erreur refresh équipes:", error);
        toast.error("Erreur lors de l'actualisation");
      }
    });
  };

  const handleCreateEquipe = async () => {
    if (!formData.nom.trim() || !formData.ville.trim() || !formData.clubId) {
      toast.error("Le nom, la ville et le club sont obligatoires");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createEquipe({
          nom: formData.nom.trim(),
          ville: formData.ville.trim(),
          region: formData.region.trim() || undefined,
          departement: formData.departement.trim() || undefined,
          clubId: Number(formData.clubId),
        });

        if (result.success && result.data) {
          setEquipes((prev) => [...prev, result.data]);
          setFormData({
            nom: "",
            ville: "",
            region: "",
            departement: "",
            clubId: selectedClubId || "",
          });
          setShowCreateDialog(false);
          toast.success("Équipe créée avec succès");
          router.refresh();
        } else {
          toast.error(result.error || "Erreur lors de la création");
        }
      } catch (error) {
        console.error("Erreur création équipe:", error);
        toast.error("Erreur lors de la création");
      }
    });
  };

  const handleUpdateEquipe = async () => {
    if (!editingEquipe || !formData.nom.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateEquipe(editingEquipe.id, {
          nom: formData.nom.trim(),
          ville: formData.ville.trim(),
        });

        if (result.success && result.data) {
          setEquipes((prev) =>
            prev.map((e) => (e.id === editingEquipe.id ? result.data : e)),
          );
          setEditingEquipe(null);
          setFormData({
            nom: "",
            ville: "",
            region: "",
            departement: "",
            clubId: selectedClubId || "",
          });
          toast.success("Équipe modifiée avec succès");
        } else {
          toast.error(result.error || "Erreur lors de la modification");
        }
      } catch (error) {
        console.error("Erreur modification équipe:", error);
        toast.error("Erreur lors de la modification");
      }
    });
  };

  const handleDeleteEquipe = async (equipeId: number) => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer cette équipe ? Cette action est irréversible.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteEquipe(equipeId);

        if (result.success) {
          setEquipes((prev) => prev.filter((e) => e.id !== equipeId));
          toast.success("Équipe supprimée avec succès");
        } else {
          toast.error(result.error || "Erreur lors de la suppression");
        }
      } catch (error) {
        console.error("Erreur suppression équipe:", error);
        toast.error("Erreur lors de la suppression");
      }
    });
  };

  const openCreateDialog = () => {
    setFormData({
      nom: "",
      ville: "",
      region: "",
      departement: "",
      clubId: selectedClubId || "",
    });
    setEditingEquipe(null);
    setShowCreateDialog(true);
  };

  const openEditDialog = (equipe: Equipe) => {
    setFormData({
      nom: equipe.nom,
      ville: equipe.ville || "",
      region: equipe.region || "",
      departement: equipe.departement || "",
      clubId: equipe.club?.id.toString() || "",
    });
    setEditingEquipe(equipe);
    setShowCreateDialog(true);
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
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-linear-to-r from-secondary/90 to-primary/90 text-primary-foreground p-8 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 font-sport text-9xl">
            👥
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <h1 className="text-4xl font-sport font-extrabold uppercase tracking-tight">
                Gestion des Équipes
              </h1>
              <p className="text-primary-foreground/80 mt-2 text-lg font-medium">
                Organisez vos équipes et joueurs
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefreshEquipes}
                disabled={isPending || !selectedClubId}
                variant="secondary"
                size="sm"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualiser
              </Button>
              <Button
                onClick={openCreateDialog}
                disabled={isPending || !selectedClubId}
                variant="secondary"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Équipe
              </Button>
            </div>
          </div>
        </div>

        {/* Sélection du club */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sport uppercase tracking-wide">
              <Building className="h-5 w-5 text-primary" />
              Sélectionner un Club
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clubs.map((club) => (
                <Card
                  key={club.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                    selectedClubId === club.id
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:border-primary/40"
                  }`}
                  onClick={() => setSelectedClubId(club.id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-sport uppercase">
                      {club.nom}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {club._count.equipes} équipe
                        {club._count.equipes > 1 ? "s" : ""}
                      </span>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {clubs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Vous n'avez accès à aucun club.</p>
                <p className="text-sm mt-2">
                  Demandez à un administrateur de vous inviter.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des équipes */}
        {selectedClubId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-sport uppercase tracking-wide">
                <Users className="h-5 w-5 text-secondary" />
                Équipes du Club
              </CardTitle>
              <CardDescription>
                {filteredEquipes.length} équipe
                {filteredEquipes.length > 1 ? "s" : ""} trouvée
                {filteredEquipes.length > 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEquipes.length > 0 ? (
                <div className="grid gap-4">
                  {filteredEquipes.map((equipe) => (
                    <div
                      key={equipe.id}
                      className="flex items-center justify-between p-6 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold font-sport uppercase text-lg">
                            {equipe.nom}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {equipe.club?.nom || "Sans club"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {equipe.ville || "Ville non renseignée"}
                          </div>
                          <div className="flex items-center gap-1">
                            <UserPlus className="h-4 w-4" />
                            {equipe._count.joueurs} joueur
                            {equipe._count.joueurs > 1 ? "s" : ""}
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            {equipe._count.competitions} compétition
                            {equipe._count.competitions > 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/equipes/${equipe.id}`}>
                          <Button size="sm" variant="outline">
                            <Calendar className="h-4 w-4 mr-2" />
                            Détails
                          </Button>
                        </Link>
                        <Link
                          href={`/onboarding/create-competition?equipeId=${equipe.id}`}
                        >
                          <Button size="sm" variant="default">
                            <Trophy className="h-4 w-4 mr-2" />
                            Compétitions
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(equipe)}
                          disabled={isPending}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteEquipe(equipe.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Aucune équipe trouvée</p>
                  <p className="text-sm mt-2">
                    Créez votre première équipe pour commencer.
                  </p>
                  <Button
                    onClick={openCreateDialog}
                    className="mt-4"
                    disabled={isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer une équipe
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dialog de création/édition */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEquipe
                  ? "Modifier l'équipe"
                  : "Créer une nouvelle équipe"}
              </DialogTitle>
              <DialogDescription>
                {editingEquipe
                  ? "Modifiez les informations de l'équipe"
                  : "Remplissez les informations pour créer une nouvelle équipe"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom de l'équipe</Label>
                <Input
                  id="nom"
                  placeholder="Ex: Seniors Masculins"
                  value={formData.nom}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nom: e.target.value }))
                  }
                  disabled={isPending}
                />
              </div>
              <div>
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  placeholder="Ex: Paris"
                  value={formData.ville}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ville: e.target.value }))
                  }
                  disabled={isPending}
                />
              </div>
              <div>
                <Label htmlFor="region">Région (optionnel)</Label>
                <Input
                  id="region"
                  placeholder="Ex: Île-de-France"
                  value={formData.region}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, region: e.target.value }))
                  }
                  disabled={isPending}
                />
              </div>
              <div>
                <Label htmlFor="departement">Département (optionnel)</Label>
                <Input
                  id="departement"
                  placeholder="Ex: 75"
                  value={formData.departement}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      departement: e.target.value,
                    }))
                  }
                  disabled={isPending}
                />
              </div>
              {!editingEquipe && (
                <div>
                  <Label htmlFor="clubId">Club</Label>
                  <select
                    id="clubId"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    value={formData.clubId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        clubId: e.target.value,
                      }))
                    }
                    disabled={isPending}
                  >
                    <option value="">Sélectionner un club</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button
                  onClick={
                    editingEquipe ? handleUpdateEquipe : handleCreateEquipe
                  }
                  disabled={isPending}
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingEquipe ? "Modifier" : "Créer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
