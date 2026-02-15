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
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  ArrowLeft,
  Trophy,
  Plus,
  X,
  Globe,
  Cpu,
  Database,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { configureCompetitionsBatch, clearOnboardingData } from "@/app/actions";
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
  _count: {
    equipes: number;
  };
};

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

type CompetitionConfig = {
  url: string;
  equipe: string;
  equipe_bdd: string;
  competition_name: string;
  poule: string;
  max_journees: string;
  saison: string;
  phase?: string;
  equipeId: number | null;
};

type ValidationErrors = Partial<Record<keyof CompetitionConfig, string>>;

interface CreateCompetitionClientProps {
  initialUserData: UserData | null;
  initialTokensData: any;
  selectedTeams: Equipe[];
  selectedClub: Club | null;
  error?: string;
}

export default function CreateCompetitionClient({
  initialUserData,
  initialTokensData,
  selectedTeams,
  selectedClub,
  error,
}: CreateCompetitionClientProps) {
  const router = useRouter();
  const [userData] = useState<UserData | null>(initialUserData);
  const [isPending, startTransition] = useTransition();

  // État des compétitions
  const [competitions, setCompetitions] = useState<CompetitionConfig[]>(() => {
    if (selectedTeams.length > 0) {
      return selectedTeams.map((team) => ({
        url: "",
        equipe: team.nom,
        equipe_bdd: team.nom,
        competition_name: "",
        poule: "",
        max_journees: "",
        saison: "2024/2025",
        phase: "",
        equipeId: team.id,
      }));
    }
    return [
      {
        url: "",
        equipe: "",
        equipe_bdd: "",
        competition_name: "",
        poule: "",
        max_journees: "",
        saison: "2024/2025",
        phase: "",
        equipeId: null,
      },
    ];
  });

  const [errors, setErrors] = useState<Record<number, ValidationErrors>>({});
  const [scrapingStatus, setScrapingStatus] = useState<
    "idle" | "scraping" | "success" | "error"
  >("idle");
  const [scrapingProgress, setScrapingProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  // Fonction pour extraire la saison de l'URL FFHandball
  function extractSeasonFromUrl(url: string): string | null {
    const seasonMatch = url.match(/\/saison-(\d{4})-(\d{4})-\d+\//);
    if (seasonMatch) {
      return `${seasonMatch[1]}/${seasonMatch[2]}`;
    }
    return null;
  }

  // Validation de cohérence URL <-> Saison
  function validateUrlSeasonCoherence(
    url: string,
    declaredSeason: string,
  ): string | null {
    if (!url || !declaredSeason) return null;

    const urlSeason = extractSeasonFromUrl(url);
    if (!urlSeason) {
      return "URL invalide: impossible d'extraire la saison";
    }

    if (urlSeason !== declaredSeason) {
      return `Incohérence: l'URL correspond à ${urlSeason}, pas à ${declaredSeason}`;
    }

    return null;
  }

  function validateField(
    field: keyof CompetitionConfig,
    value: string | number | null,
    competitionIndex?: number,
  ): string | null {
    const strValue = String(value || "");

    switch (field) {
      case "url":
        if (!strValue) return "URL obligatoire";
        if (!strValue.match(/^https:\/\/www\.ffhandball\.fr\/competitions\//)) {
          return "URL invalide. Format attendu: https://www.ffhandball.fr/competitions/...";
        }

        // Validation de cohérence avec la saison si disponible
        if (competitionIndex !== undefined) {
          const competition = competitions[competitionIndex];
          if (competition?.saison) {
            const coherenceError = validateUrlSeasonCoherence(
              strValue,
              competition.saison,
            );
            if (coherenceError) {
              return coherenceError;
            }
          }
        }
        return null;

      case "equipe":
        if (!strValue) return "Nom d'équipe obligatoire";
        if (strValue.length < 3) return "Minimum 3 caractères";
        return null;

      case "equipe_bdd":
        if (!strValue) return "Nom d'équipe BDD obligatoire";
        if (strValue.length < 3) return "Minimum 3 caractères";
        return null;

      case "competition_name":
        if (!strValue) return "Nom de compétition obligatoire";
        return null;

      case "poule":
        if (!strValue) return "Code poule obligatoire";
        if (!strValue.match(/^poule-\d+$/)) {
          return "Format invalide. Format attendu: poule-123456";
        }
        return null;

      case "max_journees":
        if (!strValue) return "Nombre de journées obligatoire";
        const num = parseInt(strValue);
        if (isNaN(num) || num < 1 || num > 50) {
          return "Nombre entre 1 et 50";
        }
        return null;

      case "saison":
        if (!strValue) return "Saison obligatoire";
        if (!strValue.match(/^\d{4}\/\d{4}$/)) {
          return "Format invalide. Format attendu: 2024/2025";
        }
        return null;

      default:
        return null;
    }
  }

  function handleChange(
    competitionIndex: number,
    field: keyof CompetitionConfig,
    value: string,
  ) {
    setCompetitions((prev) =>
      prev.map((comp, index) =>
        index === competitionIndex ? { ...comp, [field]: value } : comp,
      ),
    );

    const error = validateField(field, value, competitionIndex);
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (!newErrors[competitionIndex]) {
        newErrors[competitionIndex] = {};
      }
      if (error) {
        newErrors[competitionIndex][field] = error;
      } else {
        delete newErrors[competitionIndex][field];
        if (Object.keys(newErrors[competitionIndex]).length === 0) {
          delete newErrors[competitionIndex];
        }
      }
      return newErrors;
    });
  }

  function addCompetition() {
    setCompetitions((prev) => [
      ...prev,
      {
        url: "",
        equipe: "",
        equipe_bdd: "",
        competition_name: "",
        poule: "",
        max_journees: "",
        saison: "2024/2025",
        phase: "",
        equipeId: null,
      },
    ]);
  }

  function removeCompetition(index: number) {
    if (competitions.length <= 1) return;

    setCompetitions((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      // Réindexer les erreurs
      const reindexedErrors: Record<number, ValidationErrors> = {};
      Object.keys(newErrors).forEach((key) => {
        const oldIndex = parseInt(key);
        if (oldIndex > index) {
          reindexedErrors[oldIndex - 1] = newErrors[oldIndex];
        } else if (oldIndex < index) {
          reindexedErrors[oldIndex] = newErrors[oldIndex];
        }
      });
      return reindexedErrors;
    });
  }

  function validateAllFields(): boolean {
    const newErrors: Record<number, ValidationErrors> = {};
    let hasErrors = false;

    competitions.forEach((competition, index) => {
      const competitionErrors: ValidationErrors = {};

      (Object.keys(competition) as (keyof CompetitionConfig)[]).forEach(
        (field) => {
          if (field !== "phase" && field !== "equipeId") {
            // phase et equipeId sont optionnels
            const error = validateField(field, competition[field], index);
            if (error) {
              competitionErrors[field] = error;
              hasErrors = true;
            }
          }
        },
      );

      if (Object.keys(competitionErrors).length > 0) {
        newErrors[index] = competitionErrors;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  }

  async function handleSubmit() {
    if (!validateAllFields()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    if (competitions.length === 0) {
      toast.error("Veuillez ajouter au moins une compétition");
      return;
    }

    startTransition(async () => {
      try {
        setScrapingStatus("scraping");
        setScrapingProgress(10);
        setProgressMessage("Préparation des compétitions...");

        const result = await configureCompetitionsBatch(competitions);

        if (result.success) {
          setScrapingStatus("success");
          setScrapingProgress(100);
          setProgressMessage("Compétitions créées avec succès!");

          toast.success(
            `${competitions.length} compétition(s) configurée(s) avec succès!`,
          );

          // Nettoyer les données d'onboarding
          await clearOnboardingData();

          // Rediriger vers la page de suivi du scraping
          setTimeout(() => {
            if (result.data?.redirectTo) {
              router.push(result.data.redirectTo);
            } else {
              router.push("/dashboard");
            }
          }, 1000);
        } else {
          setScrapingStatus("error");
          setProgressMessage(result.error || "Erreur lors de la configuration");
          toast.error(
            result.error || "Erreur lors de la configuration des compétitions",
          );
        }
      } catch (error) {
        console.error("Erreur configuration compétitions:", error);
        setScrapingStatus("error");
        setProgressMessage("Erreur lors de la configuration");
        toast.error("Erreur lors de la configuration des compétitions");
      }
    });
  }

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
                onClick={() => router.push("/onboarding/teams")}
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

  const canContinue =
    userData?.tokensRemaining &&
    userData.tokensRemaining >= competitions.length;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/onboarding/teams")}
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
            Configuration des Compétitions
          </h1>
          {selectedClub && (
            <p className="text-xl text-muted-foreground mb-2">
              <span className="font-semibold text-primary">
                {selectedClub.nom}
              </span>
            </p>
          )}
          <p className="text-muted-foreground">
            Configurez vos compétitions pour le scraping automatique
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
                    token(s). Coût: {competitions.length} token(s) pour{" "}
                    {competitions.length} compétition(s)
                  </p>
                </div>
                <Badge variant={canContinue ? "default" : "destructive"}>
                  {userData.tokensRemaining}/{competitions.length} token(s)
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Équipes sélectionnées */}
        {selectedTeams.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                Équipes sélectionnées ({selectedTeams.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedTeams.map((team) => (
                  <Badge key={team.id} variant="outline">
                    {team.nom}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration des compétitions */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Compétitions à configurer ({competitions.length})
                </CardTitle>
                <CardDescription>
                  Renseignez les informations de chaque compétition
                </CardDescription>
              </div>
              <Button
                onClick={addCompetition}
                variant="outline"
                disabled={isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {competitions.map((competition, index) => (
                <div key={index} className="border rounded-lg p-6 relative">
                  {competitions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCompetition(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      disabled={isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}

                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Compétition {index + 1}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* URL */}
                    <div className="md:col-span-2">
                      <Label htmlFor={`url-${index}`}>URL FFHandball *</Label>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <Input
                          id={`url-${index}`}
                          placeholder="https://www.ffhandball.fr/competitions/..."
                          value={competition.url}
                          onChange={(e) =>
                            handleChange(index, "url", e.target.value)
                          }
                          className={errors[index]?.url ? "border-red-500" : ""}
                          disabled={isPending}
                        />
                      </div>
                      {errors[index]?.url && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[index].url}
                        </p>
                      )}
                    </div>

                    {/* Équipe */}
                    <div>
                      <Label htmlFor={`equipe-${index}`}>
                        Nom équipe sur FFHandball *
                      </Label>
                      <Input
                        id={`equipe-${index}`}
                        placeholder="Ex: ASCR 1"
                        value={competition.equipe}
                        onChange={(e) =>
                          handleChange(index, "equipe", e.target.value)
                        }
                        className={
                          errors[index]?.equipe ? "border-red-500" : ""
                        }
                        disabled={isPending}
                      />
                      {errors[index]?.equipe && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[index].equipe}
                        </p>
                      )}
                    </div>

                    {/* Équipe BDD */}
                    <div>
                      <Label htmlFor={`equipe_bdd-${index}`}>
                        Nom équipe dans BDD *
                      </Label>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <Input
                          id={`equipe_bdd-${index}`}
                          placeholder="Ex: ASCR 1"
                          value={competition.equipe_bdd}
                          onChange={(e) =>
                            handleChange(index, "equipe_bdd", e.target.value)
                          }
                          className={
                            errors[index]?.equipe_bdd ? "border-red-500" : ""
                          }
                          disabled={isPending}
                        />
                      </div>
                      {errors[index]?.equipe_bdd && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[index].equipe_bdd}
                        </p>
                      )}
                    </div>

                    {/* Nom compétition */}
                    <div>
                      <Label htmlFor={`competition_name-${index}`}>
                        Nom de la compétition *
                      </Label>
                      <Input
                        id={`competition_name-${index}`}
                        placeholder="Ex: Nationale 2"
                        value={competition.competition_name}
                        onChange={(e) =>
                          handleChange(
                            index,
                            "competition_name",
                            e.target.value,
                          )
                        }
                        className={
                          errors[index]?.competition_name
                            ? "border-red-500"
                            : ""
                        }
                        disabled={isPending}
                      />
                      {errors[index]?.competition_name && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[index].competition_name}
                        </p>
                      )}
                    </div>

                    {/* Code poule */}
                    <div>
                      <Label htmlFor={`poule-${index}`}>Code poule *</Label>
                      <Input
                        id={`poule-${index}`}
                        placeholder="Ex: poule-123456"
                        value={competition.poule}
                        onChange={(e) =>
                          handleChange(index, "poule", e.target.value)
                        }
                        className={errors[index]?.poule ? "border-red-500" : ""}
                        disabled={isPending}
                      />
                      {errors[index]?.poule && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[index].poule}
                        </p>
                      )}
                    </div>

                    {/* Max journées */}
                    <div>
                      <Label htmlFor={`max_journees-${index}`}>
                        Nombre de journées *
                      </Label>
                      <Input
                        id={`max_journees-${index}`}
                        type="number"
                        min="1"
                        max="50"
                        placeholder="Ex: 22"
                        value={competition.max_journees}
                        onChange={(e) =>
                          handleChange(index, "max_journees", e.target.value)
                        }
                        className={
                          errors[index]?.max_journees ? "border-red-500" : ""
                        }
                        disabled={isPending}
                      />
                      {errors[index]?.max_journees && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[index].max_journees}
                        </p>
                      )}
                    </div>

                    {/* Saison */}
                    <div>
                      <Label htmlFor={`saison-${index}`}>Saison *</Label>
                      <Input
                        id={`saison-${index}`}
                        placeholder="Ex: 2024/2025"
                        value={competition.saison}
                        onChange={(e) =>
                          handleChange(index, "saison", e.target.value)
                        }
                        className={
                          errors[index]?.saison ? "border-red-500" : ""
                        }
                        disabled={isPending}
                      />
                      {errors[index]?.saison && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[index].saison}
                        </p>
                      )}
                    </div>

                    {/* Phase (optionnelle) */}
                    <div>
                      <Label htmlFor={`phase-${index}`}>
                        Phase (optionnel)
                      </Label>
                      <Input
                        id={`phase-${index}`}
                        placeholder="Ex: Phase 1"
                        value={competition.phase || ""}
                        onChange={(e) =>
                          handleChange(index, "phase", e.target.value)
                        }
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        {scrapingStatus !== "idle" && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                {scrapingStatus === "scraping" && (
                  <Loader2 className="h-6 w-6 animate-spin" />
                )}
                {scrapingStatus === "success" && (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                )}
                {scrapingStatus === "error" && (
                  <AlertCircle className="h-6 w-6 text-red-500" />
                )}
                <span className="font-medium">{progressMessage}</span>
              </div>
              <Progress value={scrapingProgress} className="w-full" />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!canContinue || isPending || competitions.length === 0}
            className="px-12"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {scrapingStatus === "success"
              ? "Configuration terminée !"
              : `Configurer ${competitions.length} compétition(s)`}
          </Button>
        </div>

        {!canContinue && userData && (
          <div className="text-center mt-4">
            <p className="text-sm text-destructive">
              Vous n'avez pas assez de tokens disponibles. Besoin de{" "}
              {competitions.length} token(s), disponible:{" "}
              {userData.tokensRemaining}
            </p>
          </div>
        )}

        {/* Info */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Informations importantes:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>
                    L'URL doit être celle d'une compétition FFHandball valide
                  </li>
                  <li>
                    Le code poule se trouve dans l'URL de la compétition
                    (format: poule-123456)
                  </li>
                  <li>La saison doit correspondre à celle de l'URL</li>
                  <li>Chaque compétition consomme 1 token</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
