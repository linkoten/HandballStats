"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  ArrowLeft,
  Target,
  Activity,
  Calendar,
  Zap,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Trophy,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Flag,
} from "lucide-react";
import { getJoueurComplet } from "@/app/actions/joueur-actions";
import { getCurrentUser } from "@/app/actions/user-actions";
import {
  upsertObjectif,
  deleteObjectif,
  type ObjectifType,
  type FixePar,
} from "@/app/actions/objectif-actions";
import { cn } from "@/lib/utils";
import { formatNomPrenom } from "@/lib/utils";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CURRENT_SAISON = "2025-2026";

const OBJECTIF_LABELS: Record<ObjectifType, string> = {
  buts: "Buts",
  tirs: "Tirs",
  arrets: "Arrêts",
  pct_tir: "% au tir",
  sept_metres: "7 mètres",
  exclusions_max: "Exclusions max (2')",
};

const OBJECTIF_ICONS: Record<ObjectifType, React.ElementType> = {
  buts: Target,
  tirs: Zap,
  arrets: ShieldCheck,
  pct_tir: Activity,
  sept_metres: Flag,
  exclusions_max: AlertTriangle,
};

const OBJECTIF_COLORS: Record<ObjectifType, string> = {
  buts: "text-primary",
  tirs: "text-blue-500",
  arrets: "text-emerald-500",
  pct_tir: "text-violet-500",
  sept_metres: "text-amber-500",
  exclusions_max: "text-rose-500",
};

const OBJECTIF_BG: Record<ObjectifType, string> = {
  buts: "bg-primary/10 border-primary/30",
  tirs: "bg-blue-500/10 border-blue-500/30",
  arrets: "bg-emerald-500/10 border-emerald-500/30",
  pct_tir: "bg-violet-500/10 border-violet-500/30",
  sept_metres: "bg-amber-500/10 border-amber-500/30",
  exclusions_max: "bg-rose-500/10 border-rose-500/30",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getActualValue(type: ObjectifType, stats: any[]): number {
  switch (type) {
    case "buts":
      return stats.reduce((a: number, s: any) => a + (s.buts || 0), 0);
    case "tirs":
      return stats.reduce((a: number, s: any) => a + (s.tirs || 0), 0);
    case "arrets":
      return stats.reduce((a: number, s: any) => a + (s.arrets || 0), 0);
    case "pct_tir": {
      const totalButs = stats.reduce(
        (a: number, s: any) => a + (s.buts || 0),
        0,
      );
      const totalTirs = stats.reduce(
        (a: number, s: any) => a + (s.tirs || 0),
        0,
      );
      return totalTirs > 0 ? Math.round((totalButs / totalTirs) * 100) : 0;
    }
    case "sept_metres":
      return stats.reduce((a: number, s: any) => a + (s.sept_metres || 0), 0);
    case "exclusions_max":
      return stats.reduce(
        (a: number, s: any) => a + (s.exclusions_2min || 0),
        0,
      );
    default:
      return 0;
  }
}

function getObjectifProgress(
  type: ObjectifType,
  actual: number,
  target: number,
): number {
  if (target <= 0) return 0;
  if (type === "exclusions_max") {
    return actual <= target
      ? 100
      : Math.max(0, Math.round((target / actual) * 100));
  }
  return Math.min(100, Math.round((actual / target) * 100));
}

function formatObjectifUnit(type: ObjectifType, value: number): string {
  return type === "pct_tir" ? `${value}%` : String(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilJoueurPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [joueur, setJoueur] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Objectif dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObjectif, setEditingObjectif] = useState<any>(null);
  const [objForm, setObjForm] = useState<{
    type_objectif: ObjectifType;
    valeur_cible: string;
    fixe_par: FixePar;
    saison: string;
    note: string;
  }>({
    type_objectif: "buts",
    valeur_cible: "",
    fixe_par: "joueur",
    saison: CURRENT_SAISON,
    note: "",
  });
  const [savingObj, setSavingObj] = useState(false);
  const [selectedSaison, setSelectedSaison] = useState<string>("all");

  useEffect(() => {
    async function loadData() {
      try {
        const [res, user] = await Promise.all([
          getJoueurComplet(params.joueurId as string),
          getCurrentUser(),
        ]);
        if (res.success) {
          setJoueur(res.data);
        } else {
          toast.error(res.error);
        }
        if (user) setUserRole(user.role);
      } catch {
        toast.error("Erreur lors de la récupération du profil");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.joueurId]);

  // ── Stats globales ──────────────────────────────────────────────────────────
  const statsGlobales = useMemo(() => {
    if (!joueur?.statistiques_joueur?.length) return null;
    const stats = joueur.statistiques_joueur;
    const totalButs = stats.reduce(
      (acc: number, s: any) => acc + (s.buts || 0),
      0,
    );
    const totalTirs = stats.reduce(
      (acc: number, s: any) => acc + (s.tirs || 0),
      0,
    );
    const totalArrets = stats.reduce(
      (acc: number, s: any) => acc + (s.arrets || 0),
      0,
    );
    const totalExclusions = stats.reduce(
      (acc: number, s: any) => acc + (s.exclusions_2min || 0),
      0,
    );
    const totalSeptMetres = stats.reduce(
      (acc: number, s: any) => acc + (s.sept_metres || 0),
      0,
    );
    const totalAvertissements = stats.reduce(
      (acc: number, s: any) => acc + (s.avertissements || 0),
      0,
    );
    return {
      buts: totalButs,
      tirs: totalTirs,
      arrets: totalArrets,
      exclusions: totalExclusions,
      septMetres: totalSeptMetres,
      avertissements: totalAvertissements,
      matchs: stats.length,
      moyenneButs:
        stats.length > 0 ? (totalButs / stats.length).toFixed(1) : "0.0",
      pctTir: totalTirs > 0 ? Math.round((totalButs / totalTirs) * 100) : 0,
      pctArrets:
        totalTirs > 0 ? Math.round((totalArrets / totalTirs) * 100) : 0,
    };
  }, [joueur]);

  const isGardien = useMemo(
    () =>
      joueur?.poste_principal?.toLowerCase().includes("gardien") ||
      joueur?.poste_principal?.toLowerCase().includes("goal"),
    [joueur],
  );

  const hasGardienPoste = useMemo(
    () =>
      isGardien ||
      joueur?.postes_secondaires?.some(
        (p: string) =>
          p.toLowerCase().includes("gardien") ||
          p.toLowerCase().includes("goal"),
      ),
    [isGardien, joueur],
  );

  const isGardienPur = useMemo(
    () =>
      isGardien &&
      (!joueur?.postes_secondaires || joueur.postes_secondaires.length === 0),
    [isGardien, joueur],
  );

  // ── Saisons disponibles ─────────────────────────────────────────────────────
  const saisons = useMemo(() => {
    if (!joueur?.statistiques_joueur?.length) return [];
    const set = new Set<string>();
    for (const s of joueur.statistiques_joueur) {
      const saison = s.matchs?.competition?.saison;
      if (saison) set.add(saison);
    }
    return Array.from(set).sort().reverse();
  }, [joueur]);

  // ── Stats filtrées par saison (pour les graphiques) ──────────────────────────
  const filteredStatsForChart = useMemo(() => {
    if (!joueur?.statistiques_joueur?.length) return [];
    if (selectedSaison === "all") return joueur.statistiques_joueur;
    return joueur.statistiques_joueur.filter(
      (s: any) => s.matchs?.competition?.saison === selectedSaison,
    );
  }, [joueur, selectedSaison]);

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!filteredStatsForChart.length) return [];
    const slice = [...filteredStatsForChart].slice(0, 15).reverse();
    let cumButs = 0;
    return slice.map((s: any, i: number) => {
      const m = s.matchs;
      const isHome = m?.equipe_recevant_id === joueur.id_equipe;
      const oppFull = isHome
        ? m?.equipes_matchs_equipe_exterieur_idToequipes?.nom
        : m?.equipes_matchs_equipe_recevant_idToequipes?.nom;
      const opp = oppFull
        ? oppFull.split(" ").slice(-2).join(" ")
        : `J${i + 1}`;
      const buts = s.buts || 0;
      const tirs = s.tirs || 0;
      cumButs += buts;
      const moyButs = parseFloat((cumButs / (i + 1)).toFixed(2));
      const pctTir = tirs > 0 ? Math.round((buts / tirs) * 100) : null;
      return {
        name: opp,
        Buts: buts,
        Tirs: tirs,
        Arrêts: s.arrets || 0,
        "Moy. Buts": moyButs,
        "% Tir": pctTir,
      };
    });
  }, [filteredStatsForChart, joueur]);

  // ── Goalkeeper-specific chart data (only matches with ≥1 arrêt) ──────────
  const chartDataGardien = useMemo(() => {
    if (!hasGardienPoste || !filteredStatsForChart.length) return [];
    return [...filteredStatsForChart]
      .filter((s: any) => (s.arrets || 0) > 0)
      .slice(0, 15)
      .reverse()
      .map((s: any, i: number) => {
        const m = s.matchs;
        const isHome = m?.equipe_recevant_id === joueur.id_equipe;
        const oppFull = isHome
          ? m?.equipes_matchs_equipe_exterieur_idToequipes?.nom
          : m?.equipes_matchs_equipe_recevant_idToequipes?.nom;
        const opp = oppFull
          ? oppFull.split(" ").slice(-2).join(" ")
          : `M${i + 1}`;
        const myArrets = s.arrets || 0;

        // Parse goals conceded from score_final
        let goalsConceded = 0;
        if (m?.score_final) {
          const parts = m.score_final.replace(/\s/g, "").split("-");
          if (parts.length === 2) {
            const n1 = parseInt(parts[0]);
            const n2 = parseInt(parts[1]);
            if (!isNaN(n1) && !isNaN(n2)) {
              goalsConceded = isHome ? n2 : n1;
            }
          }
        }

        // Team total arrets for this match from the precomputed map
        const matchId: number | undefined = m?.id;
        const teamArrets: number =
          matchId !== undefined ? (joueur.arretsParMatch?.[matchId] ?? 0) : 0;

        // Save % = arrêts / (arrêts + buts encaissés) × 100
        const denomPerso = myArrets + goalsConceded;
        const pctPerso =
          denomPerso > 0 ? Math.round((myArrets / denomPerso) * 100) : null;

        const denomEquipe = teamArrets + goalsConceded;
        const pctEquipe =
          denomEquipe > 0 ? Math.round((teamArrets / denomEquipe) * 100) : null;

        return {
          name: opp,
          Arrêts: myArrets,
          "% Perso": pctPerso,
          "% Équipe": pctEquipe,
        };
      });
  }, [hasGardienPoste, filteredStatsForChart, joueur]);

  const gardienKPIs = useMemo(() => {
    if (!hasGardienPoste || !joueur?.statistiques_joueur?.length) return null;
    // Use all stats (not filtered) for global KPIs
    const stats = joueur.statistiques_joueur;
    const totalArrets = stats.reduce(
      (a: number, s: any) => a + (s.arrets || 0),
      0,
    );
    const bestMatch = Math.max(...stats.map((s: any) => s.arrets || 0));
    const avgArrets =
      stats.length > 0 ? (totalArrets / stats.length).toFixed(1) : "0.0";
    // % arrêts global = arrêts / (arrêts + buts encaissés)
    const totalButsEncaisses = stats.reduce((acc: number, s: any) => {
      const m = s.matchs;
      if (!m?.score_final) return acc;
      const parts = m.score_final.replace(/\s/g, "").split("-");
      if (parts.length !== 2) return acc;
      const n1 = parseInt(parts[0]);
      const n2 = parseInt(parts[1]);
      if (isNaN(n1) || isNaN(n2)) return acc;
      const isHome = m.equipe_recevant_id === joueur.id_equipe;
      return acc + (isHome ? n2 : n1);
    }, 0);
    const pctArretsGlobal =
      totalArrets + totalButsEncaisses > 0
        ? Math.round((totalArrets / (totalArrets + totalButsEncaisses)) * 100)
        : null;
    const pctValues = chartDataGardien
      .map((d) => d["% Perso"])
      .filter((v): v is number => v !== null);
    const avgPctPerso =
      pctValues.length > 0
        ? Math.round(pctValues.reduce((a, b) => a + b, 0) / pctValues.length)
        : null;
    return { totalArrets, bestMatch, avgArrets, avgPctPerso, pctArretsGlobal };
  }, [hasGardienPoste, joueur, chartDataGardien]);

  const isEntraineur = ["ENTRAINEUR", "ADMIN_CLUB", "ADMIN_GENERAL"].includes(
    userRole ?? "",
  );

  // ── Objectives current season ───────────────────────────────────────────────
  const objectifsSaison = useMemo(
    () =>
      (joueur?.objectifs || []).filter((o: any) => o.saison === CURRENT_SAISON),
    [joueur],
  );

  // ── Objective dialog handlers ───────────────────────────────────────────────
  function openAddObjectif() {
    setEditingObjectif(null);
    setObjForm({
      type_objectif: "buts",
      valeur_cible: "",
      fixe_par: "entraineur",
      saison: CURRENT_SAISON,
      note: "",
    });
    setDialogOpen(true);
  }

  function openEditObjectif(obj: any) {
    setEditingObjectif(obj);
    setObjForm({
      type_objectif: obj.type_objectif as ObjectifType,
      valeur_cible: String(obj.valeur_cible),
      fixe_par: obj.fixe_par as FixePar,
      saison: obj.saison,
      note: obj.note || "",
    });
    setDialogOpen(true);
  }

  async function handleSaveObjectif() {
    if (!objForm.valeur_cible || isNaN(Number(objForm.valeur_cible))) {
      toast.error("Valeur cible invalide");
      return;
    }
    setSavingObj(true);
    try {
      const res = await upsertObjectif({
        id_joueur: joueur.id,
        saison: objForm.saison,
        type_objectif: objForm.type_objectif,
        valeur_cible: Number(objForm.valeur_cible),
        fixe_par: objForm.fixe_par,
        note: objForm.note || undefined,
      });
      if (res.success) {
        toast.success("Objectif enregistré");
        setDialogOpen(false);
        const refreshed = await getJoueurComplet(params.joueurId as string);
        if (refreshed.success) setJoueur(refreshed.data);
      } else {
        toast.error(res.error);
      }
    } finally {
      setSavingObj(false);
    }
  }

  async function handleDeleteObjectif(id: number) {
    const res = await deleteObjectif(id);
    if (res.success) {
      toast.success("Objectif supprimé");
      const refreshed = await getJoueurComplet(params.joueurId as string);
      if (refreshed.success) setJoueur(refreshed.data);
    } else {
      toast.error(res.error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] text-white">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="font-sport italic uppercase tracking-widest opacity-50">
          Chargement du profil…
        </p>
      </div>
    );
  }

  if (!joueur) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <div className="bg-[#0F172A] text-white pt-10 pb-28 px-4 sm:px-6 md:px-16 rounded-b-[4rem] relative overflow-hidden border-b-8 border-secondary shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-5 font-sport text-[20rem] italic uppercase pointer-events-none leading-none select-none">
          {joueur.num_maillot || "00"}
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex gap-3 mb-8">
            <Button
              variant="ghost"
              className="text-white/50 hover:text-white p-0 hover:bg-transparent transition-colors"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> Dashboard
            </Button>
            {joueur?.id_equipe && params.clubId && (
              <Button
                variant="ghost"
                className="text-white/50 hover:text-white p-0 hover:bg-transparent transition-colors"
                onClick={() => router.push(`/dashboard/clubs/${params.clubId}/equipes/${joueur.id_equipe}`)}
              >
                <ArrowLeft className="w-5 h-5 mr-2" /> Retour à l'équipe
              </Button>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-10">
            {/* Identity */}
            <div className="text-center md:text-left space-y-4">
              {/* Saisons du joueur */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {saisons.length > 0 ? (
                  saisons.map((s) => (
                    <div
                      key={s}
                      className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 px-4 py-1.5 rounded-full"
                    >
                      <Trophy size={14} className="text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Saison {s}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 px-4 py-1.5 rounded-full">
                    <Trophy size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Saison {CURRENT_SAISON}
                    </span>
                  </div>
                )}
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-9xl font-sport font-black italic leading-[0.8] tracking-tighter">
                {formatNomPrenom(joueur.nom_prenom).split(" ")[0]} <br />
                <span className="text-primary font-outline-2">
                  {formatNomPrenom(joueur.nom_prenom)
                    .split(" ")
                    .slice(1)
                    .join(" ")}
                </span>
              </h1>

              <div className="flex flex-wrap justify-center md:justify-start gap-8 mt-8">
                <div className="space-y-1">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                    Poste Principal
                  </p>
                  <p className="text-white font-sport italic text-3xl uppercase">
                    {joueur.poste_principal || "Polyvalent"}
                  </p>
                </div>
                <div className="w-px h-14 bg-white/10 hidden md:block" />
                <div className="space-y-1">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                    Équipe Actuelle
                  </p>
                  <p className="text-secondary font-sport italic text-3xl uppercase">
                    {joueur.equipes?.nom || "N/A"}
                  </p>
                </div>
                {joueur.postes_secondaires?.length > 0 && (
                  <>
                    <div className="w-px h-14 bg-white/10 hidden md:block" />
                    <div className="space-y-2">
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                        Postes Secondaires
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {joueur.postes_secondaires.map((p: string) => (
                          <Badge
                            key={p}
                            className="bg-white/10 text-white border-white/20 uppercase text-[10px] font-black tracking-wider"
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DASHBOARD ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 -mt-16 space-y-8 relative z-20">
        {/* Primary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isGardien ? (
            <>
              <StatBox
                label="Arrêts"
                val={statsGlobales?.arrets ?? 0}
                icon={ShieldCheck}
                color="text-emerald-500"
              />
              <StatBox
                label="Moy. Arrêts / Match"
                val={gardienKPIs?.avgArrets ?? "0.0"}
                icon={TrendingUp}
                color="text-emerald-400"
              />
              <StatBox
                label="% Arrêts"
                val={
                  gardienKPIs?.pctArretsGlobal !== null &&
                  gardienKPIs?.pctArretsGlobal !== undefined
                    ? `${gardienKPIs.pctArretsGlobal}%`
                    : "—"
                }
                icon={Activity}
                color="text-violet-500"
              />
              <StatBox
                label="Matchs"
                val={statsGlobales?.matchs ?? 0}
                icon={Calendar}
                color="text-blue-400"
              />
            </>
          ) : (
            <>
              <StatBox
                label="Matchs joués"
                val={statsGlobales?.matchs ?? 0}
                icon={Calendar}
                color="text-blue-400"
              />
              <StatBox
                label="Total Buts"
                val={statsGlobales?.buts ?? 0}
                icon={Target}
                color="text-primary"
              />
              <StatBox
                label="Buts / Match"
                val={statsGlobales?.moyenneButs ?? "0.0"}
                icon={TrendingUp}
                color="text-blue-400"
              />
              <StatBox
                label="% au Tir"
                val={`${statsGlobales?.pctTir ?? 0}%`}
                icon={Zap}
                color="text-secondary"
              />
            </>
          )}
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat label="Tirs" val={statsGlobales?.tirs ?? 0} />
          <MiniStat label="7 mètres" val={statsGlobales?.septMetres ?? 0} />
          <MiniStat
            label="Avertissements"
            val={statsGlobales?.avertissements ?? 0}
          />
          {!isGardien && (
            <MiniStat
              label="Exclusions 2'"
              val={statsGlobales?.exclusions ?? 0}
            />
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="analyse" className="space-y-8">
          <TabsList className="bg-card border-2 p-1.5 rounded-[2.5rem] h-auto w-full md:w-auto grid grid-cols-3 md:inline-grid shadow-xl gap-1">
            {(["analyse", "objectifs", "matchs"] as const).map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-4xl font-sport italic uppercase text-base px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
              >
                {tab === "analyse"
                  ? "Analyse"
                  : tab === "objectifs"
                    ? "Objectifs"
                    : "Matchs"}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── TAB: ANALYSE ────────────────────────────────────────────────────── */}
          <TabsContent value="analyse" className="space-y-8">
            {/* ── Filtre saison ─────────────────────────────────────────────────── */}
            {saisons.length > 1 && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Saison :
                </span>
                <button
                  onClick={() => setSelectedSaison("all")}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border-2 transition-colors ${
                    selectedSaison === "all"
                      ? "bg-primary text-white border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  Toutes
                </button>
                {saisons.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSaison(s)}
                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border-2 transition-colors ${
                      selectedSaison === s
                        ? "bg-primary text-white border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {/* ── Goalkeeper chart — visible when player has any GK role ──────── */}
            {hasGardienPoste && (
              <Card className="rounded-[3rem] border-2 shadow-xl bg-[#0F172A] text-white p-8">
                {/* Mini KPIs strip */}
                {gardienKPIs && (
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                      <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">
                        Meilleur match
                      </p>
                      <p className="font-sport italic font-black text-4xl text-emerald-400">
                        {gardienKPIs.bestMatch}
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-1">
                        arrêts
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                      <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">
                        Moy. / match
                      </p>
                      <p className="font-sport italic font-black text-4xl text-white">
                        {gardienKPIs.avgArrets}
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-1">
                        arrêts
                      </p>
                    </div>
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 text-center">
                      <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">
                        % arrêt moy.
                      </p>
                      <p className="font-sport italic font-black text-4xl text-violet-400">
                        {gardienKPIs.avgPctPerso !== null
                          ? `${gardienKPIs.avgPctPerso}%`
                          : "—"}
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-1">
                        perso / match
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="font-sport italic text-3xl uppercase">
                      Arrêts &amp; % d'arrêt par rencontre
                    </h3>
                    <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">
                      {chartDataGardien.length} rencontres avec au moins 1 arrêt
                    </p>
                  </div>
                  <div className="flex gap-4 flex-wrap justify-end">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                        Arrêts
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-violet-400" />
                      <span className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                        % Perso
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-sky-400" />
                      <span className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                        % Équipe
                      </span>
                    </div>
                  </div>
                </div>

                {chartDataGardien.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart
                      data={chartDataGardien}
                      margin={{ top: 24, right: 40, left: -10, bottom: 48 }}
                      barGap={4}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        stroke="rgba(255,255,255,0.07)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: "rgba(255,255,255,0.55)",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                        angle={-40}
                        textAnchor="end"
                        interval={0}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      />
                      {/* Left axis — Arrêts count */}
                      <YAxis
                        yAxisId="left"
                        tick={{
                          fill: "rgba(255,255,255,0.45)",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={28}
                      />
                      {/* Right axis — percentages 0-100 */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{
                          fill: "rgba(255,255,255,0.30)",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1E293B",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: "0.75rem",
                          color: "#fff",
                          fontSize: "13px",
                          fontWeight: 700,
                          padding: "10px 16px",
                        }}
                        labelStyle={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: 4,
                        }}
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                        formatter={
                          ((value: any, name: any) =>
                            String(name).startsWith("%")
                              ? [`${value ?? "—"}%`, name]
                              : [value, name]) as any
                        }
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="Arrêts"
                        fill="#34d399"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={44}
                        label={{
                          position: "top",
                          fill: "rgba(255,255,255,0.45)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="% Perso"
                        stroke="#a78bfa"
                        strokeWidth={2.5}
                        dot={{ fill: "#a78bfa", r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="% Équipe"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        dot={{ fill: "#38bdf8", r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-white/20 font-sport italic text-xl uppercase tracking-widest">
                    Aucune donnée disponible
                  </div>
                )}
              </Card>
            )}

            {/* ── Field player chart — hidden only for pure goalkeepers ────────── */}
            {!isGardienPur && (
              <Card className="rounded-[3rem] border-2 shadow-xl bg-[#0F172A] text-white p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="font-sport italic text-3xl uppercase">
                      Buts &amp; Tirs par match
                    </h3>
                    <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">
                      {Math.min(15, joueur.statistiques_joueur?.length ?? 0)}{" "}
                      dernières rencontres
                    </p>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-end">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: "#818cf8" }}
                      />
                      <span className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                        Buts
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: "#475569" }}
                      />
                      <span className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                        Tirs
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 border-t-2 rounded-full"
                        style={{ borderColor: "#f472b6" }}
                      />
                      <span className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                        Moy. Buts
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 border-t-2 border-dashed rounded-full"
                        style={{ borderColor: "#fbbf24" }}
                      />
                      <span className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                        % Tir
                      </span>
                    </div>
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 24, right: 44, left: -10, bottom: 48 }}
                      barGap={4}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        stroke="rgba(255,255,255,0.07)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: "rgba(255,255,255,0.55)",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                        angle={-40}
                        textAnchor="end"
                        interval={0}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      />
                      {/* Left axis — counts */}
                      <YAxis
                        yAxisId="left"
                        tick={{
                          fill: "rgba(255,255,255,0.45)",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={28}
                      />
                      {/* Right axis — percentage 0–100 */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{
                          fill: "rgba(255,255,255,0.30)",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1E293B",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: "0.75rem",
                          color: "#fff",
                          fontSize: "13px",
                          fontWeight: 700,
                          padding: "10px 16px",
                        }}
                        labelStyle={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: 4,
                        }}
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                        formatter={
                          ((value: any, name: any) =>
                            name === "% Tir"
                              ? [`${value ?? "—"}%`, name]
                              : name === "Moy. Buts"
                                ? [Number(value).toFixed(2), name]
                                : [value, name]) as any
                        }
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="Tirs"
                        fill="#334155"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="Buts"
                        fill="#818cf8"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                        label={{
                          position: "top",
                          fill: "rgba(255,255,255,0.6)",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="Moy. Buts"
                        stroke="#f472b6"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, fill: "#f472b6" }}
                        connectNulls
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="% Tir"
                        stroke="#fbbf24"
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        dot={{ fill: "#fbbf24", r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-72 flex items-center justify-center text-white/20 font-sport italic text-xl uppercase tracking-widest">
                    Aucune donnée disponible
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          {/* ── TAB: OBJECTIFS ──────────────────────────────────────────────────── */}
          <TabsContent value="objectifs" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-sport italic uppercase text-3xl tracking-tight">
                  Objectifs Saison {CURRENT_SAISON}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Fixés par l'entraîneur · progression calculée automatiquement
                </p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                {isEntraineur && (
                  <DialogTrigger asChild>
                    <Button
                      onClick={openAddObjectif}
                      className="rounded-2xl font-sport italic uppercase gap-2"
                    >
                      <Plus className="w-4 h-4" /> Ajouter
                    </Button>
                  </DialogTrigger>
                )}
                <DialogContent className="rounded-4xl max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-sport italic uppercase text-2xl">
                      {editingObjectif
                        ? "Modifier l'objectif"
                        : "Nouvel objectif"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 pt-2">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Saison
                      </label>
                      <Select
                        value={objForm.saison}
                        onValueChange={(v) =>
                          setObjForm((f) => ({ ...f, saison: v }))
                        }
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2025-2026">2025-2026</SelectItem>
                          <SelectItem value="2024-2025">2024-2025</SelectItem>
                          <SelectItem value="2026-2027">2026-2027</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Type d'objectif
                      </label>
                      <Select
                        value={objForm.type_objectif}
                        onValueChange={(v) =>
                          setObjForm((f) => ({
                            ...f,
                            type_objectif: v as ObjectifType,
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.entries(OBJECTIF_LABELS) as [
                              ObjectifType,
                              string,
                            ][]
                          ).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Valeur cible
                        {objForm.type_objectif === "pct_tir" ? " (%)" : ""}
                        {objForm.type_objectif === "exclusions_max"
                          ? " (maximum toléré)"
                          : ""}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={objForm.type_objectif === "pct_tir" ? "0.1" : "1"}
                        value={objForm.valeur_cible}
                        onChange={(e) =>
                          setObjForm((f) => ({
                            ...f,
                            valeur_cible: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="ex: 50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Note (optionnel)
                      </label>
                      <textarea
                        rows={2}
                        value={objForm.note}
                        onChange={(e) =>
                          setObjForm((f) => ({ ...f, note: e.target.value }))
                        }
                        className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Motivation, contexte..."
                      />
                    </div>

                    <Button
                      onClick={handleSaveObjectif}
                      disabled={savingObj}
                      className="w-full rounded-2xl font-sport italic uppercase py-5 text-lg"
                    >
                      {savingObj && (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {objectifsSaison.length === 0 ? (
              <Card className="rounded-[3rem] border-2 border-dashed bg-card p-16 text-center">
                <Flag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                <p className="font-sport italic uppercase text-2xl text-muted-foreground">
                  Aucun objectif cette saison
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  {isEntraineur
                    ? "Définissez des objectifs pour suivre la progression du joueur"
                    : "L'entraîneur n'a pas encore défini d'objectifs pour cette saison"}
                </p>
                {isEntraineur && (
                  <Button
                    onClick={openAddObjectif}
                    variant="outline"
                    className="mt-8 rounded-2xl font-sport italic uppercase gap-2"
                  >
                    <Plus className="w-4 h-4" /> Premier objectif
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {objectifsSaison.map((obj: any) => {
                  const type = obj.type_objectif as ObjectifType;
                  const actual = getActualValue(
                    type,
                    joueur.statistiques_joueur || [],
                  );
                  const progress = getObjectifProgress(
                    type,
                    actual,
                    obj.valeur_cible,
                  );
                  const Icon = OBJECTIF_ICONS[type] || Target;
                  const isInverse = type === "exclusions_max";
                  const isComplete = isInverse
                    ? actual <= obj.valeur_cible
                    : actual >= obj.valeur_cible;

                  return (
                    <Card
                      key={obj.id}
                      className={cn(
                        "rounded-[2.5rem] border-2 shadow-lg bg-card p-6 relative overflow-hidden",
                        isComplete && "ring-2 ring-emerald-500/30",
                      )}
                    >
                      {isComplete && (
                        <div className="absolute top-4 right-14">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-5">
                        <div
                          className={cn(
                            "flex items-center gap-3 border rounded-2xl px-4 py-2",
                            OBJECTIF_BG[type],
                          )}
                        >
                          <Icon
                            className={cn("w-5 h-5", OBJECTIF_COLORS[type])}
                          />
                          <span
                            className={cn(
                              "font-sport italic uppercase font-black text-sm",
                              OBJECTIF_COLORS[type],
                            )}
                          >
                            {OBJECTIF_LABELS[type]}
                          </span>
                        </div>
                        {isEntraineur && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditObjectif(obj)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteObjectif(obj.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-end gap-2 mb-4">
                        <span className="font-sport italic font-black text-5xl text-foreground leading-none">
                          {formatObjectifUnit(type, actual)}
                        </span>
                        <span className="text-muted-foreground font-bold text-lg mb-1">
                          / {formatObjectifUnit(type, obj.valeur_cible)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-muted-foreground">
                            {isInverse ? "Respect objectif" : "Progression"}
                          </span>
                          <span
                            className={cn(
                              isComplete
                                ? "text-emerald-500"
                                : OBJECTIF_COLORS[type],
                            )}
                          >
                            {progress}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              isComplete
                                ? "bg-emerald-500"
                                : isInverse && actual > obj.valeur_cible
                                  ? "bg-rose-500"
                                  : "bg-linear-to-r from-primary to-secondary",
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black uppercase tracking-wider"
                        >
                          {obj.fixe_par === "entraineur"
                            ? "📋 Entraîneur"
                            : "🎯 Joueur"}
                        </Badge>
                        {obj.note && (
                          <span className="text-[10px] text-muted-foreground italic truncate max-w-[180px]">
                            "{obj.note}"
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}

                {isEntraineur && (
                  <button
                    onClick={openAddObjectif}
                    className="rounded-[2.5rem] border-2 border-dashed border-muted hover:border-primary/50 bg-card hover:bg-primary/5 p-6 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-primary transition-all min-h-[200px] group"
                  >
                    <Plus className="w-10 h-10 group-hover:scale-110 transition-transform" />
                    <span className="font-sport italic uppercase text-sm tracking-widest">
                      Ajouter un objectif
                    </span>
                  </button>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── TAB: MATCHS ─────────────────────────────────────────────────────── */}
          <TabsContent value="matchs">
            <Card className="rounded-[3rem] border-2 shadow-2xl overflow-hidden bg-card">
              <div className="p-8 border-b bg-muted/20 flex justify-between items-center">
                <h3 className="font-sport italic text-3xl uppercase tracking-tight">
                  Détails des rencontres
                </h3>
                <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs">
                  <Calendar size={14} /> Saison {CURRENT_SAISON}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left bg-muted/50 border-b">
                      {[
                        "Match / Adversaire",
                        "Score",
                        "Buts",
                        "Tirs",
                        isGardien ? "Arrêts" : "7m",
                        "Sanctions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center first:text-left"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/50">
                    {joueur.statistiques_joueur.map((s: any) => {
                      const m = s.matchs;
                      const isHome = m.equipe_recevant_id === joueur.id_equipe;
                      const oppName = isHome
                        ? (m.exterieur_nom_display ??
                          m.equipes_matchs_equipe_exterieur_idToequipes?.nom)
                        : (m.recevant_nom_display ??
                          m.equipes_matchs_equipe_recevant_idToequipes?.nom);
                      const dateStr = m.date_match
                        ? new Date(m.date_match).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "Date à définir";

                      return (
                        <tr
                          key={s.id}
                          className="group hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-6">
                            <div className="flex flex-col">
                              <span className="font-sport italic font-black text-lg uppercase text-primary leading-none mb-1">
                                vs {oppName ?? "Adversaire"}
                              </span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                {dateStr}
                              </span>
                            </div>
                          </td>
                          <td className="p-6 text-center">
                            <Badge className="bg-[#0F172A] text-white font-sport italic text-base px-4 py-1">
                              {m.score_final ?? "—"}
                            </Badge>
                          </td>
                          <td className="p-6 text-center">
                            <span className="font-sport italic font-black text-2xl text-primary">
                              {s.buts ?? 0}
                            </span>
                          </td>
                          <td className="p-6 text-center font-bold text-muted-foreground">
                            {s.tirs ?? 0}
                          </td>
                          <td className="p-6 text-center">
                            {isGardien ? (
                              <span className="font-sport italic font-black text-2xl text-emerald-500">
                                {s.arrets ?? 0}
                              </span>
                            ) : (
                              <span className="font-bold text-muted-foreground">
                                {s.sept_metres ?? 0}
                              </span>
                            )}
                          </td>
                          <td className="p-6">
                            <div className="flex justify-center gap-2">
                              {(s.avertissements ?? 0) > 0 && (
                                <div
                                  className="w-4 h-6 bg-yellow-400 rounded-sm shadow-sm"
                                  title={`${s.avertissements} avert.`}
                                />
                              )}
                              {(s.exclusions_2min ?? 0) > 0 && (
                                <div className="w-7 h-7 bg-primary text-[10px] flex items-center justify-center text-white font-black rounded-lg shadow-lg border-2 border-background">
                                  2'
                                </div>
                              )}
                              {(s.discipline ?? 0) > 0 && (
                                <div
                                  className="w-4 h-6 bg-rose-600 rounded-sm shadow-sm"
                                  title="Rouge"
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatBox({
  label,
  val,
  icon: Icon,
  color,
}: {
  label: string;
  val: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="rounded-[2.5rem] border-2 shadow-lg bg-card/80 backdrop-blur-md hover:scale-105 transition-transform duration-300">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className="p-3 rounded-2xl mb-3 bg-muted/50">
          <Icon className={color} size={28} />
        </div>
        <p className="text-4xl font-sport italic font-black tracking-tighter mb-1">
          {val}
        </p>
        <p className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.2em]">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, val }: { label: string; val: number }) {
  return (
    <Card className="rounded-4xl border bg-card/60 px-5 py-4 flex items-center justify-between shadow-sm">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-sport italic font-black text-xl text-foreground">
        {val}
      </span>
    </Card>
  );
}

function SkillBar({ label, val }: { label: string; val: number }) {
  const capped = Math.min(100, Math.max(0, val));
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[11px] font-black uppercase italic tracking-widest">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-primary">{Math.round(capped)}%</span>
      </div>
      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden border">
        <div
          className="h-full bg-linear-to-r from-primary to-secondary rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${capped}%` }}
        />
      </div>
    </div>
  );
}
