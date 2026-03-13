"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  Database,
  Zap,
  Layers,
  ChevronRight,
} from "lucide-react";
import { configureCompetitionsBatch, createEquipe } from "@/app/actions";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";

interface CreateCompetitionClientProps {
  initialUserData: any;
  initialTokensData: any;
  selectedTeams: any[];
  selectedClub: any;
  error?: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────
const FFHB_URL_RE =
  /^https:\/\/www\.ffhandball\.fr\/competitions\/saison-(\d{4})-(\d{4})-\d+\/.+/;
const POULE_RE = /^poule-\d+$/;
const SAISON_RE = /^(\d{4})-(\d{4})$/;

const competitionSchema = z
  .object({
    competition_name: z.string().min(1, "Nom de la compétition requis"),
    url: z
      .string()
      .regex(
        FFHB_URL_RE,
        "URL invalide — ex: https://www.ffhandball.fr/competitions/saison-2025-2026-21/...",
      ),
    poule: z.string().regex(POULE_RE, "Format requis : poule-XXXXXX"),
    saison: z
      .string()
      .regex(SAISON_RE, "Format requis : AAAA-AAAA (ex: 2025-2026)"),
    max_journees: z.coerce
      .number()
      .int("Entier requis")
      .min(1, "Minimum 1 journée")
      .max(99, "Maximum 99 journées"),
    equipeId: z
      .number()
      .nullable()
      .refine((v) => v !== null && v > 0, { message: "Équipe requise" }),
    equipe_bdd: z.string().min(1, "Équipe BDD requise"),
    equipe: z.string().min(1, "Nom sur FFHandball requis"),
    phase: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const urlMatch = data.url.match(FFHB_URL_RE);
    const saisonMatch = data.saison.match(SAISON_RE);
    if (saisonMatch) {
      const y1 = parseInt(saisonMatch[1]);
      const y2 = parseInt(saisonMatch[2]);
      if (y2 !== y1 + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "La saison doit couvrir 2 années consécutives (ex: 2025-2026)",
          path: ["saison"],
        });
      }
    }
    if (urlMatch && saisonMatch) {
      if (urlMatch[1] !== saisonMatch[1] || urlMatch[2] !== saisonMatch[2]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La saison (${data.saison}) ne correspond pas à l'URL (${urlMatch[1]}-${urlMatch[2]})`,
          path: ["saison"],
        });
      }
    }
  });

type CompetitionErrors = Partial<Record<string, string>>;

/** Groups by (equipeId, saison) when phase is filled — counts as 1 token. */
function computeEffectiveTokenCost(
  comps: { equipeId: number | null; saison: string; phase: string }[],
): number {
  let cost = 0;
  const seen = new Set<string>();
  for (const c of comps) {
    if (c.phase.trim() && c.equipeId) {
      const key = `${c.equipeId}::${c.saison}`;
      if (!seen.has(key)) {
        seen.add(key);
        cost++;
      }
    } else {
      cost++;
    }
  }
  return cost;
}

export default function CreateCompetitionClient({
  initialUserData,
  selectedTeams: initialTeams,
  selectedClub,
}: CreateCompetitionClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // États pour les données et la modal
  const [userData] = useState(initialUserData);
  const [equipes, setEquipes] = useState(initialTeams || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEquipeNom, setNewEquipeNom] = useState("");
  const [isCreatingEquipe, setIsCreatingEquipe] = useState(false);

  const [competitions, setCompetitions] = useState([
    {
      id: 1, // ID statique pour éviter le mismatch SSR/client
      url: "",
      equipe: "",
      equipe_bdd: "",
      equipeId: null as number | null,
      poule: "",
      max_journees: "22",
      saison: "2024-2025",
      competition_name: "",
      phase: "",
    },
  ]);

  const [fieldErrors, setFieldErrors] = useState<
    Record<number, CompetitionErrors>
  >({});

  const effectiveCost = computeEffectiveTokenCost(competitions);
  const canContinue = userData
    ? userData.tokensRemaining >= effectiveCost
    : false;

  const addCompetition = () => {
    setCompetitions([
      ...competitions,
      {
        id: Date.now() + Math.random(),
        url: "",
        equipe: "",
        equipe_bdd: "",
        equipeId: null,
        poule: "",
        max_journees: "22",
        saison: "2024-2025",
        competition_name: "",
        phase: "",
      },
    ]);
  };

  const removeCompetition = (index: number) => {
    const newCompetitions = [...competitions];
    newCompetitions.splice(index, 1);
    setCompetitions(newCompetitions);
    // Re-index errors so they stay aligned after removal
    setFieldErrors((prev) => {
      const next: Record<number, CompetitionErrors> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const k = Number(key);
        if (k < index) next[k] = value;
        else if (k > index) next[k - 1] = value;
      });
      return next;
    });
  };

  const handleChange = (index: number, field: string, value: any) => {
    // Clear the error for this field immediately on change
    setFieldErrors((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: undefined },
    }));
    setCompetitions((prev) => {
      const newCompetitions = prev.map((comp, i) => {
        if (i !== index) return comp;
        if (field === "max_journees") {
          return { ...comp, [field]: String(value) };
        } else if (field === "equipeId") {
          return { ...comp, [field]: value !== null ? Number(value) : null };
        } else {
          return { ...comp, [field]: value };
        }
      });
      return newCompetitions;
    });
  };

  const handleCreateEquipe = async () => {
    if (!newEquipeNom.trim()) return;
    setIsCreatingEquipe(true);
    try {
      const res = await createEquipe({
        nom: newEquipeNom,
        clubId: selectedClub.id,
      });

      if (res.success) {
        toast.success(`Équipe "${newEquipeNom}" créée`);
        setEquipes([...equipes, res.data]);
        setNewEquipeNom("");
        setIsModalOpen(false);
      } else {
        toast.error(res.error || "Erreur lors de la création");
      }
    } catch (err) {
      toast.error("Erreur serveur");
    } finally {
      setIsCreatingEquipe(false);
    }
  };

  const handleSubmit = async () => {
    // Validate every competition slot with Zod
    const newErrors: Record<number, CompetitionErrors> = {};
    let hasErrors = false;

    competitions.forEach((comp, index) => {
      const result = competitionSchema.safeParse(comp);
      if (!result.success) {
        hasErrors = true;
        const errs: CompetitionErrors = {};
        for (const issue of result.error.issues) {
          const field = String(issue.path[0] ?? "root");
          if (!errs[field]) errs[field] = issue.message;
        }
        newErrors[index] = errs;
      }
    });

    if (hasErrors) {
      setFieldErrors(newErrors);
      toast.error("Veuillez corriger les erreurs avant de continuer");
      return;
    }

    setFieldErrors({});
    startTransition(async () => {
      try {
        const res = await configureCompetitionsBatch(competitions);
        if (res.success) {
          toast.success("Compétitions configurées avec succès !");
          const ids = res.data?.competitions
            ?.map((c: any) => c.competitionId)
            .join(",");
          router.push(`/competitions/scraping-progress?ids=${ids}`);
        } else {
          toast.error(res.error || "Une erreur est survenue");
        }
      } catch (err) {
        toast.error("Erreur lors de la configuration");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Immersif "Broadcaster" */}
      <header className="relative overflow-hidden bg-primary rounded-b-[3rem] p-8 md:p-16 shadow-2xl border-b-8 border-secondary/50">
        <div className="absolute top-0 right-0 p-4 opacity-10 font-sport text-9xl italic uppercase pointer-events-none select-none">
          Scrape
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white mb-6 border-white/20 hover:bg-white/10"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour tactique
          </Button>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-secondary font-sport italic animate-in slide-in-from-left duration-500">
              <Zap size={24} className="fill-current" /> CONFIGURATION SYNC
            </div>
            <h1 className="text-4xl md:text-7xl font-sport font-black italic uppercase text-white tracking-tighter leading-none">
              Setup <span className="text-secondary">Compétitions</span>
            </h1>
            {selectedClub && (
              <Badge className="bg-white/10 text-white border-white/20 px-4 py-1 text-lg font-sport italic">
                Club: {selectedClub.nom}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 -mt-10 space-y-8 relative z-20">
        {/* Monitoring */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-3xl border-2 shadow-xl bg-card/80 backdrop-blur-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-2xl text-primary">
                <Database size={28} />
              </div>
              <div>
                <p className="text-2xl font-sport italic font-black">
                  {userData?.tokensRemaining || 0}
                </p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  Tokens Disponibles
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-2 shadow-xl bg-card/80 backdrop-blur-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-secondary/10 p-4 rounded-2xl text-secondary">
                <Trophy size={28} />
              </div>
              <div>
                <p className="text-2xl font-sport italic font-black">
                  {competitions.length}
                </p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  Compétitions à Sync
                </p>
                {effectiveCost < competitions.length && (
                  <p className="text-[10px] text-secondary font-bold mt-0.5">
                    → {effectiveCost} token{effectiveCost > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "rounded-3xl border-2 shadow-xl transition-colors",
              canContinue
                ? "bg-accent/10 border-accent/20"
                : "bg-destructive/10 border-destructive/20",
            )}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div
                className={cn(
                  "p-4 rounded-2xl",
                  canContinue
                    ? "bg-accent text-accent-foreground"
                    : "bg-destructive text-destructive-foreground",
                )}
              >
                {canContinue ? (
                  <CheckCircle2 size={28} />
                ) : (
                  <AlertCircle size={28} />
                )}
              </div>
              <div>
                <p className="text-xl font-sport italic font-black uppercase">
                  {canContinue ? "Éligible" : "Tokens Insuffisants"}
                </p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  Statut Engagement
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-end px-2">
              <h2 className="font-sport italic text-2xl uppercase tracking-tight flex items-center gap-2">
                <Layers className="text-primary" /> Détails des Engagements
              </h2>
              <Button
                onClick={addCompetition}
                variant="outline"
                className="rounded-xl border-2 font-bold uppercase text-xs"
                disabled={isPending}
              >
                <Plus className="w-4 h-4 mr-2" /> Ajouter un Slot
              </Button>
            </div>

            <div className="space-y-6">
              {competitions.map((competition, index) => (
                <Card
                  key={competition.id || index}
                  className="rounded-[2.5rem] border-2 shadow-lg overflow-hidden transition-all hover:border-primary/30 group bg-card"
                >
                  {/* Debug log pour vérifier le state */}
                  {process.env.NODE_ENV === "development" && (
                    <pre className="text-xs bg-muted/30 p-2 rounded-xl mt-2">
                      {JSON.stringify(competitions, null, 2)}
                    </pre>
                  )}
                  <div className="bg-muted/30 px-8 py-4 border-b flex justify-between items-center group-hover:bg-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-sport italic text-sm">
                        {index + 1}
                      </div>
                      <span className="font-sport italic uppercase text-sm tracking-widest">
                        Configuration Slot
                      </span>
                      {fieldErrors[index] &&
                        Object.values(fieldErrors[index]).some(Boolean) && (
                          <span className="flex items-center gap-1 text-destructive text-[10px] font-black uppercase">
                            <AlertCircle size={11} /> Erreurs
                          </span>
                        )}
                    </div>
                    {competitions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCompetition(index)}
                        className="text-destructive hover:bg-destructive/10 rounded-full"
                      >
                        <X size={18} />
                      </Button>
                    )}
                  </div>

                  <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nom de la compétition */}
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Nom de la compétition (Affichage)
                      </Label>
                      <Input
                        placeholder="Ex: N2 - Masculine"
                        value={competition.competition_name}
                        onChange={(e) =>
                          handleChange(
                            index,
                            "competition_name",
                            e.target.value,
                          )
                        }
                        className={cn(
                          "h-14 rounded-2xl border-2 font-bold uppercase",
                          fieldErrors[index]?.competition_name &&
                            "border-destructive",
                        )}
                      />
                      {fieldErrors[index]?.competition_name && (
                        <p className="text-xs text-destructive font-bold ml-1">
                          {fieldErrors[index].competition_name}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Lien FFHandball officiel
                      </Label>
                      <div className="relative group/input">
                        <Globe
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors"
                          size={18}
                        />
                        <Input
                          placeholder="https://www.ffhandball.fr/..."
                          value={competition.url}
                          onChange={(e) =>
                            handleChange(index, "url", e.target.value)
                          }
                          className={cn(
                            "h-14 pl-12 rounded-2xl border-2 bg-background font-medium",
                            fieldErrors[index]?.url && "border-destructive",
                          )}
                        />
                      </div>
                      {fieldErrors[index]?.url && (
                        <p className="text-xs text-destructive font-bold ml-1">
                          {fieldErrors[index].url}
                        </p>
                      )}
                    </div>

                    {/* Mapping Équipe */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                          Équipe dans la Base
                        </Label>
                        <Dialog
                          open={isModalOpen}
                          onOpenChange={setIsModalOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[9px] font-black uppercase text-primary bg-primary/5 rounded-lg px-2"
                            >
                              <Plus className="w-3 h-3 mr-1" /> Créer
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                            <DialogHeader>
                              <DialogTitle className="font-sport italic text-2xl uppercase">
                                Nouvelle Équipe
                              </DialogTitle>
                              <DialogDescription className="text-xs uppercase font-bold text-muted-foreground">
                                Ajouter une équipe à {selectedClub?.nom}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                              <div className="space-y-2">
                                <Label
                                  htmlFor="name"
                                  className="text-[10px] font-black uppercase tracking-widest"
                                >
                                  Nom de l'équipe
                                </Label>
                                <Input
                                  id="name"
                                  value={newEquipeNom}
                                  onChange={(e) =>
                                    setNewEquipeNom(e.target.value)
                                  }
                                  placeholder="Ex: Seniors Masculins 1"
                                  className="h-12 rounded-xl border-2 font-bold uppercase"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={handleCreateEquipe}
                                disabled={isCreatingEquipe || !newEquipeNom}
                                className="w-full h-12 rounded-xl font-sport italic text-lg uppercase bg-primary text-white"
                              >
                                {isCreatingEquipe ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  "Valider l'équipe"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <select
                        value={competition.equipeId || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numVal = value ? Number(value) : null;
                          const eq = numVal
                            ? equipes.find((e) => e.id === numVal)
                            : undefined;
                          handleChange(index, "equipeId", numVal);
                          handleChange(index, "equipe_bdd", eq ? eq.nom : "");
                        }}
                        className={cn(
                          "w-full h-14 rounded-2xl border-2 font-bold uppercase italic text-xs px-4 bg-background",
                          fieldErrors[index]?.equipeId && "border-destructive",
                        )}
                      >
                        <option value="">Choisir équipe</option>
                        {equipes.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.nom}
                          </option>
                        ))}
                      </select>
                      {fieldErrors[index]?.equipeId && (
                        <p className="text-xs text-destructive font-bold ml-1">
                          {fieldErrors[index].equipeId}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Nom sur FFHandball
                      </Label>
                      <Input
                        placeholder="Ex: PSG HANDBALL"
                        value={competition.equipe}
                        onChange={(e) =>
                          handleChange(index, "equipe", e.target.value)
                        }
                        className={cn(
                          "h-14 rounded-2xl border-2 font-bold uppercase",
                          fieldErrors[index]?.equipe && "border-destructive",
                        )}
                      />
                      {fieldErrors[index]?.equipe && (
                        <p className="text-xs text-destructive font-bold ml-1">
                          {fieldErrors[index].equipe}
                        </p>
                      )}
                    </div>

                    {/* Champs techniques */}
                    <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-dashed">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Poule
                        </Label>
                        <Input
                          placeholder="poule-123"
                          value={competition.poule}
                          onChange={(e) =>
                            handleChange(index, "poule", e.target.value)
                          }
                          className={cn(
                            "h-12 rounded-xl border-2 text-xs font-bold",
                            fieldErrors[index]?.poule && "border-destructive",
                          )}
                        />
                        {fieldErrors[index]?.poule && (
                          <p className="text-[10px] text-destructive font-bold">
                            {fieldErrors[index].poule}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-secondary">
                          Phase{" "}
                          <span className="text-muted-foreground font-normal text-[9px] normal-case">
                            (optionnel)
                          </span>
                        </Label>
                        <Input
                          placeholder="Phase 1"
                          value={competition.phase}
                          onChange={(e) =>
                            handleChange(index, "phase", e.target.value)
                          }
                          className="h-12 rounded-xl border-2 text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Saison
                        </Label>
                        <Input
                          value={competition.saison}
                          onChange={(e) =>
                            handleChange(index, "saison", e.target.value)
                          }
                          className={cn(
                            "h-12 rounded-xl border-2 text-xs font-bold",
                            fieldErrors[index]?.saison && "border-destructive",
                          )}
                        />
                        {fieldErrors[index]?.saison && (
                          <p className="text-[10px] text-destructive font-bold">
                            {fieldErrors[index].saison}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Journées
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={competition.max_journees}
                          onChange={(e) =>
                            handleChange(index, "max_journees", e.target.value)
                          }
                          className={cn(
                            "h-12 rounded-xl border-2 text-xs font-bold",
                            fieldErrors[index]?.max_journees &&
                              "border-destructive",
                          )}
                        />
                        {fieldErrors[index]?.max_journees && (
                          <p className="text-[10px] text-destructive font-bold">
                            {fieldErrors[index].max_journees}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            <Card className="rounded-[2rem] border-2 shadow-2xl bg-primary text-white overflow-hidden">
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <p className="text-secondary font-sport italic text-xs uppercase tracking-widest">
                    Validation Finale
                  </p>
                  <h3 className="text-3xl font-sport italic font-black uppercase leading-none">
                    Prêt pour la{" "}
                    <span className="text-secondary">Sychronisation</span> ?
                  </h3>
                </div>
                <div className="space-y-3 text-xs font-bold uppercase">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="opacity-70">Engagements</span>
                    <span>x{competitions.length}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="opacity-70">Coût Estimé</span>
                    <span className="text-secondary">
                      {effectiveCost} Token{effectiveCost > 1 ? "s" : ""}
                    </span>
                  </div>
                  {effectiveCost < competitions.length && (
                    <div className="flex items-center gap-1.5 text-[10px] text-secondary/90 normal-case font-bold">
                      <Info size={11} />
                      Phases mutualisées — {competitions.length -
                        effectiveCost}{" "}
                      token
                      {competitions.length - effectiveCost > 1 ? "s" : ""}{" "}
                      économisé
                      {competitions.length - effectiveCost > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !canContinue || isPending || competitions.length === 0
                  }
                  className="w-full h-16 bg-secondary text-black hover:bg-white rounded-2xl font-sport italic text-xl uppercase shadow-xl transition-all group"
                >
                  {isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <div className="flex items-center gap-2">
                      Lancer la Sync{" "}
                      <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
