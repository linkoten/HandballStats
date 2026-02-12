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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Link as LinkIcon,
  Cpu,
  Database,
  Globe,
  ArrowLeft,
  Trophy,
  Plus,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

type UserData = {
  subscription: string;
};

type CompetitionConfig = {
  url: string;
  equipe: string;
  equipe_bdd: string;
  competition_name: string;
  poule: string;
  max_journees: string;
  saison: string;
  phase?: string; // Phase 1, Phase 2, etc.
  equipeId: number | null;
};

type ValidationErrors = Partial<Record<keyof CompetitionConfig, string>>;

type UserEquipe = {
  id: number;
  nom: string;
};

export default function CreateCompetitionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedEquipeId, setSelectedEquipeId] = useState<number | null>(null);
  const [userEquipes, setUserEquipes] = useState<UserEquipe[]>([]);
  const [isCreatingNewEquipe, setIsCreatingNewEquipe] = useState(false);

  const [competitions, setCompetitions] = useState<CompetitionConfig[]>([
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

  const [errors, setErrors] = useState<Record<number, ValidationErrors>>({});
  const [scrapingStatus, setScrapingStatus] = useState<
    "idle" | "scraping" | "success" | "error"
  >("idle");
  const [scrapingProgress, setScrapingProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [createdCompetitionIds, setCreatedCompetitionIds] = useState<number[]>(
    [],
  );
  const [competitionStatuses, setCompetitionStatuses] = useState<any[]>([]);

  useEffect(() => {
    fetchUserData();
  }, []);

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

  async function fetchUserData() {
    try {
      const userResponse = await fetch("/api/user/me");
      const user = await userResponse.json();
      setUserData(user);

      // Récupérer l'équipe sélectionnée
      const teamsResponse = await fetch("/api/onboarding/get-selected-teams");
      const { equipeIds } = await teamsResponse.json();

      if (equipeIds && equipeIds.length > 0) {
        setSelectedEquipeId(equipeIds[0]);
        setCompetitions((prev) =>
          prev.map((comp) => ({ ...comp, equipeId: equipeIds[0] })),
        );
      }

      // Récupérer toutes les équipes de l'utilisateur
      if (user.clubId) {
        const equipesResponse = await fetch(
          `/api/equipes?club_id=${user.clubId}`,
        );
        const equipes = await equipesResponse.json();
        if (Array.isArray(equipes)) {
          setUserEquipes(
            equipes.map((eq: any) => ({ id: eq.id, nom: eq.nom })),
          );
        }
      }
    } catch (error) {
      console.error("Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
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

    // Si on modifie la saison, re-valider l'URL pour détecter les incohérences
    if (field === "saison") {
      const competition = competitions[competitionIndex];
      if (competition?.url) {
        const urlError = validateField(
          "url",
          competition.url,
          competitionIndex,
        );
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (!newErrors[competitionIndex]) {
            newErrors[competitionIndex] = {};
          }
          if (urlError) {
            newErrors[competitionIndex]["url"] = urlError;
          } else {
            delete newErrors[competitionIndex]["url"];
          }
          return newErrors;
        });
      }
    }
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
        equipeId: selectedEquipeId,
      },
    ]);
  }

  function removeCompetition(index: number) {
    if (competitions.length > 1) {
      setCompetitions((prev) => prev.filter((_, i) => i !== index));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[index];
        // Re-index remaining errors
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
  }

  function validateAll(): boolean {
    const newErrors: Record<number, ValidationErrors> = {};
    let isValid = true;

    competitions.forEach((config, index) => {
      const competitionErrors: ValidationErrors = {};
      (Object.keys(config) as Array<keyof CompetitionConfig>).forEach(
        (field) => {
          if (field === "equipeId") return; // Skip validation for equipeId
          const error = validateField(field, config[field] ?? null, index);
          if (error) {
            competitionErrors[field] = error;
            isValid = false;
          }
        },
      );
      if (Object.keys(competitionErrors).length > 0) {
        newErrors[index] = competitionErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  }

  async function handleSubmit() {
    if (!validateAll()) {
      return;
    }

    setSaving(true);
    setScrapingStatus("scraping");
    setScrapingProgress(0);
    setProgressMessage("Création des compétitions...");

    try {
      const response = await fetch(
        "/api/onboarding/configure-competitions-batch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitions }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setProgressMessage("Compétitions créées ! Scraping en cours...");

        // Extraire les IDs des compétitions créées
        const competitionIds = data.results
          .filter((r: any) => r.success)
          .map((r: any) => r.competitionId);

        setCreatedCompetitionIds(competitionIds);

        // Rediriger immédiatement vers la page de suivi
        const idsParam = competitionIds.join(",");
        router.push(`/competitions/suivi?ids=${idsParam}`);
      } else {
        setScrapingStatus("error");
        setProgressMessage("Erreur lors de la création");
        alert(data.error || "Erreur lors de la configuration");
        setSaving(false);
      }
    } catch (error) {
      console.error("Erreur:", error);
      setScrapingStatus("error");
      setProgressMessage("Erreur de connexion");
      alert("Erreur lors de la configuration");
      setSaving(false);
    }
  }

  // Fonction de polling pour suivre l'avancée du scraping
  async function pollScrapingStatus(competitionIds: number[]) {
    const maxAttempts = 120; // 10 minutes max (120 * 5 secondes)
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch("/api/competitions/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitionIds }),
        });

        if (response.ok) {
          const data = await response.json();
          setCompetitionStatuses(data.competitions);

          // Calculer la progression
          const { summary } = data;
          const progress = Math.round(
            ((summary.completed + summary.failed) / summary.total) * 100,
          );
          setScrapingProgress(progress);

          // Message de progression
          if (summary.inProgress > 0) {
            setProgressMessage(
              `Scraping en cours: ${summary.completed}/${summary.total} compétitions terminées`,
            );
          } else if (summary.pending > 0) {
            setProgressMessage(
              `En attente: ${summary.pending} compétition(s)...`,
            );
          }

          // Vérifier si tout est terminé
          if (data.globalStatus === "COMPLETED") {
            clearInterval(interval);
            setScrapingProgress(100);
            setProgressMessage("Scraping terminé avec succès !");
            setScrapingStatus("success");
            setSaving(false);

            setTimeout(() => {
              router.push("/dashboard");
            }, 2000);
          } else if (
            data.globalStatus === "FAILED" &&
            summary.inProgress === 0 &&
            summary.pending === 0
          ) {
            clearInterval(interval);
            setScrapingStatus("error");
            setProgressMessage(
              `Erreur: ${summary.failed} compétition(s) en échec`,
            );
            setSaving(false);
          }
        }
      } catch (error) {
        console.error("Erreur lors du polling:", error);
      }

      // Timeout après 10 minutes
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setScrapingStatus("error");
        setProgressMessage("Timeout: le scraping prend trop de temps");
        setSaving(false);
      }
    }, 5000); // Poll toutes les 5 secondes
  }

  async function handleSubmit_OLD() {
    if (!validateAll()) {
      return;
    }

    setSaving(true);
    setScrapingStatus("scraping");
    setScrapingProgress(0);
    setProgressMessage("Initialisation...");

    const progressInterval = setInterval(() => {
      setScrapingProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 5;
      });
    }, 1000);

    setTimeout(
      () => setProgressMessage("Connexion au site FFHandball..."),
      500,
    );
    setTimeout(() => setProgressMessage("Récupération du classement..."), 3000);
    setTimeout(() => setProgressMessage("Collecte des matchs..."), 8000);
    setTimeout(() => setProgressMessage("Téléchargement des PDFs..."), 15000);
    setTimeout(
      () => setProgressMessage("Extraction des statistiques..."),
      30000,
    );
    setTimeout(
      () => setProgressMessage("Enregistrement dans la base de données..."),
      50000,
    );

    try {
      const response = await fetch(
        "/api/onboarding/configure-competitions-batch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitions }),
        },
      );

      clearInterval(progressInterval);
      const data = await response.json();

      if (response.ok) {
        setScrapingProgress(100);
        setProgressMessage("Terminé !");
        setScrapingStatus("success");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        clearInterval(progressInterval);
        setScrapingStatus("error");
        setProgressMessage("Erreur lors du scraping");
        alert(data.error || "Erreur lors de la configuration");
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Erreur:", error);
      setScrapingStatus("error");
      setProgressMessage("Erreur de connexion");
      alert("Erreur lors de la configuration");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-blue-500/5 rotate-12 scale-150 blur-3xl pointer-events-none" />
      <div className="fixed inset-0 bg-orange-500/5 -rotate-12 scale-150 blur-3xl pointer-events-none" />
      <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02] pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10 my-8">
        <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-2xl">
          <CardHeader className="border-b border-border/50 pb-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-3xl font-sport font-extrabold uppercase tracking-tighter italic">
                  Configuration des{" "}
                  <span className="text-primary">compétitions</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground text-lg">
                  Ajoutez plusieurs compétitions pour la même équipe (1 jeton
                  par compétition)
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-md px-4 py-2"
              >
                {userData?.subscription || "GRATUIT"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            {scrapingStatus === "scraping" && (
              <div className="space-y-4 p-6 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-primary animate-pulse">
                    {progressMessage}
                  </p>
                  <span className="text-xs font-mono text-muted-foreground">
                    {Math.round(scrapingProgress)}%
                  </span>
                </div>
                <Progress
                  value={scrapingProgress}
                  className="h-2 bg-primary/20"
                />

                {/* Affichage détaillé de chaque compétition */}
                {competitionStatuses.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      État des compétitions :
                    </p>
                    {competitionStatuses.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-center justify-between text-sm p-2 rounded bg-background/50"
                      >
                        <div className="flex items-center gap-2">
                          {comp.scrapingStatus === "COMPLETED" && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {comp.scrapingStatus === "IN_PROGRESS" && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          {comp.scrapingStatus === "PENDING" && (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                          {comp.scrapingStatus === "FAILED" && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="font-medium">
                            {comp.nom} {comp.phase && `(${comp.phase})`}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {comp.matchsCount > 0
                            ? `${comp.matchsWithStatsCount}/${comp.matchsCount} matchs`
                            : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground italic">
                  Cela peut prendre plusieurs minutes selon le nombre de matchs
                  et la vitesse du site fédéral.
                </p>
              </div>
            )}

            {scrapingStatus === "success" && (
              <Alert className="border-green-500/50 bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <AlertDescription className="font-medium ml-2">
                  Données récupérées avec succès ! Redirection vers le
                  dashboard...
                </AlertDescription>
              </Alert>
            )}

            {scrapingStatus === "error" && (
              <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="font-medium ml-2">
                  {progressMessage}
                </AlertDescription>
              </Alert>
            )}

            <Alert className="border-blue-500/30 bg-blue-500/5">
              <Info className="h-5 w-5 text-blue-500" />
              <AlertDescription className="text-foreground/80">
                <strong className="block text-blue-500 mb-2">
                  Comment trouver les informations ?
                </strong>
                <ul className="list-disc ml-5 space-y-1 text-sm">
                  <li>
                    <strong>URL</strong>: L'adresse web de la page de la
                    compétition sur le site FFHandball
                  </li>
                  <li>
                    <strong>Code poule</strong>: Visible dans l'URL du
                    classement (ex: "poule-123456")
                  </li>
                  <li>
                    <strong>Max journées</strong>: Nombre total de journées dans
                    le calendrier
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-8">
              {competitions.map((config, index) => (
                <div
                  key={index}
                  className="relative border border-border/30 rounded-xl p-6 bg-card/20"
                >
                  <div className="flex items-center justify-between mb-6">
                    <Badge
                      variant="outline"
                      className="text-primary border-primary/40"
                    >
                      Compétition {index + 1}
                    </Badge>
                    {competitions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCompetition(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Saison */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" /> Saison{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="2024/2025"
                        value={config.saison}
                        onChange={(e) =>
                          handleChange(index, "saison", e.target.value)
                        }
                        className={`bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all ${
                          errors[index]?.saison
                            ? "border-destructive focus:border-destructive"
                            : ""
                        }`}
                      />
                      {errors[index]?.saison && (
                        <p className="text-sm text-destructive">
                          {errors[index].saison}
                        </p>
                      )}
                    </div>

                    {/* Phase */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-muted-foreground" />{" "}
                        Phase{" "}
                        <span className="text-xs text-muted-foreground">
                          (optionnel)
                        </span>
                      </Label>
                      <Input
                        placeholder="Phase 1, Phase 2, etc."
                        value={config.phase || ""}
                        onChange={(e) =>
                          handleChange(index, "phase", e.target.value)
                        }
                        className="bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all"
                      />
                      <p className="text-xs text-muted-foreground italic">
                        Si la compétition est divisée en phases (ex: "Phase 1",
                        "Aller", "Retour")
                      </p>
                    </div>

                    {/* Max journées */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" /> Nombre de
                        journées <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        placeholder="22"
                        value={config.max_journees}
                        onChange={(e) =>
                          handleChange(index, "max_journees", e.target.value)
                        }
                        className={`bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all ${
                          errors[index]?.max_journees
                            ? "border-destructive focus:border-destructive"
                            : ""
                        }`}
                      />
                      {errors[index]?.max_journees && (
                        <p className="text-sm text-destructive">
                          {errors[index].max_journees}
                        </p>
                      )}
                    </div>

                    {/* URL */}
                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-primary" /> URL de la
                        compétition <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="https://www.ffhandball.fr/competitions/..."
                        value={config.url}
                        onChange={(e) =>
                          handleChange(index, "url", e.target.value)
                        }
                        className={`bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all font-mono text-sm ${
                          errors[index]?.url
                            ? "border-destructive focus:border-destructive"
                            : ""
                        }`}
                      />
                      {errors[index]?.url && (
                        <p className="text-sm text-destructive">
                          {errors[index].url}
                        </p>
                      )}
                    </div>

                    {/* Équipe */}
                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" /> Nom de
                        l'équipe (Site FFHandball){" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="Ex: ASC RENNAIS"
                        value={config.equipe}
                        onChange={(e) =>
                          handleChange(index, "equipe", e.target.value)
                        }
                        className={`bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all ${
                          errors[index]?.equipe
                            ? "border-destructive focus:border-destructive"
                            : ""
                        }`}
                      />
                      <p className="text-xs text-muted-foreground">
                        Doit correspondre exactement au nom affiché sur le site.
                      </p>
                      {errors[index]?.equipe && (
                        <p className="text-sm text-destructive">
                          {errors[index].equipe}
                        </p>
                      )}
                    </div>

                    {/* Équipe BDD */}
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-primary" /> Nom
                          interne (Base de données){" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingNewEquipe(!isCreatingNewEquipe);
                            if (!isCreatingNewEquipe) {
                              setCompetitions((prev) =>
                                prev.map((comp, i) =>
                                  i === index
                                    ? { ...comp, equipe_bdd: "" }
                                    : comp,
                                ),
                              );
                            }
                          }}
                          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                        >
                          {isCreatingNewEquipe
                            ? "Sélectionner existant"
                            : "+ Créer nouveau"}
                        </button>
                      </div>

                      {isCreatingNewEquipe ? (
                        <Input
                          placeholder="Ex: Rennes Hommes 1"
                          value={config.equipe_bdd}
                          onChange={(e) =>
                            handleChange(index, "equipe_bdd", e.target.value)
                          }
                          className={`bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all ${
                            errors[index]?.equipe_bdd
                              ? "border-destructive focus:border-destructive"
                              : ""
                          }`}
                        />
                      ) : (
                        <select
                          value={config.equipe_bdd}
                          onChange={(e) => {
                            const selectedNom = e.target.value;
                            const selectedEquipe = userEquipes.find(
                              (eq) => eq.nom === selectedNom,
                            );
                            setCompetitions((prev) =>
                              prev.map((comp, i) =>
                                i === index
                                  ? {
                                      ...comp,
                                      equipe_bdd: selectedNom,
                                      equipeId: selectedEquipe
                                        ? selectedEquipe.id
                                        : null,
                                    }
                                  : comp,
                              ),
                            );
                            // Validation immédiate
                            const error = validateField(
                              "equipe_bdd",
                              selectedNom,
                              index,
                            );
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              if (!newErrors[index]) {
                                newErrors[index] = {};
                              }
                              if (error) {
                                newErrors[index]["equipe_bdd"] = error;
                              } else {
                                delete newErrors[index]["equipe_bdd"];
                                if (
                                  Object.keys(newErrors[index]).length === 0
                                ) {
                                  delete newErrors[index];
                                }
                              }
                              return newErrors;
                            });
                          }}
                          className={`flex h-10 w-full rounded-md border text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
                            bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all
                            ${
                              errors[index]?.equipe_bdd
                                ? "border-destructive"
                                : ""
                            }`}
                        >
                          <option value="">Sélectionnez une équipe...</option>
                          {userEquipes.map((equipe) => (
                            <option key={equipe.id} value={equipe.nom}>
                              {equipe.nom}
                            </option>
                          ))}
                        </select>
                      )}
                      {errors[index]?.equipe_bdd && (
                        <p className="text-sm text-destructive">
                          {errors[index].equipe_bdd}
                        </p>
                      )}
                    </div>

                    {/* Nom de compétition */}
                    <div className="space-y-2">
                      <Label>
                        Nom de la compétition{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="Ex: Excellence Régionale"
                        value={config.competition_name}
                        onChange={(e) =>
                          handleChange(
                            index,
                            "competition_name",
                            e.target.value,
                          )
                        }
                        className={`bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all ${
                          errors[index]?.competition_name
                            ? "border-destructive focus:border-destructive"
                            : ""
                        }`}
                      />
                      {errors[index]?.competition_name && (
                        <p className="text-sm text-destructive">
                          {errors[index].competition_name}
                        </p>
                      )}
                    </div>

                    {/* Code poule */}
                    <div className="space-y-2">
                      <Label>
                        Code de la poule{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="Ex: poule-147211"
                        value={config.poule}
                        onChange={(e) =>
                          handleChange(index, "poule", e.target.value)
                        }
                        className={`bg-background/50 border-input hover:border-primary/50 focus:border-primary transition-all ${
                          errors[index]?.poule
                            ? "border-destructive focus:border-destructive"
                            : ""
                        }`}
                      />
                      {errors[index]?.poule && (
                        <p className="text-sm text-destructive">
                          {errors[index].poule}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Bouton Ajouter */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={addCompetition}
                  className="border-dashed border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-all"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une compétition
                </Button>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-between pt-6 border-t border-border/50">
              <Button
                variant="ghost"
                onClick={() => router.push("/onboarding/competition")}
                disabled={saving}
                className="hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  saving ||
                  Object.values(errors).some(
                    (errObj) => Object.keys(errObj).length > 0,
                  )
                }
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:scale-105 transition-all duration-300"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Configuration...
                  </>
                ) : (
                  `Valider et Lancer (${competitions.length} compétition${
                    competitions.length > 1 ? "s" : ""
                  })`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
