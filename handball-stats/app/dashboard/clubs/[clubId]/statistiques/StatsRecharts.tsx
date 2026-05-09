"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import type { StatsData } from "@/app/actions/stats-actions";
import { formatNomPrenom } from "@/lib/utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ZAxis,
} from "recharts";
import {
  Users,
  Target,
  Sword,
  Swords,
  Shield,
  TrendingUp,
  Trophy,
  Filter,
  Search,
  ChevronDown,
  X,
} from "lucide-react";

// ─── Couleurs ────────────────────────────────────────────────────────────────
const PALETTE = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ec4899",
  "#14b8a6",
];
const COL_WIN = "#10b981";
const COL_DRAW = "#f59e0b";
const COL_LOSS = "#ef4444";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getResult(
  match: StatsData["matchs"][0],
  equipeIds: number[],
): "win" | "draw" | "loss" | null {
  if (!match.score_final) return null;
  const [a, b] = match.score_final.split("-").map(Number);
  if (isNaN(a) || isNaN(b)) return null;
  const isHome =
    match.equipe_recevant_id != null &&
    equipeIds.includes(match.equipe_recevant_id);
  const ourScore = isHome ? a : b;
  const theirScore = isHome ? b : a;
  if (ourScore > theirScore) return "win";
  if (ourScore === theirScore) return "draw";
  return "loss";
}

function pct(num: number, den: number) {
  return den === 0 ? 0 : Math.round((num / den) * 100);
}
/** Exclut les lignes statistiques aberrantes où buts > tirs (anomalie de saisie) */
function isStatValide(s: { buts?: number | null; tirs?: number | null }) {
  return (s.buts ?? 0) <= (s.tirs ?? 0);
}
function quartile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = lo + 1;
  const frac = pos - lo;
  if (hi >= sorted.length) return +sorted[lo].toFixed(2);
  return +(sorted[lo] + frac * (sorted[hi] - sorted[lo])).toFixed(2);
}
// Format dd/mm/aa — inclut l'année pour gérer les saisons qui chevauchent deux années civiles
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "?";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}
function evolPct(cur: number | null, ref: number | null): number | null {
  if (cur === null || ref === null) return null;
  return Math.round((cur - ref) * 100) / 100;
}

type Difficulte =
  | "Victoire A Sens Unique"
  | "Victoire Facile"
  | "Victoire Serrée"
  | "Match Très Serré"
  | "Défaite Serrée"
  | "Défaite A Sens Unique"
  | "Lourde Défaite";

function getDifficulte(
  match: StatsData["matchs"][0],
  equipeIds: number[],
): Difficulte | null {
  if (!match.score_final) return null;
  const [a, b] = match.score_final.split("-").map(Number);
  if (isNaN(a) || isNaN(b)) return null;
  const isHome =
    match.equipe_recevant_id != null &&
    equipeIds.includes(match.equipe_recevant_id);
  const ours = isHome ? a : b;
  const theirs = isHome ? b : a;
  const diff = ours - theirs;
  if (diff >= 10) return "Victoire A Sens Unique";
  if (diff >= 6) return "Victoire Facile";
  if (diff >= 3) return "Victoire Serrée";
  if (diff >= -2) return "Match Très Serré";
  if (diff >= -5) return "Défaite Serrée";
  if (diff >= -9) return "Lourde Défaite";
  return "Défaite A Sens Unique";
}

const JOURS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

function getJourSemaine(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : JOURS_FR[d.getDay()];
}

function getHeure(dateStr: string | null): string | null {
  if (!dateStr) return null;
  // Only extract time if the string actually contains a time component.
  // Date-only strings ("2024-10-15") are parsed as UTC midnight by JS and
  // produce a wrong local hour due to timezone offset.
  const hasTime =
    dateStr.includes("T") || (dateStr.length > 10 && dateStr.includes(":"));
  if (!hasTime) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  // Use UTC methods: dates are stored as UTC (e.g. 2023-09-16T18:30:00.000Z → 18h30)
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  // If both are 0 treat as no time info to avoid spurious "00:00" entries.
  if (h === 0 && m === 0) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getMatchSaison(
  match: StatsData["matchs"][0],
  competitions: StatsData["competitions"],
): string | null {
  const comp = competitions.find((c) => c.id === match.competitionId);
  return comp?.saison ?? null;
}

// ─── Filtres ─────────────────────────────────────────────────────────────────
const ALL_DIFFICULTES: Difficulte[] = [
  "Victoire A Sens Unique",
  "Victoire Facile",
  "Victoire Serrée",
  "Match Très Serré",
  "Défaite Serrée",
  "Défaite A Sens Unique",
  "Lourde Défaite",
];

interface Filters {
  equipeIds: number[];
  competitionIds: number[];
  joueurIds: number[];
  saisonFilter: string;
  dateDebut: string;
  dateFin: string;
  localisation: "tous" | "domicile" | "exterieur";
  difficultes: Difficulte[];
  jours: string[];
  heures: string[];
  postes: string[];
  resultats: string[];
}

function applyMatchFilter(
  match: StatsData["matchs"][0],
  filters: Filters,
  equipeIds: number[],
  competitions: StatsData["competitions"],
): boolean {
  // Équipe
  const inEquipe =
    (match.equipe_recevant_id != null &&
      equipeIds.includes(match.equipe_recevant_id)) ||
    (match.equipe_exterieur_id != null &&
      equipeIds.includes(match.equipe_exterieur_id));
  if (!inEquipe) return false;

  // Compétition
  if (
    filters.competitionIds.length > 0 &&
    (match.competitionId == null ||
      !filters.competitionIds.includes(match.competitionId))
  )
    return false;

  // Saison (via compétition liée)
  if (filters.saisonFilter) {
    const saison = getMatchSaison(match, competitions);
    if (saison !== filters.saisonFilter) return false;
  }

  // Score requis pour les filtres suivants
  if (!match.score_final) return false;
  // Exclure les scores invalides (ex : forfait "20-PE")
  const [sa, sb] = match.score_final.split("-").map(Number);
  if (isNaN(sa) || isNaN(sb)) return false;

  // Résultat
  if (filters.resultats.length > 0) {
    const isHome =
      match.equipe_recevant_id != null &&
      equipeIds.includes(match.equipe_recevant_id);
    const ourScore = isHome ? sa : sb;
    const theirScore = isHome ? sb : sa;
    const res =
      ourScore > theirScore
        ? "Victoire"
        : ourScore < theirScore
          ? "Défaite"
          : "Nul";
    if (!filters.resultats.includes(res)) return false;
  }

  // Dates
  if (
    filters.dateDebut &&
    match.date_match &&
    match.date_match < filters.dateDebut
  )
    return false;
  if (filters.dateFin && match.date_match && match.date_match > filters.dateFin)
    return false;

  // Localisation
  if (filters.localisation !== "tous") {
    const isHome =
      match.equipe_recevant_id != null &&
      equipeIds.includes(match.equipe_recevant_id);
    if (filters.localisation === "domicile" && !isHome) return false;
    if (filters.localisation === "exterieur" && isHome) return false;
  }

  // Difficulté
  if (filters.difficultes.length > 0) {
    const d = getDifficulte(match, equipeIds);
    if (!d || !filters.difficultes.includes(d)) return false;
  }

  // Jour de semaine
  if (filters.jours.length > 0) {
    const j = getJourSemaine(match.date_match);
    if (!j || !filters.jours.includes(j)) return false;
  }

  // Heure
  if (filters.heures.length > 0) {
    const h = getHeure(match.date_match);
    if (!h || !filters.heures.includes(h)) return false;
  }

  return true;
}

// ─── Multi-select dropdown (ids numériques) ────────────────────────────────────
function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  allLabel = "Tous",
}: {
  label: string;
  options: { id: number; label: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const allIds = options.map((o) => o.id);
  const isAllSelected =
    selected.length === 0 || selected.length === allIds.length;
  const isPartial = !isAllSelected && selected.length > 0;
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id: number) {
    const currentSelection = isAllSelected ? allIds : selected;
    const next = currentSelection.includes(id)
      ? currentSelection.filter((s) => s !== id)
      : [...currentSelection, id];
    onChange(next.length === 0 || next.length === allIds.length ? [] : next);
  }

  const buttonLabel = isAllSelected
    ? label
    : selected.length === 1
      ? (options.find((o) => o.id === selected[0])?.label ?? label)
      : `${label} · ${selected.length}`;

  return (
    <DropdownShell
      label={buttonLabel}
      active={!isAllSelected}
      open={open}
      setOpen={setOpen}
      ref_={ref}
    >
      <DropdownSearch search={search} setSearch={setSearch} />
      <DropdownItem
        checked={isAllSelected}
        label={allLabel}
        onClick={() => onChange([])}
      />
      <div className="mx-3 border-t border-muted/60" />
      <div className="max-h-56 overflow-y-auto">
        {filtered.map((o) => {
          const checked = !isAllSelected && selected.includes(o.id);
          return (
            <DropdownItem
              key={o.id}
              checked={isAllSelected || checked}
              label={o.label}
              onClick={() => toggle(o.id)}
            />
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-3 text-xs text-muted-foreground italic">
            Aucun résultat
          </p>
        )}
      </div>
      {!isAllSelected && (
        <DropdownFooter count={selected.length} onClear={() => onChange([])} />
      )}
    </DropdownShell>
  );
}

// ─── Multi-select dropdown (chaînes) ──────────────────────────────────────────
function StringMultiSelect({
  label,
  options,
  selected,
  onChange,
  allLabel = "Tous",
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const isAllSelected =
    selected.length === 0 || selected.length === options.length;
  const isPartial = !isAllSelected && selected.length > 0;
  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(val: string) {
    const current = isAllSelected ? options : selected;
    const next = current.includes(val)
      ? current.filter((s) => s !== val)
      : [...current, val];
    onChange(next.length === 0 || next.length === options.length ? [] : next);
  }

  const buttonLabel = isAllSelected
    ? label
    : selected.length === 1
      ? selected[0]
      : `${label} · ${selected.length}`;

  return (
    <DropdownShell
      label={buttonLabel}
      active={!isAllSelected}
      open={open}
      setOpen={setOpen}
      ref_={ref}
    >
      {options.length > 5 && (
        <DropdownSearch search={search} setSearch={setSearch} />
      )}
      <DropdownItem
        checked={isAllSelected}
        label={allLabel}
        onClick={() => onChange([])}
      />
      <div className="mx-3 border-t border-muted/60" />
      <div className="max-h-56 overflow-y-auto">
        {filtered.map((o) => {
          const checked = !isAllSelected && selected.includes(o);
          return (
            <DropdownItem
              key={o}
              checked={isAllSelected || checked}
              label={o}
              onClick={() => toggle(o)}
            />
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-3 text-xs text-muted-foreground italic">
            Aucun résultat
          </p>
        )}
      </div>
      {!isAllSelected && (
        <DropdownFooter count={selected.length} onClear={() => onChange([])} />
      )}
    </DropdownShell>
  );
}

// ─── Sous-composants partagés des dropdowns ────────────────────────────────────
function DropdownShell({
  label,
  active,
  open,
  setOpen,
  ref_,
  children,
}: {
  label: string;
  active: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  ref_: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" ref={ref_}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-xs font-bold uppercase rounded-xl border px-3 py-2 bg-background transition-colors ${active ? "border-primary text-primary" : "hover:border-primary/50"}`}
      >
        {label}
        <ChevronDown
          size={12}
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 min-w-[220px] bg-background border rounded-2xl shadow-xl overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownSearch({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (v: string) => void;
}) {
  return (
    <div className="p-2 border-b">
      <div className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded-xl">
        <Search size={11} className="text-muted-foreground shrink-0" />
        <input
          autoFocus
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs bg-transparent outline-none w-full placeholder:text-muted-foreground"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")}>
            <X
              size={11}
              className="text-muted-foreground hover:text-foreground"
            />
          </button>
        )}
      </div>
    </div>
  );
}

function DropdownItem({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <label className="flex items-center gap-3 px-4 py-2 hover:bg-muted cursor-pointer transition-colors">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onClick}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background"}`}
      >
        {checked && (
          <svg
            viewBox="0 0 10 8"
            className="w-2.5 fill-none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 4l3 3 5-6" />
          </svg>
        )}
      </button>
      <span className="text-xs truncate" onClick={onClick}>
        {label}
      </span>
    </label>
  );
}

function DropdownFooter({
  count,
  onClear,
}: {
  count: number;
  onClear: () => void;
}) {
  return (
    <div className="border-t px-4 py-2 flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground">
        {count} sélectionné{count > 1 ? "s" : ""}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="text-[10px] font-black uppercase text-primary hover:underline"
      >
        Effacer
      </button>
    </div>
  );
}

function FilterBar({
  data,
  filters,
  setFilters,
}: {
  data: StatsData;
  filters: Filters;
  setFilters: (f: Filters) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const saisons = [...new Set(data.competitions.map((c) => c.saison))]
    .sort()
    .reverse();

  const equipeOptions = data.equipes.map((eq) => ({
    id: eq.id,
    label: eq.nom,
  }));
  const competitionOptions = data.competitions
    .filter((c) => !filters.saisonFilter || c.saison === filters.saisonFilter)
    .map((c) => ({ id: c.id, label: c.nom }));

  // Options dynamiques (dérivées des matchs présents)
  const availableJours = useMemo(() => {
    const s = new Set<string>();
    data.matchs.forEach((m) => {
      const j = getJourSemaine(m.date_match);
      if (j) s.add(j);
    });
    return JOURS_FR.filter((j) => s.has(j));
  }, [data.matchs]);

  const availableHeures = useMemo(() => {
    const s = new Set<string>();
    data.matchs.forEach((m) => {
      const h = getHeure(m.date_match);
      if (h) s.add(h);
    });
    return [...s].sort();
  }, [data.matchs]);

  const availablePostes = useMemo(() => {
    const s = new Set<string>();
    data.joueurs
      .filter((j) => equipeOk(j.id_equipe, filters.equipeIds))
      .forEach((j) => {
        if (j.poste_principal) s.add(j.poste_principal);
      });
    return [...s].sort();
  }, [data.joueurs, filters.equipeIds]);

  const RESULTATS_OPTIONS = ["Victoire", "Nul", "Défaite"];

  const hasBaseFilters =
    (filters.equipeIds.length > 0 &&
      filters.equipeIds.length < data.equipes.length) ||
    filters.competitionIds.length > 0 ||
    !!filters.saisonFilter;

  const hasAdvancedFilters =
    !!filters.dateDebut ||
    !!filters.dateFin ||
    filters.localisation !== "tous" ||
    filters.difficultes.length > 0 ||
    filters.jours.length > 0 ||
    filters.heures.length > 0 ||
    filters.postes.length > 0 ||
    filters.resultats.length > 0;

  const hasActiveFilters = hasBaseFilters || hasAdvancedFilters;

  function reset() {
    setFilters({
      equipeIds: data.equipes.map((e) => e.id),
      competitionIds: [],
      joueurIds: [],
      saisonFilter: "",
      dateDebut: "",
      dateFin: "",
      localisation: "tous",
      difficultes: [],
      jours: [],
      heures: [],
      postes: [],
      resultats: [],
    });
  }

  return (
    <div className="space-y-2 mb-6">
      {/* Ligne principale */}
      <div className="flex flex-wrap gap-2 items-center p-3 bg-card rounded-2xl border-2 shadow-sm relative">
        {/* bande d'accent */}
        <div className="absolute left-0 top-0 h-full w-1 bg-primary rounded-l-2xl" />
        <Filter size={14} className="text-primary shrink-0 ml-3" />

        {/* Saison */}
        <select
          className={`text-xs font-bold uppercase rounded-xl border px-3 py-2 bg-background transition-colors hover:border-primary/50 ${filters.saisonFilter ? "border-primary text-primary" : ""}`}
          value={filters.saisonFilter}
          onChange={(e) =>
            setFilters({
              ...filters,
              saisonFilter: e.target.value,
              competitionIds: [],
            })
          }
        >
          <option value="">Toutes saisons</option>
          {saisons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Équipes */}
        <MultiSelectDropdown
          label="Équipes"
          options={equipeOptions}
          selected={
            filters.equipeIds.length === data.equipes.length
              ? []
              : filters.equipeIds
          }
          onChange={(ids) =>
            setFilters({
              ...filters,
              equipeIds: ids.length === 0 ? data.equipes.map((e) => e.id) : ids,
            })
          }
          allLabel="Toutes les équipes"
        />

        {/* Compétitions */}
        <MultiSelectDropdown
          label="Compétitions"
          options={competitionOptions}
          selected={filters.competitionIds}
          onChange={(ids) => setFilters({ ...filters, competitionIds: ids })}
          allLabel="Toutes les compétitions"
        />

        {/* Bouton avancé */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase rounded-xl border px-3 py-2 transition-colors ${hasAdvancedFilters ? "border-primary text-primary bg-primary/5" : "hover:border-primary/50"}`}
        >
          <Filter size={11} />
          Avancé
          {hasAdvancedFilters && (
            <span className="ml-1 w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-black">
              {[
                filters.dateDebut || filters.dateFin ? 1 : 0,
                filters.localisation !== "tous" ? 1 : 0,
                filters.difficultes.length > 0 ? 1 : 0,
                filters.jours.length > 0 ? 1 : 0,
                filters.heures.length > 0 ? 1 : 0,
                filters.postes.length > 0 ? 1 : 0,
                filters.resultats.length > 0 ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
          <ChevronDown
            size={11}
            className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>

        {hasActiveFilters && (
          <button
            className="ml-auto flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground hover:text-primary transition-colors"
            onClick={reset}
          >
            <X size={11} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Ligne avancée */}
      {showAdvanced && (
        <div className="flex flex-wrap gap-2 items-center p-3 bg-primary/5 rounded-2xl border-2 border-primary/20">
          {/* Dates */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-muted-foreground">
              Du
            </span>
            <input
              type="date"
              value={filters.dateDebut}
              onChange={(e) =>
                setFilters({ ...filters, dateDebut: e.target.value })
              }
              className={`text-xs rounded-xl border px-2 py-1.5 bg-background ${filters.dateDebut ? "border-primary text-primary" : ""}`}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-muted-foreground">
              Au
            </span>
            <input
              type="date"
              value={filters.dateFin}
              onChange={(e) =>
                setFilters({ ...filters, dateFin: e.target.value })
              }
              className={`text-xs rounded-xl border px-2 py-1.5 bg-background ${filters.dateFin ? "border-primary text-primary" : ""}`}
            />
          </div>

          {/* Localisation */}
          <select
            className={`text-xs font-bold uppercase rounded-xl border px-3 py-2 bg-background transition-colors ${filters.localisation !== "tous" ? "border-primary text-primary" : "hover:border-primary/50"}`}
            value={filters.localisation}
            onChange={(e) =>
              setFilters({
                ...filters,
                localisation: e.target.value as Filters["localisation"],
              })
            }
          >
            <option value="tous">Dom. + Ext.</option>
            <option value="domicile">Domicile</option>
            <option value="exterieur">Extérieur</option>
          </select>

          {/* Difficulté */}
          <StringMultiSelect
            label="Difficulté"
            options={ALL_DIFFICULTES}
            selected={filters.difficultes as string[]}
            onChange={(vals) =>
              setFilters({ ...filters, difficultes: vals as Difficulte[] })
            }
            allLabel="Toutes difficultés"
          />

          {/* Jours de semaine */}
          {availableJours.length > 0 && (
            <StringMultiSelect
              label="Jour"
              options={availableJours}
              selected={filters.jours}
              onChange={(vals) => setFilters({ ...filters, jours: vals })}
              allLabel="Tous les jours"
            />
          )}

          {/* Heures */}
          {availableHeures.length > 0 && (
            <StringMultiSelect
              label="Heure"
              options={availableHeures}
              selected={filters.heures}
              onChange={(vals) => setFilters({ ...filters, heures: vals })}
              allLabel="Toutes heures"
            />
          )}

          {/* Poste */}
          {availablePostes.length > 0 && (
            <StringMultiSelect
              label="Poste"
              options={availablePostes}
              selected={filters.postes}
              onChange={(vals) => setFilters({ ...filters, postes: vals })}
              allLabel="Tous postes"
            />
          )}

          {/* Résultat */}
          <StringMultiSelect
            label="Résultat"
            options={RESULTATS_OPTIONS}
            selected={filters.resultats}
            onChange={(vals) => setFilters({ ...filters, resultats: vals })}
            allLabel="Tous résultats"
          />
        </div>
      )}
    </div>
  );
}

// ─── Carte métrique simple ────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  sub,
  color = "text-primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="rounded-3xl border-2">
      <CardContent className="p-5">
        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">
          {label}
        </p>
        <p className={`text-3xl font-sport italic font-black ${color}`}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── ChartCard wrapper ────────────────────────────────────────────────────────
function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`rounded-3xl border-2 overflow-visible relative hover:z-20 ${className}`}
    >
      <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3 pt-4 px-5 rounded-t-3xl overflow-hidden">
        <CardTitle className="font-sport italic text-sm uppercase text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible">
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Helpers d'analyse (breakdown par difficulté / jour) ─────────────────────
type Breakdown = {
  byDifficulte: Record<string, number>;
  byJour: Record<string, number>;
};

function computeBreakdown(
  matchList: StatsData["matchs"],
  equipeIds: number[],
): Breakdown {
  const byDifficulte: Record<string, number> = {};
  const byJour: Record<string, number> = {};
  matchList.forEach((m) => {
    const diff = getDifficulte(m, equipeIds);
    if (diff) byDifficulte[diff] = (byDifficulte[diff] ?? 0) + 1;
    const jour = getJourSemaine(m.date_match);
    if (jour) byJour[jour] = (byJour[jour] ?? 0) + 1;
  });
  return { byDifficulte, byJour };
}

function BreakdownSection({
  title,
  data,
  color = "hsl(var(--primary))",
}: {
  title: string;
  data: Record<string, number>;
  color?: string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (!entries.length) return null;
  return (
    <div className="border-t pt-2 space-y-1.5 mt-1">
      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wide">
        {title}
      </p>
      {entries.map(([label, count]) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-muted-foreground truncate max-w-[140px]">
              {label}
            </span>
            <span className="text-[9px] font-black ml-2 shrink-0">
              {count}
              <span className="font-normal opacity-60">
                {" "}
                ({Math.round((count / total) * 100)}%)
              </span>
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full opacity-70"
              style={{
                width: `${Math.round((count / total) * 100)}%`,
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  ONGLET 1 — STATS CLUB                                          ║
// ╚══════════════════════════════════════════════════════════════════╝
function StatsClub({ data, filters }: { data: StatsData; filters: Filters }) {
  const equipeIds = filters.equipeIds;

  const filteredMatchs = useMemo(
    () =>
      data.matchs.filter((m) =>
        applyMatchFilter(m, filters, equipeIds, data.competitions),
      ),
    [data.matchs, data.competitions, equipeIds, filters],
  );

  const winMatchs = useMemo(
    () => filteredMatchs.filter((m) => getResult(m, equipeIds) === "win"),
    [filteredMatchs, equipeIds],
  );
  const drawMatchs = useMemo(
    () => filteredMatchs.filter((m) => getResult(m, equipeIds) === "draw"),
    [filteredMatchs, equipeIds],
  );
  const lossMatchs = useMemo(
    () => filteredMatchs.filter((m) => getResult(m, equipeIds) === "loss"),
    [filteredMatchs, equipeIds],
  );
  const wins = winMatchs.length;
  const draws = drawMatchs.length;
  const losses = lossMatchs.length;
  const total = wins + draws + losses;

  const pieBreakdowns = useMemo(
    () => ({
      Victoires: computeBreakdown(winMatchs, equipeIds),
      Nuls: computeBreakdown(drawMatchs, equipeIds),
      Défaites: computeBreakdown(lossMatchs, equipeIds),
    }),
    [winMatchs, drawMatchs, lossMatchs, equipeIds],
  );

  const pieData = [
    { name: "Victoires", value: wins, fill: COL_WIN },
    { name: "Nuls", value: draws, fill: COL_DRAW },
    { name: "Défaites", value: losses, fill: COL_LOSS },
  ].filter((d) => d.value > 0);

  // % victoires cumulées par équipe (multi-courbes)
  const cumulEquipes = useMemo(() => {
    return data.equipes
      .filter((eq) => equipeIds.includes(eq.id))
      .map((eq) => {
        const eqMatchs = data.matchs
          .filter((m) =>
            applyMatchFilter(m, filters, [eq.id], data.competitions),
          )
          .sort((a, b) =>
            (a.date_match ?? "").localeCompare(b.date_match ?? ""),
          );
        let cumWins = 0;
        return {
          label: eq.nom,
          points: eqMatchs.map((m, i) => {
            if (getResult(m, [eq.id]) === "win") cumWins++;
            return { match: i + 1, pctVictoire: pct(cumWins, i + 1) };
          }),
        };
      });
  }, [data, equipeIds, filters]);

  const cumulChartData = useMemo(() => {
    const maxLen = Math.max(...cumulEquipes.map((e) => e.points.length), 0);
    return Array.from({ length: maxLen }, (_, i) => {
      const pt: Record<string, number> = { match: i + 1 };
      cumulEquipes.forEach((eq) => {
        if (i < eq.points.length) pt[eq.label] = eq.points[i].pctVictoire;
      });
      return pt;
    });
  }, [cumulEquipes]);

  const cumulEquipeLabels = cumulEquipes.map((e) => e.label);

  // Par équipe si plusieurs
  const parEquipe = useMemo(
    () =>
      data.equipes
        .filter((eq) => equipeIds.includes(eq.id))
        .map((eq) => {
          const ms = data.matchs.filter((m) =>
            applyMatchFilter(m, filters, [eq.id], data.competitions),
          );
          const wMatchs = ms.filter((m) => getResult(m, [eq.id]) === "win");
          const dMatchs = ms.filter((m) => getResult(m, [eq.id]) === "draw");
          const lMatchs = ms.filter((m) => getResult(m, [eq.id]) === "loss");
          return {
            equipe: eq.nom,
            victoires: wMatchs.length,
            nuls: dMatchs.length,
            defaites: lMatchs.length,
            total: ms.length,
            brkVictoires: computeBreakdown(wMatchs, [eq.id]),
            brkNuls: computeBreakdown(dMatchs, [eq.id]),
            brkDefaites: computeBreakdown(lMatchs, [eq.id]),
          };
        }),
    [data, equipeIds, filters],
  );

  // ─── Tooltips enrichis ─────────────────────────────────────────────────────
  const PieTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as {
      name: string;
      value: number;
      fill: string;
    };
    const pctVal = pct(d.value, total);
    const brk = pieBreakdowns[d.name as keyof typeof pieBreakdowns];
    return (
      <div className="bg-background border-2 rounded-2xl shadow-xl min-w-[210px] overflow-hidden">
        <div className="overflow-y-auto max-h-80">
          <div className="p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: d.fill }}
              />
              <p className="font-black text-sm">{d.name}</p>
              <span
                className="ml-auto font-black text-base"
                style={{ color: d.fill }}
              >
                {d.value}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Part du total</span>
                <span className="font-black" style={{ color: d.fill }}>
                  {pctVal}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pctVal}%`, background: d.fill }}
                />
              </div>
              <div className="flex justify-between border-t pt-1.5">
                <span className="text-muted-foreground">Total matchs</span>
                <span className="font-bold">{total}</span>
              </div>
            </div>
            {brk && (
              <BreakdownSection
                title="Par type de résultat"
                data={brk.byDifficulte}
                color={d.fill}
              />
            )}
            {brk && (
              <BreakdownSection
                title="Par jour"
                data={brk.byJour}
                color={d.fill}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const BilanTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as {
      equipe: string;
      victoires: number;
      nuls: number;
      defaites: number;
      total: number;
      brkVictoires: Breakdown;
      brkNuls: Breakdown;
      brkDefaites: Breakdown;
    };
    const rows = [
      {
        label: "Victoires",
        val: d.victoires,
        color: COL_WIN,
        textColor: "text-emerald-600",
        brk: d.brkVictoires,
      },
      {
        label: "Nuls",
        val: d.nuls,
        color: COL_DRAW,
        textColor: "text-amber-500",
        brk: d.brkNuls,
      },
      {
        label: "Défaites",
        val: d.defaites,
        color: COL_LOSS,
        textColor: "text-red-500",
        brk: d.brkDefaites,
      },
    ];
    return (
      <div className="bg-background border-2 rounded-2xl shadow-xl min-w-[230px] overflow-hidden">
        <div className="overflow-y-auto max-h-96">
          <div className="p-3 text-xs space-y-2">
            <p className="font-black text-sm pb-2 border-b">
              {d.equipe} — {d.total} matchs
            </p>
            {rows.map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: row.color }}
                    />
                    <span className={`font-black ${row.textColor}`}>
                      {row.label}
                    </span>
                  </div>
                  <span className="font-black">
                    {row.val}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      ({pct(row.val, d.total)}%)
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct(row.val, d.total)}%`,
                      background: row.color,
                    }}
                  />
                </div>
                {row.val > 0 && (
                  <BreakdownSection
                    title="Par type"
                    data={row.brk.byDifficulte}
                    color={row.color}
                  />
                )}
                {row.val > 0 && (
                  <BreakdownSection
                    title="Par jour"
                    data={row.brk.byJour}
                    color={row.color}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const CumulTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const sorted = [...payload].sort(
      (a: any, b: any) => (b.value ?? 0) - (a.value ?? 0),
    );
    return (
      <div className="bg-background border-2 rounded-2xl shadow-xl min-w-[200px] overflow-hidden">
        <div className="overflow-y-auto max-h-72">
          <div className="p-3 text-xs space-y-2">
            <p className="font-black text-sm pb-1.5 border-b">Match {label}</p>
            <div className="space-y-1.5">
              {sorted.map((p: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between gap-4 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: p.color }}
                      />
                      <span className="text-muted-foreground truncate max-w-[110px]">
                        {p.dataKey}
                      </span>
                    </div>
                    <span className="font-black" style={{ color: p.color }}>
                      {p.value}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p.value}%`, background: p.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Métriques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Matchs joués" value={total} />
        <MetricCard
          label="Victoires"
          value={wins}
          color="text-emerald-600"
          sub={`${pct(wins, total)}%`}
        />
        <MetricCard
          label="Nuls"
          value={draws}
          color="text-amber-500"
          sub={`${pct(draws, total)}%`}
        />
        <MetricCard
          label="Défaites"
          value={losses}
          color="text-destructive"
          sub={`${pct(losses, total)}%`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camembert résultats */}
        <ChartCard title="Répartition des résultats">
          <ResponsiveContainer
            width="100%"
            height={260}
            style={{ overflow: "visible" }}
          >
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={95}
                label={({
                  name,
                  percent,
                }: {
                  name?: string;
                  percent?: number;
                }) => `${name ?? ""} ${Math.round((percent ?? 0) * 100)}%`}
                labelLine
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                isAnimationActive={false}
                content={<PieTooltipContent />}
                wrapperStyle={{ pointerEvents: "auto", zIndex: 9999 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Barres par équipe */}
        {parEquipe.length > 1 && (
          <ChartCard title="Bilan par équipe">
            <ResponsiveContainer
              width="100%"
              height={260}
              style={{ overflow: "visible" }}
            >
              <BarChart data={parEquipe}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="equipe" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  isAnimationActive={false}
                  content={<BilanTooltipContent />}
                  wrapperStyle={{ pointerEvents: "auto", zIndex: 9999 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="victoires"
                  name="Victoires"
                  fill={COL_WIN}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="nuls"
                  name="Nuls"
                  fill={COL_DRAW}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="defaites"
                  name="Défaites"
                  fill={COL_LOSS}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* % victoires cumulées par équipe */}
      {cumulChartData.length > 1 && (
        <ChartCard title="% Victoires cumulé au fil des matchs — par équipe">
          <ResponsiveContainer
            width="100%"
            height={260}
            style={{ overflow: "visible" }}
          >
            <LineChart data={cumulChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="match"
                tickFormatter={(v) => `M${v}`}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                isAnimationActive={false}
                content={<CumulTooltipContent />}
                wrapperStyle={{ pointerEvents: "auto", zIndex: 9999 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {cumulEquipeLabels.map((nom, i) => (
                <Line
                  key={nom}
                  type="monotone"
                  dataKey={nom}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  ONGLET 2 — STATS INDIVIDUELLES                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
// Même échelle couleur que la jauge « arrets » : rouge <15%, rouge→vert 15-50%, vert >50%
function arretsColor(v: number): string {
  const t = Math.min(1, Math.max(0, (v - 15) / (50 - 15)));
  return `hsl(${Math.round(t * 120)}, 85%, 46%)`;
}

// ─── Jauge 180° dégradé Rouge→Orange→Vert ────────────────────────────────────
function GaugeArc({
  value,
  label = "% au Tir",
  gradId,
  colorScheme = "tir",
}: {
  value: number;
  label?: string;
  gradId: string;
  colorScheme?: "tir" | "arrets";
}) {
  const v = Math.min(100, Math.max(0, value));
  const cx = 100,
    cy = 90,
    r = 70,
    sw = 15;
  const endAngle = (180 + v * 1.8) * (Math.PI / 180);
  const ex = cx + r * Math.cos(endAngle);
  const ey = cy + r * Math.sin(endAngle);
  const largeArc = v >= 100 ? 1 : 0;

  // Couleur curseur selon le scheme
  let color: string;
  if (colorScheme === "arrets") {
    const t = Math.min(1, Math.max(0, (v - 15) / (50 - 15)));
    color = `hsl(${Math.round(t * 120)}, 85%, 46%)`;
  } else {
    color = `hsl(${Math.round(v * 1.2)}, 85%, 46%)`;
  }

  return (
    <svg viewBox="0 0 200 125" className="w-full max-w-[220px] mx-auto">
      <defs>
        {colorScheme === "tir" ? (
          <linearGradient
            id={gradId}
            gradientUnits="userSpaceOnUse"
            x1="30"
            y1="90"
            x2="170"
            y2="90"
          >
            <stop offset="0%" stopColor="hsl(0,85%,50%)" />
            <stop offset="50%" stopColor="hsl(30,90%,52%)" />
            <stop offset="100%" stopColor="hsl(120,72%,42%)" />
          </linearGradient>
        ) : (
          <linearGradient
            id={gradId}
            gradientUnits="userSpaceOnUse"
            x1="30"
            y1="90"
            x2="170"
            y2="90"
          >
            <stop offset="0%" stopColor="hsl(0,85%,50%)" />
            <stop offset="15%" stopColor="hsl(0,85%,50%)" />
            <stop offset="50%" stopColor="hsl(120,72%,42%)" />
            <stop offset="100%" stopColor="hsl(120,72%,42%)" />
          </linearGradient>
        )}
      </defs>
      {/* Zone grise — portion non remplie */}
      <path
        d={`M 30 90 A ${r} ${r} 0 1 1 170 90`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={sw}
        strokeLinecap="round"
        opacity="0.28"
      />
      {/* Arc rempli */}
      {v > 0 && (
        <path
          d={`M 30 90 A ${r} ${r} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      )}
      {/* Curseur */}
      {v > 0 && v < 100 && (
        <circle
          cx={ex}
          cy={ey}
          r={sw / 2 + 2}
          fill="white"
          stroke={color}
          strokeWidth="2.5"
        />
      )}
      {/* Valeur centrale */}
      <text
        x="100"
        y="76"
        textAnchor="middle"
        fontWeight="900"
        fontSize="33"
        fill={color}
        fontFamily="var(--font-russo, sans-serif)"
      >
        {v}%
      </text>
      {/* Libellé détail */}
      <text
        x="100"
        y="96"
        textAnchor="middle"
        fontSize="9"
        fontWeight="600"
        fill="hsl(var(--muted-foreground))"
      >
        {label}
      </text>
      {/* Min/max */}
      <text
        x="14"
        y="120"
        textAnchor="middle"
        fontSize="8"
        fill="hsl(var(--muted-foreground))"
      >
        0%
      </text>
      <text
        x="186"
        y="120"
        textAnchor="middle"
        fontSize="8"
        fill="hsl(var(--muted-foreground))"
      >
        100%
      </text>
    </svg>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  ONGLET 2 — STATS INDIVIDUELLES                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
function StatsIndividuelles({
  data,
  filters,
}: {
  data: StatsData;
  filters: Filters;
}) {
  const [selectedJoueurId, setSelectedJoueurId] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState<
    "5M" | "5S" | "10M" | "10S" | "SAISON" | "TOTAL"
  >("5M");
  const [refSaison, setRefSaison] = useState<string | null>(null);
  const [compareModeGardien, setCompareModeGardien] = useState<
    "5M" | "5S" | "10M" | "10S" | "SAISON" | "TOTAL"
  >("5M");
  const [refSaisonGardien, setRefSaisonGardien] = useState<string | null>(null);
  const [indivDropdownOpen, setIndivDropdownOpen] = useState(false);
  const [indivSearch, setIndivSearch] = useState("");

  const equipeColorMap = useMemo(() => {
    const m: Record<number, string> = {};
    data.equipes.forEach((eq, i) => {
      m[eq.id] = TEAM_PALETTE[i % TEAM_PALETTE.length];
    });
    return m;
  }, [data.equipes]);

  const joueursFiltres = useMemo(
    () =>
      data.joueurs.filter(
        (j) =>
          equipeOk(j.id_equipe, filters.equipeIds) &&
          (filters.postes.length === 0 ||
            filters.postes.includes(j.poste_principal ?? "")),
      ),
    [data.joueurs, filters.equipeIds, filters.postes],
  );

  const indivJoueursFiltres = useMemo(
    () =>
      joueursFiltres.filter((j) =>
        indivSearch
          ? formatNomPrenom(j.nom_prenom)
              .toLowerCase()
              .includes(indivSearch.toLowerCase())
          : true,
      ),
    [joueursFiltres, indivSearch],
  );

  const joueur =
    joueursFiltres.find((j) => j.id === selectedJoueurId) ?? joueursFiltres[0];
  const joueurId = joueur?.id ?? null;
  const joueurEquipeId = joueur?.id_equipe ?? null;

  const statsJoueur = useMemo(() => {
    if (!joueurId || !joueurEquipeId) return [];
    return data.statsJoueurs
      .filter((s) => {
        if (s.id_joueur !== joueurId || !s.id_match) return false;
        if (!isStatValide(s)) return false;
        const match = data.matchs.find((m) => m.id === s.id_match);
        return match
          ? applyMatchFilter(
              match,
              filters,
              [joueurEquipeId],
              data.competitions,
            )
          : false;
      })
      .map((s) => {
        const match = data.matchs.find((m) => m.id === s.id_match)!;
        return {
          ...s,
          date_match: match.date_match ?? null,
          match,
          result: getResult(match, [joueurEquipeId]) ?? "draw",
        };
      })
      .sort((a, b) => (a.date_match ?? "").localeCompare(b.date_match ?? ""));
  }, [data, joueurId, joueurEquipeId, filters]);

  const matchsJoue = statsJoueur.length;
  const totalButs = statsJoueur.reduce((a, s) => a + (s.buts ?? 0), 0);
  const totalTirs = statsJoueur.reduce((a, s) => a + (s.tirs ?? 0), 0);
  const pctTirVal = pct(totalButs, totalTirs);
  const wins = statsJoueur.filter((s) => s.result === "win").length;
  const draws = statsJoueur.filter((s) => s.result === "draw").length;
  const losses = statsJoueur.filter((s) => s.result === "loss").length;
  const pctVictoireJoueur = pct(wins, matchsJoue);
  const last5 = statsJoueur.slice(-5);

  // Données cumulatives enrichies
  const cumulJoueur = useMemo(() => {
    let cumButs = 0,
      cumTirs = 0;
    return statsJoueur.map((s, i) => {
      cumButs += s.buts ?? 0;
      cumTirs += s.tirs ?? 0;
      const n = i + 1;
      return {
        label: s.date_match ? fmtDate(s.date_match) : `M${n}`,
        butsDuMatch: s.buts ?? 0,
        tirsDuMatch: s.tirs ?? 0,
        moyButs: parseFloat((cumButs / n).toFixed(2)),
        moyTirs: parseFloat((cumTirs / n).toFixed(2)),
        pctTirCumul: pct(cumButs, cumTirs),
        result: s.result,
      };
    });
  }, [statsJoueur]);

  const availableSaisons = useMemo(() => {
    if (!joueurId) return [];
    const saisons = new Set<string>();
    data.statsJoueurs
      .filter((s) => s.id_joueur === joueurId && s.id_match != null)
      .forEach((s) => {
        const match = data.matchs.find((m) => m.id === s.id_match);
        if (!match) return;
        const saison = getMatchSaison(match, data.competitions);
        if (saison) saisons.add(saison);
      });
    return [...saisons].sort((a, b) => b.localeCompare(a));
  }, [data, joueurId]);

  const currentSaison = useMemo(() => {
    if (filters.saisonFilter) return filters.saisonFilter;
    const last = statsJoueur[statsJoueur.length - 1];
    if (!last) return null;
    return getMatchSaison(last.match, data.competitions);
  }, [statsJoueur, filters.saisonFilter, data.competitions]);

  const evolutionComparison = useMemo(() => {
    if (!statsJoueur.length || !joueurEquipeId) return null;
    const statsPerf = (arr: typeof statsJoueur) => {
      if (!arr.length) return null;
      const tb = arr.reduce((a, s) => a + (s.buts ?? 0), 0);
      const tt = arr.reduce((a, s) => a + (s.tirs ?? 0), 0);
      const n = arr.length;
      return {
        moy_buts: n ? +(tb / n).toFixed(2) : 0,
        moy_tirs: n ? +(tt / n).toFixed(2) : 0,
        pct_tir: pct(tb, tt),
        n,
      };
    };
    let periodeCurrent: typeof statsJoueur = [];
    let periodeRef: typeof statsJoueur = [];
    let labelCurrent = "";
    let labelRef = "";
    const allMatchesSaison = (saison: string | null): typeof statsJoueur => {
      if (!saison || !joueurId || !joueurEquipeId) return [];
      return data.statsJoueurs
        .filter((s) => s.id_joueur === joueurId && s.id_match != null && isStatValide(s))
        .map((s) => {
          const match = data.matchs.find((m) => m.id === s.id_match);
          if (!match) return null;
          if (
            match.equipe_recevant_id !== joueurEquipeId &&
            match.equipe_exterieur_id !== joueurEquipeId
          )
            return null;
          if (getMatchSaison(match, data.competitions) !== saison) return null;
          return {
            ...s,
            date_match: match.date_match ?? null,
            match,
            result: getResult(match, [joueurEquipeId]) ?? "draw",
          };
        })
        .filter(Boolean) as typeof statsJoueur;
    };
    if (compareMode === "5M") {
      periodeCurrent = statsJoueur.slice(-5);
      periodeRef = statsJoueur.slice(-10, -5);
      labelCurrent = "5 derniers matchs";
      labelRef = "5 matchs précédents";
    } else if (compareMode === "5S") {
      periodeCurrent = statsJoueur.slice(-5);
      periodeRef = allMatchesSaison(currentSaison);
      labelCurrent = "5 derniers matchs";
      labelRef = `Saison ${currentSaison ?? "actuelle"} (tout)`;
    } else if (compareMode === "10M") {
      periodeCurrent = statsJoueur.slice(-10);
      periodeRef = statsJoueur.slice(-20, -10);
      labelCurrent = "10 derniers matchs";
      labelRef = "10 matchs précédents";
    } else if (compareMode === "10S") {
      periodeCurrent = statsJoueur.slice(-10);
      periodeRef = allMatchesSaison(currentSaison);
      labelCurrent = "10 derniers matchs";
      labelRef = `Saison ${currentSaison ?? "actuelle"} (tout)`;
    } else if (compareMode === "TOTAL") {
      periodeCurrent = allMatchesSaison(currentSaison);
      labelCurrent = `Saison ${currentSaison ?? "actuelle"}`;
      labelRef = "Tous matchs (toutes saisons)";
      if (joueurId && joueurEquipeId) {
        periodeRef = data.statsJoueurs
          .filter((s) => s.id_joueur === joueurId && s.id_match != null && isStatValide(s))
          .map((s) => {
            const match = data.matchs.find((m) => m.id === s.id_match);
            if (!match) return null;
            if (
              match.equipe_recevant_id !== joueurEquipeId &&
              match.equipe_exterieur_id !== joueurEquipeId
            )
              return null;
            return {
              ...s,
              date_match: match.date_match ?? null,
              match,
              result: getResult(match, [joueurEquipeId]) ?? "draw",
            };
          })
          .filter(Boolean) as typeof statsJoueur;
      }
    } else {
      periodeCurrent = statsJoueur;
      labelCurrent = `Saison ${currentSaison ?? "actuelle"}`;
      labelRef = refSaison ? `Saison ${refSaison}` : "— choisir une saison";
      if (refSaison) {
        periodeRef = data.statsJoueurs
          .filter((s) => {
            if (s.id_joueur !== joueurId || !s.id_match) return false;
            if (!isStatValide(s)) return false;
            const match = data.matchs.find((m) => m.id === s.id_match);
            if (!match) return false;
            if (
              match.equipe_recevant_id !== joueurEquipeId &&
              match.equipe_exterieur_id !== joueurEquipeId
            )
              return false;
            return getMatchSaison(match, data.competitions) === refSaison;
          })
          .map((s) => {
            const match = data.matchs.find((m) => m.id === s.id_match)!;
            return {
              ...s,
              date_match: match.date_match ?? null,
              match,
              result: getResult(match, [joueurEquipeId]) ?? "draw",
            };
          })
          .sort((a, b) =>
            (a.date_match ?? "").localeCompare(b.date_match ?? ""),
          );
      }
    }
    const current = statsPerf(periodeCurrent);
    const ref = periodeRef.length ? statsPerf(periodeRef) : null;
    return { current, ref, labelCurrent, labelRef };
  }, [
    data,
    statsJoueur,
    joueurId,
    joueurEquipeId,
    compareMode,
    refSaison,
    currentSaison,
  ]);

  // ── Gardien ──
  const isGardien = useMemo(() => {
    if (!joueur) return false;
    const pp = (joueur.poste_principal ?? "").toLowerCase();
    const ps = (joueur.postes_secondaires ?? []).map((p) => p.toLowerCase());
    return pp.includes("gardien") || ps.some((p) => p.includes("gardien"));
  }, [joueur]);

  const statsGardienJoueur = useMemo(() => {
    if (!isGardien) return [] as typeof statsJoueur;
    return statsJoueur.filter((s) => (s.arrets ?? 0) >= 2);
  }, [isGardien, statsJoueur]);

  const gardienMatchs = statsGardienJoueur.length;
  const totalArrets = statsGardienJoueur.reduce(
    (a, s) => a + (s.arrets ?? 0),
    0,
  );
  const butsEncGardien = statsGardienJoueur.reduce((acc, s) => {
    if (!s.match.score_final) return acc;
    const [a, b] = s.match.score_final.split("-").map(Number);
    return acc + (s.match.equipe_recevant_id === joueurEquipeId ? b : a);
  }, 0);
  const pctArretsVal = pct(totalArrets, totalArrets + butsEncGardien);
  const moyArretsVal = gardienMatchs
    ? +(totalArrets / gardienMatchs).toFixed(1)
    : 0;

  const cumulGardien = useMemo(() => {
    let cumArr = 0,
      cumEnc = 0;
    return statsGardienJoueur
      .map((s, i) => {
        if (!s.match.score_final) return null;
        const [a, b] = s.match.score_final.split("-").map(Number);
        const enc = s.match.equipe_recevant_id === joueurEquipeId ? b : a;
        const arr = s.arrets ?? 0;
        cumArr += arr;
        cumEnc += enc;
        const n = i + 1;
        return {
          label: s.date_match ? fmtDate(s.date_match) : `M${n}`,
          arretsDuMatch: arr,
          encDuMatch: enc,
          pctArretsMatch: pct(arr, arr + enc),
          moyArrets: +(cumArr / n).toFixed(2),
          pctArretsCumul: pct(cumArr, cumArr + cumEnc),
          result: s.result,
        };
      })
      .filter(Boolean) as {
      label: string;
      arretsDuMatch: number;
      encDuMatch: number;
      pctArretsMatch: number;
      moyArrets: number;
      pctArretsCumul: number;
      result: string;
    }[];
  }, [statsGardienJoueur, joueurEquipeId]);

  const gardienEvolutionComparison = useMemo(() => {
    if (!isGardien || !statsGardienJoueur.length || !joueurEquipeId)
      return null;
    const gardienPerf = (arr: typeof statsGardienJoueur) => {
      if (!arr.length) return null;
      const totalArr = arr.reduce((a, s) => a + (s.arrets ?? 0), 0);
      const totalEnc = arr.reduce((acc, s) => {
        if (!s.match.score_final) return acc;
        const [a, b] = s.match.score_final.split("-").map(Number);
        return acc + (s.match.equipe_recevant_id === joueurEquipeId ? b : a);
      }, 0);
      const n = arr.length;
      return {
        moy_arrets: n ? +(totalArr / n).toFixed(2) : 0,
        pct_arrets: pct(totalArr, totalArr + totalEnc),
        n,
      };
    };
    const allGardienSaison = (
      saison: string | null,
    ): typeof statsGardienJoueur => {
      if (!saison || !joueurId) return [];
      return data.statsJoueurs
        .filter(
          (s) =>
            s.id_joueur === joueurId &&
            s.id_match != null &&
            (s.arrets ?? 0) >= 2,
        )
        .map((s) => {
          const match = data.matchs.find((m) => m.id === s.id_match);
          if (!match) return null;
          if (
            match.equipe_recevant_id !== joueurEquipeId &&
            match.equipe_exterieur_id !== joueurEquipeId
          )
            return null;
          if (getMatchSaison(match, data.competitions) !== saison) return null;
          return {
            ...s,
            date_match: match.date_match ?? null,
            match,
            result: getResult(match, [joueurEquipeId]) ?? "draw",
          };
        })
        .filter(Boolean) as typeof statsGardienJoueur;
    };
    const allGardienTotal = (): typeof statsGardienJoueur => {
      if (!joueurId) return [];
      return data.statsJoueurs
        .filter(
          (s) =>
            s.id_joueur === joueurId &&
            s.id_match != null &&
            (s.arrets ?? 0) >= 2,
        )
        .map((s) => {
          const match = data.matchs.find((m) => m.id === s.id_match);
          if (!match) return null;
          if (
            match.equipe_recevant_id !== joueurEquipeId &&
            match.equipe_exterieur_id !== joueurEquipeId
          )
            return null;
          return {
            ...s,
            date_match: match.date_match ?? null,
            match,
            result: getResult(match, [joueurEquipeId]) ?? "draw",
          };
        })
        .filter(Boolean) as typeof statsGardienJoueur;
    };
    let pCur: typeof statsGardienJoueur = [],
      pRef: typeof statsGardienJoueur = [],
      lCur = "",
      lRef = "";
    if (compareModeGardien === "5M") {
      pCur = statsGardienJoueur.slice(-5);
      pRef = statsGardienJoueur.slice(-10, -5);
      lCur = "5 derniers matchs";
      lRef = "5 matchs précédents";
    } else if (compareModeGardien === "5S") {
      pCur = statsGardienJoueur.slice(-5);
      pRef = allGardienSaison(currentSaison);
      lCur = "5 derniers matchs";
      lRef = `Saison ${currentSaison ?? "actuelle"} (tout)`;
    } else if (compareModeGardien === "10M") {
      pCur = statsGardienJoueur.slice(-10);
      pRef = statsGardienJoueur.slice(-20, -10);
      lCur = "10 derniers matchs";
      lRef = "10 matchs précédents";
    } else if (compareModeGardien === "10S") {
      pCur = statsGardienJoueur.slice(-10);
      pRef = allGardienSaison(currentSaison);
      lCur = "10 derniers matchs";
      lRef = `Saison ${currentSaison ?? "actuelle"} (tout)`;
    } else if (compareModeGardien === "TOTAL") {
      pCur = allGardienSaison(currentSaison);
      pRef = allGardienTotal();
      lCur = `Saison ${currentSaison ?? "actuelle"}`;
      lRef = "Tous matchs (toutes saisons)";
    } else {
      pCur = allGardienSaison(currentSaison);
      pRef = refSaisonGardien ? allGardienSaison(refSaisonGardien) : [];
      lCur = `Saison ${currentSaison ?? "actuelle"}`;
      lRef = refSaisonGardien
        ? `Saison ${refSaisonGardien}`
        : "— choisir une saison";
    }
    return {
      current: gardienPerf(pCur),
      ref: pRef.length ? gardienPerf(pRef) : null,
      labelCurrent: lCur,
      labelRef: lRef,
    };
  }, [
    isGardien,
    statsGardienJoueur,
    joueurEquipeId,
    joueurId,
    compareModeGardien,
    refSaisonGardien,
    currentSaison,
    data,
  ]);

  const CumulJoueurTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const rcol =
      d.result === "win"
        ? "#10b981"
        : d.result === "loss"
          ? "#ef4444"
          : "#f59e0b";
    const rlabel =
      d.result === "win" ? "Victoire" : d.result === "loss" ? "Défaite" : "Nul";
    return (
      <div
        className="bg-background border-2 rounded-2xl shadow-xl min-w-[190px] overflow-hidden"
        style={{ zIndex: 9999 }}
      >
        <div className="overflow-y-auto max-h-80">
          <div className="p-3 text-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b">
              <p className="font-black text-sm">{label}</p>
              <span
                className="font-black text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: rcol + "22", color: rcol }}
              >
                {rlabel}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-emerald-500">
                  {d.butsDuMatch}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Buts
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-indigo-500">
                  {d.tirsDuMatch}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Tirs
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-emerald-400">
                  {d.moyButs}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Moy. Buts
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-indigo-400">
                  {d.moyTirs}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Moy. Tirs
                </p>
              </div>
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">% Tir cumulé</span>
                <span className="font-black text-amber-500">
                  {d.pctTirCumul}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${d.pctTirCumul}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CumulGardienTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const rcol =
      d.result === "win"
        ? "#10b981"
        : d.result === "loss"
          ? "#ef4444"
          : "#f59e0b";
    const rlabel =
      d.result === "win" ? "Victoire" : d.result === "loss" ? "Défaite" : "Nul";
    return (
      <div
        className="bg-background border-2 rounded-2xl shadow-xl min-w-[190px] overflow-hidden"
        style={{ zIndex: 9999 }}
      >
        <div className="overflow-y-auto max-h-80">
          <div className="p-3 text-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b">
              <p className="font-black text-sm">{label}</p>
              <span
                className="font-black text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: rcol + "22", color: rcol }}
              >
                {rlabel}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-indigo-500">
                  {d.arretsDuMatch}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Arrêts
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-red-400">
                  {d.encDuMatch}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Buts enc.
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center col-span-2">
                <p className="font-black text-sm text-indigo-400">
                  {d.moyArrets}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Moy. Arrêts
                </p>
              </div>
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">% Arrêts (match)</span>
                <span
                  className="font-black"
                  style={{ color: arretsColor(d.pctArretsMatch) }}
                >
                  {d.pctArretsMatch}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${d.pctArretsMatch}%`,
                    background: arretsColor(d.pctArretsMatch),
                  }}
                />
              </div>
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">% Arrêts cumulé</span>
                <span
                  className="font-black"
                  style={{ color: arretsColor(d.pctArretsCumul) }}
                >
                  {d.pctArretsCumul}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${d.pctArretsCumul}%`,
                    background: arretsColor(d.pctArretsCumul),
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sélecteur joueur */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-black uppercase text-muted-foreground">
          Joueur
        </span>
        <div className="relative">
          <button
            onClick={() => setIndivDropdownOpen((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold rounded-xl border px-3 py-2 bg-background hover:bg-muted/50 transition-colors min-w-40"
          >
            {joueur && (
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  background:
                    equipeColorMap[joueur.id_equipe ?? -1] ?? TEAM_PALETTE[0],
                }}
              />
            )}
            <span className="truncate max-w-[200px]">
              {joueur
                ? formatNomPrenom(joueur.nom_prenom)
                : "Choisir un joueur"}
            </span>
            <svg
              className="ml-auto w-3 h-3 opacity-50 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {indivDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-60 bg-popover border rounded-xl shadow-lg overflow-hidden">
              <div className="p-2 border-b">
                <input
                  autoFocus
                  type="text"
                  placeholder="Rechercher…"
                  value={indivSearch}
                  onChange={(e) => setIndivSearch(e.target.value)}
                  className="w-full text-xs rounded-lg border px-2.5 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <ul className="max-h-56 overflow-y-auto py-1">
                {indivJoueursFiltres.map((j) => {
                  const equipe = data.equipes.find(
                    (eq) => eq.id === j.id_equipe,
                  );
                  const color =
                    equipeColorMap[j.id_equipe ?? -1] ?? TEAM_PALETTE[0];
                  return (
                    <li key={j.id}>
                      <button
                        onClick={() => {
                          setSelectedJoueurId(j.id);
                          setIndivDropdownOpen(false);
                          setIndivSearch("");
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/60 transition-colors text-left ${
                          j.id === joueurId
                            ? "bg-primary/10 font-bold"
                            : "font-medium"
                        }`}
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: color }}
                        />
                        <span className="flex-1 truncate">
                          {formatNomPrenom(j.nom_prenom)}
                        </span>
                        {equipe && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-20">
                            {equipe.nom}
                          </span>
                        )}
                        {j.poste_principal && (
                          <span
                            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: color + "30", color }}
                          >
                            {j.poste_principal}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {indivJoueursFiltres.length === 0 && (
                  <li className="px-3 py-4 text-xs text-muted-foreground text-center">
                    Aucun joueur
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
        {joueur?.poste_principal && (
          <Badge className="font-sport italic text-[10px] bg-primary/10 text-primary border-primary/20">
            {joueur.poste_principal}
          </Badge>
        )}
      </div>

      {joueur ? (
        <>
          {/* Métriques */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Matchs joués"
              value={matchsJoue}
              sub={`${wins}V · ${draws}N · ${losses}D`}
            />
            <MetricCard
              label="Moy. Buts"
              value={matchsJoue ? (totalButs / matchsJoue).toFixed(1) : "—"}
              color="text-primary"
              sub={`${totalButs} au total`}
            />
            <MetricCard
              label="Moy. Tirs"
              value={matchsJoue ? (totalTirs / matchsJoue).toFixed(1) : "—"}
              sub={`${totalTirs} au total`}
            />
          </div>

          {/* Jauges 180° */}
          <div
            className={`grid grid-cols-1 gap-4 ${isGardien && gardienMatchs > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
          >
            <Card className="rounded-3xl border-2 overflow-hidden">
              <div className="bg-muted/50 border-b px-5 py-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                  % au Tir
                </p>
              </div>
              <div className="flex flex-col items-center px-4 py-2">
                <GaugeArc
                  value={pctTirVal}
                  label={`${totalButs} buts / ${totalTirs} tirs`}
                  gradId="gauge-tir"
                />
              </div>
            </Card>
            <Card className="rounded-3xl border-2 overflow-hidden">
              <div className="bg-muted/50 border-b px-5 py-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                  % Victoires
                </p>
              </div>
              <div className="flex flex-col items-center px-4 py-2">
                <GaugeArc
                  value={pctVictoireJoueur}
                  label={`${wins}V · ${draws}N · ${losses}D`}
                  gradId="gauge-win"
                />
              </div>
            </Card>
            {isGardien && gardienMatchs > 0 && (
              <Card className="rounded-3xl border-2 overflow-hidden">
                <div className="bg-muted/50 border-b px-5 py-3">
                  <p className="text-[11px] font-black uppercase tracking-wide text-indigo-600">
                    % Arrêts
                  </p>
                </div>
                <div className="flex flex-col items-center px-4 py-2">
                  <GaugeArc
                    value={pctArretsVal}
                    label={`${totalArrets} arrêts / ${totalArrets + butsEncGardien} enc.`}
                    gradId="gauge-arrets-main"
                    colorScheme="arrets"
                  />
                </div>
              </Card>
            )}
          </div>

          {/* Forme récente — 5 derniers matchs */}
          {last5.length > 0 && (
            <Card className="rounded-3xl border-2 p-5 overflow-hidden">
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-4">
                Forme récente (5 derniers matchs)
              </p>
              <div className="flex justify-center gap-2.5 overflow-x-auto pb-1">
                {last5.map((s, i) => {
                  const isWin = s.result === "win";
                  const isLoss = s.result === "loss";
                  const letter = isWin ? "V" : isLoss ? "D" : "N";
                  const accentColor = isWin
                    ? "#10b981"
                    : isLoss
                      ? "#ef4444"
                      : "#f59e0b";
                  const bgClass = isWin
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : isLoss
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-amber-400/10 border-amber-400/30";
                  const dateLabel = s.date_match
                    ? fmtDate(s.date_match)
                    : `M${i + 1}`;
                  const buts = s.buts ?? 0;
                  const tirs = s.tirs ?? 0;
                  const pctTirMatch = pct(buts, tirs);
                  const isHome = s.match.equipe_recevant_id === joueurEquipeId;
                  const score = s.match.score_final ?? null;
                  const maxButs = Math.max(...last5.map((x) => x.buts ?? 0), 1);
                  return (
                    <div
                      key={i}
                      className={`shrink-0 w-[120px] rounded-2xl border-2 ${bgClass} overflow-hidden`}
                    >
                      {/* Bande couleur du résultat */}
                      <div
                        className="h-1 w-full"
                        style={{ background: accentColor }}
                      />
                      <div className="p-3 space-y-2">
                        {/* Résultat + badge domicile/ext */}
                        <div className="flex items-center justify-between">
                          <span
                            className="font-sport italic font-black text-xl leading-none"
                            style={{ color: accentColor }}
                          >
                            {letter}
                          </span>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                            {isHome ? "Dom" : "Ext"}
                          </span>
                        </div>
                        {/* Score du match */}
                        {score && (
                          <p className="text-[11px] font-black text-center tracking-wide">
                            {score}
                          </p>
                        )}
                        {/* Buts du joueur */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-black uppercase text-muted-foreground">
                            <span>Buts</span>
                            <span style={{ color: accentColor }}>{buts}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round((buts / maxButs) * 100)}%`,
                                background: accentColor,
                              }}
                            />
                          </div>
                        </div>
                        {/* Tirs + % */}
                        {tirs > 0 && (
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>{tirs} tirs</span>
                            <span className="font-bold">{pctTirMatch}%</span>
                          </div>
                        )}
                        {/* Date */}
                        <p className="text-[9px] text-muted-foreground/60 text-center">
                          {dateLabel}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Barre récap V-N-D */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t">
                {[
                  {
                    label: "V",
                    count: last5.filter((s) => s.result === "win").length,
                    color: "#10b981",
                  },
                  {
                    label: "N",
                    count: last5.filter((s) => s.result === "draw").length,
                    color: "#f59e0b",
                  },
                  {
                    label: "D",
                    count: last5.filter((s) => s.result === "loss").length,
                    color: "#ef4444",
                  },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black text-white"
                      style={{ background: color }}
                    >
                      {label}
                    </span>
                    <span className="text-xs font-black" style={{ color }}>
                      {count}
                    </span>
                  </div>
                ))}
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
                  {(() => {
                    const w = last5.filter((s) => s.result === "win").length;
                    const n = last5.filter((s) => s.result === "draw").length;
                    const d = last5.filter((s) => s.result === "loss").length;
                    const total = last5.length;
                    return (
                      <>
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${(w / total) * 100}%` }}
                        />
                        <div
                          className="h-full bg-amber-400 transition-all"
                          style={{ width: `${(n / total) * 100}%` }}
                        />
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${(d / total) * 100}%` }}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            </Card>
          )}

          {/* Courbe : moy. buts & tirs cumulés + buts par match */}
          {cumulJoueur.length > 1 && (
            <ChartCard title="Moyenne cumulée buts & tirs — évolution par match">
              <ResponsiveContainer
                width="100%"
                height={280}
                style={{ overflow: "visible" }}
              >
                <ComposedChart data={cumulJoueur}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    isAnimationActive={false}
                    content={<CumulJoueurTooltip />}
                    wrapperStyle={{ pointerEvents: "auto", zIndex: 9999 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="butsDuMatch"
                    name="Buts (match)"
                    fill="#10b981"
                    opacity={0.2}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="moyButs"
                    name="Moy. Buts cumulée"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="moyTirs"
                    name="Moy. Tirs cumulée"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 3"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pctTirCumul"
                    name="% Tir cumulé"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Courbe arrêts cumulés (si gardien) */}
          {isGardien && cumulGardien.length > 1 && (
            <ChartCard title="Évolution arrêts & % arrêts cumulé — par match">
              <ResponsiveContainer
                width="100%"
                height={280}
                style={{ overflow: "visible" }}
              >
                <ComposedChart data={cumulGardien}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    isAnimationActive={false}
                    content={<CumulGardienTooltip />}
                    wrapperStyle={{ pointerEvents: "auto", zIndex: 9999 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="arretsDuMatch"
                    name="Arrêts (match)"
                    fill="#6366f1"
                    opacity={0.2}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="moyArrets"
                    name="Moy. Arrêts cumulée"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pctArretsMatch"
                    name="% Arrêts (match)"
                    stroke={arretsColor(
                      cumulGardien.reduce((s, d) => s + d.pctArretsMatch, 0) /
                        Math.max(1, cumulGardien.length),
                    )}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={(p: any) => (
                      <circle
                        key={`am-${p.cx}`}
                        cx={p.cx}
                        cy={p.cy}
                        r={3}
                        fill={arretsColor(p.payload.pctArretsMatch)}
                      />
                    )}
                    activeDot={(p: any) => (
                      <circle
                        cx={p.cx}
                        cy={p.cy}
                        r={5}
                        fill={arretsColor(p.payload.pctArretsMatch)}
                        stroke="white"
                        strokeWidth={1.5}
                      />
                    )}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pctArretsCumul"
                    name="% Arrêts cumulé"
                    stroke={arretsColor(
                      cumulGardien.at(-1)?.pctArretsCumul ?? 0,
                    )}
                    strokeWidth={2}
                    dot={false}
                    activeDot={(p: any) => (
                      <circle
                        cx={p.cx}
                        cy={p.cy}
                        r={5}
                        fill={arretsColor(p.payload.pctArretsCumul)}
                        stroke="white"
                        strokeWidth={1.5}
                      />
                    )}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* ── Évolution & Forme ── */}
          {statsJoueur.length >= 2 && evolutionComparison?.current && (
            <Card className="rounded-3xl border-2 p-5 space-y-4">
              {/* Sélecteur de mode */}
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground mr-1">
                  Analyse d'évolution
                </p>
                {(["5M", "5S", "10M", "10S", "TOTAL", "SAISON"] as const).map(
                  (m) => (
                    <button
                      key={m}
                      onClick={() => setCompareMode(m)}
                      className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border transition-colors ${
                        compareMode === m
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-muted-foreground/30 hover:bg-muted"
                      }`}
                    >
                      {m === "5M"
                        ? "5 vs 5 préc."
                        : m === "5S"
                          ? "5 vs saison"
                          : m === "10M"
                            ? "10 vs 10 préc."
                            : m === "10S"
                              ? "10 vs saison"
                              : m === "TOTAL"
                                ? "Saison vs total"
                                : "Saison vs saison"}
                    </button>
                  ),
                )}
                {compareMode === "SAISON" && (
                  <select
                    className="text-xs font-bold rounded-xl border px-3 py-2 bg-background ml-1"
                    value={refSaison ?? ""}
                    onChange={(e) => setRefSaison(e.target.value || null)}
                  >
                    <option value="">— Saison de référence</option>
                    {availableSaisons
                      .filter((s) => s !== currentSaison)
                      .map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Labels périodes */}
              <div className="flex flex-wrap gap-4 text-[10px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                  <span className="font-black">
                    {evolutionComparison.labelCurrent}
                  </span>
                  <span className="text-muted-foreground">
                    ({evolutionComparison.current.n} matchs)
                  </span>
                </span>
                {evolutionComparison.ref && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60 inline-block" />
                    <span className="font-black">
                      {evolutionComparison.labelRef}
                    </span>
                    <span className="text-muted-foreground">
                      ({evolutionComparison.ref.n} matchs)
                    </span>
                  </span>
                )}
              </div>

              {evolutionComparison.ref ? (
                <>
                  {/* Cartes de comparaison */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(
                      [
                        {
                          key: "moy_buts" as const,
                          label: "Moy. Buts / match",
                          colCur: "text-emerald-600",
                          colPos: "text-emerald-500",
                          colNeg: "text-red-500",
                          suffix: "",
                        },
                        {
                          key: "moy_tirs" as const,
                          label: "Vol. Tirs / match",
                          colCur: "text-indigo-600",
                          colPos: "text-indigo-500",
                          colNeg: "text-orange-500",
                          suffix: "",
                        },
                        {
                          key: "pct_tir" as const,
                          label: "% au Tir",
                          colCur: "text-amber-600",
                          colPos: "text-amber-500",
                          colNeg: "text-red-500",
                          suffix: "%",
                        },
                      ] as {
                        key: "moy_buts" | "moy_tirs" | "pct_tir";
                        label: string;
                        colCur: string;
                        colPos: string;
                        colNeg: string;
                        suffix: string;
                      }[]
                    ).map(({ key, label, colCur, colPos, colNeg, suffix }) => {
                      const cur = evolutionComparison.current![key];
                      const ref = evolutionComparison.ref![key];
                      const delta = +(cur - ref).toFixed(2);
                      const absPct =
                        ref === 0
                          ? null
                          : Math.abs(Math.round((delta / ref) * 100));
                      const isUp = delta > 0.049;
                      const isDown = delta < -0.049;
                      const arrowColor = isUp
                        ? colPos
                        : isDown
                          ? colNeg
                          : "text-muted-foreground";
                      const arrow = isUp ? "↑" : isDown ? "↓" : "→";
                      const phrase = isUp
                        ? `En progression${absPct != null ? ` · +${absPct}%` : ""}`
                        : isDown
                          ? `En baisse${absPct != null ? ` · −${absPct}%` : ""}`
                          : "Stable";
                      const maxVal = Math.max(cur, ref, 0.01);
                      return (
                        <div
                          key={key}
                          className="rounded-2xl border bg-muted/20 p-4 space-y-2.5"
                        >
                          <p className="text-[10px] font-black uppercase text-muted-foreground">
                            {label}
                          </p>
                          <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-black ${colCur}`}>
                              {cur}
                              {suffix}
                            </span>
                            <span
                              className={`text-xl font-black ${arrowColor}`}
                            >
                              {arrow}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              réf. {ref}
                              {suffix}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] font-bold flex items-center gap-1 ${arrowColor}`}
                          >
                            <span>{arrow}</span>
                            <span>{phrase}</span>
                            {delta !== 0 && (
                              <span className="ml-auto font-black">
                                {delta > 0 ? "+" : ""}
                                {delta}
                                {suffix}
                              </span>
                            )}
                          </p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[9px] text-muted-foreground">
                              <span>{evolutionComparison.labelCurrent}</span>
                              <span>
                                {cur}
                                {suffix}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${(cur / maxVal) * 100}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-muted-foreground">
                              <span>{evolutionComparison.labelRef}</span>
                              <span>
                                {ref}
                                {suffix}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-muted-foreground/50 transition-all"
                                style={{ width: `${(ref / maxVal) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Résumé dynamique */}
                  {(() => {
                    const items = [
                      { key: "moy_buts" as const, nom: "buts" },
                      { key: "moy_tirs" as const, nom: "tirs" },
                      { key: "pct_tir" as const, nom: "% au tir" },
                    ];
                    const parts = items.map(({ key, nom }) => {
                      const cur = evolutionComparison.current![key];
                      const ref = evolutionComparison.ref![key];
                      const delta = cur - ref;
                      const absPct =
                        ref === 0
                          ? null
                          : Math.abs(Math.round((delta / ref) * 100));
                      if (Math.abs(delta) <= 0.049) return `${nom} stable →`;
                      if (delta > 0)
                        return `${nom} en hausse ↑${absPct != null ? ` +${absPct}%` : ""}`;
                      return `${nom} en baisse ↓${absPct != null ? ` −${absPct}%` : ""}`;
                    });
                    return (
                      <div className="rounded-2xl border bg-muted/30 p-3 text-xs">
                        <span className="font-black">
                          {formatNomPrenom(joueur?.nom_prenom)} —{" "}
                        </span>
                        <span className="text-muted-foreground">
                          {parts.join(" · ")}
                        </span>
                        <span className="text-muted-foreground italic">
                          {" "}
                          ({evolutionComparison.labelCurrent} vs{" "}
                          {evolutionComparison.labelRef})
                        </span>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic py-2">
                  {compareMode === "SAISON"
                    ? "Sélectionne une saison de référence pour comparer."
                    : "Pas assez de matchs pour cette période de comparaison."}
                </p>
              )}
            </Card>
          )}

          {/* ── Stats Gardien ── */}
          {isGardien && gardienMatchs > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2 pb-1">
                <Shield className="w-4 h-4 text-indigo-500" />
                <p className="text-[11px] font-black uppercase text-indigo-600 tracking-wide">
                  Stats Gardien
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ({gardienMatchs} matchs avec ≥ 2 arrêts)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  label="Arrêts total"
                  value={totalArrets}
                  color="text-indigo-600"
                  sub={`${gardienMatchs} matchs`}
                />
                <MetricCard
                  label="Moy. Arrêts"
                  value={moyArretsVal}
                  color="text-indigo-500"
                  sub="par match valide"
                />
              </div>

              {gardienMatchs >= 2 && gardienEvolutionComparison?.current && (
                <Card className="rounded-3xl border-2 p-5 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mr-1">
                      Évolution — Gardien
                    </p>
                    {(
                      ["5M", "5S", "10M", "10S", "TOTAL", "SAISON"] as const
                    ).map((m) => (
                      <button
                        key={m}
                        onClick={() => setCompareModeGardien(m)}
                        className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border transition-colors ${
                          compareModeGardien === m
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-muted-foreground/30 hover:bg-muted"
                        }`}
                      >
                        {m === "5M"
                          ? "5 vs 5 préc."
                          : m === "5S"
                            ? "5 vs saison"
                            : m === "10M"
                              ? "10 vs 10 préc."
                              : m === "10S"
                                ? "10 vs saison"
                                : m === "TOTAL"
                                  ? "Saison vs total"
                                  : "Saison vs saison"}
                      </button>
                    ))}
                    {compareModeGardien === "SAISON" && (
                      <select
                        className="text-xs font-bold rounded-xl border px-3 py-2 bg-background ml-1"
                        value={refSaisonGardien ?? ""}
                        onChange={(e) =>
                          setRefSaisonGardien(e.target.value || null)
                        }
                      >
                        <option value="">— Saison de référence</option>
                        {availableSaisons
                          .filter((s) => s !== currentSaison)
                          .map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                      <span className="font-black">
                        {gardienEvolutionComparison.labelCurrent}
                      </span>
                      <span className="text-muted-foreground">
                        ({gardienEvolutionComparison.current.n} matchs)
                      </span>
                    </span>
                    {gardienEvolutionComparison.ref && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60 inline-block" />
                        <span className="font-black">
                          {gardienEvolutionComparison.labelRef}
                        </span>
                        <span className="text-muted-foreground">
                          ({gardienEvolutionComparison.ref.n} matchs)
                        </span>
                      </span>
                    )}
                  </div>

                  {gardienEvolutionComparison.ref ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(
                          [
                            {
                              key: "moy_arrets" as const,
                              label: "Moy. Arrêts / match",
                              colCur: "text-indigo-600",
                              colPos: "text-indigo-500",
                              colNeg: "text-orange-500",
                              suffix: "",
                            },
                            {
                              key: "pct_arrets" as const,
                              label: "% Arrêts",
                              colCur: "dynamic",
                              colPos: "text-emerald-500",
                              colNeg: "text-red-500",
                              suffix: "%",
                            },
                          ] as {
                            key: "moy_arrets" | "pct_arrets";
                            label: string;
                            colCur: string;
                            colPos: string;
                            colNeg: string;
                            suffix: string;
                          }[]
                        ).map(
                          ({ key, label, colCur, colPos, colNeg, suffix }) => {
                            const cur =
                              gardienEvolutionComparison.current![key];
                            const ref = gardienEvolutionComparison.ref![key];
                            const delta = +(cur - ref).toFixed(2);
                            const absPct =
                              ref === 0
                                ? null
                                : Math.abs(Math.round((delta / ref) * 100));
                            const isUp = delta > 0.049;
                            const isDown = delta < -0.049;
                            const arrowColor = isUp
                              ? colPos
                              : isDown
                                ? colNeg
                                : "text-muted-foreground";
                            const arrow = isUp ? "↑" : isDown ? "↓" : "→";
                            const phrase = isUp
                              ? `En progression${absPct != null ? ` · +${absPct}%` : ""}`
                              : isDown
                                ? `En baisse${absPct != null ? ` · −${absPct}%` : ""}`
                                : "Stable";
                            const maxVal = Math.max(cur, ref, 0.01);
                            const curColor =
                              colCur === "dynamic"
                                ? arretsColor(cur as number)
                                : undefined;
                            return (
                              <div
                                key={key}
                                className="rounded-2xl border bg-muted/20 p-4 space-y-2.5"
                              >
                                <p className="text-[10px] font-black uppercase text-muted-foreground">
                                  {label}
                                </p>
                                <div className="flex items-baseline gap-2">
                                  <span
                                    className={`text-2xl font-black${colCur !== "dynamic" ? ` ${colCur}` : ""}`}
                                    style={
                                      curColor ? { color: curColor } : undefined
                                    }
                                  >
                                    {cur}
                                    {suffix}
                                  </span>
                                  <span
                                    className={`text-xl font-black ${arrowColor}`}
                                  >
                                    {arrow}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    réf. {ref}
                                    {suffix}
                                  </span>
                                </div>
                                <p
                                  className={`text-[11px] font-bold flex items-center gap-1 ${arrowColor}`}
                                >
                                  <span>{arrow}</span>
                                  <span>{phrase}</span>
                                  {delta !== 0 && (
                                    <span className="ml-auto font-black">
                                      {delta > 0 ? "+" : ""}
                                      {delta}
                                      {suffix}
                                    </span>
                                  )}
                                </p>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-[9px] text-muted-foreground">
                                    <span>
                                      {gardienEvolutionComparison.labelCurrent}
                                    </span>
                                    <span>
                                      {cur}
                                      {suffix}
                                    </span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-indigo-500 transition-all"
                                      style={{
                                        width: `${(cur / maxVal) * 100}%`,
                                      }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[9px] text-muted-foreground">
                                    <span>
                                      {gardienEvolutionComparison.labelRef}
                                    </span>
                                    <span>
                                      {ref}
                                      {suffix}
                                    </span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-muted-foreground/50 transition-all"
                                      style={{
                                        width: `${(ref / maxVal) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                      <div className="rounded-2xl border bg-muted/30 p-3 text-xs">
                        <span className="font-black">
                          {formatNomPrenom(joueur?.nom_prenom)} —{" "}
                        </span>
                        {[
                          { key: "moy_arrets" as const, nom: "arrêts" },
                          { key: "pct_arrets" as const, nom: "% arrêts" },
                        ].map(({ key, nom }, i) => {
                          const cur = gardienEvolutionComparison.current![key];
                          const ref = gardienEvolutionComparison.ref![key];
                          const delta = cur - ref;
                          const absPct =
                            ref === 0
                              ? null
                              : Math.abs(Math.round((delta / ref) * 100));
                          const txt =
                            Math.abs(delta) <= 0.049
                              ? `${nom} stable →`
                              : delta > 0
                                ? `${nom} en hausse ↑${absPct != null ? ` +${absPct}%` : ""}`
                                : `${nom} en baisse ↓${absPct != null ? ` −${absPct}%` : ""}`;
                          return (
                            <span key={key} className="text-muted-foreground">
                              {i > 0 ? " · " : ""}
                              {txt}
                            </span>
                          );
                        })}
                        <span className="text-muted-foreground italic">
                          {" "}
                          ({gardienEvolutionComparison.labelCurrent} vs{" "}
                          {gardienEvolutionComparison.labelRef})
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-2">
                      {compareModeGardien === "SAISON"
                        ? "Sélectionne une saison de référence pour comparer."
                        : "Pas assez de matchs pour cette période de comparaison."}
                    </p>
                  )}
                </Card>
              )}
            </>
          )}
        </>
      ) : (
        <p className="text-center text-muted-foreground italic py-12">
          Aucun joueur trouvé pour cette équipe.
        </p>
      )}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  ONGLET 3 — EFFICACITÉ                                          ║
// ╚══════════════════════════════════════════════════════════════════╝
const TEAM_PALETTE = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

type AggPlayer = {
  id: number;
  nom: string;
  poste: string;
  idEquipe: number | null;
  equipeNom: string;
  equipeColor: string;
  buts: number;
  tirs: number;
  matchs: number;
  moyButs: number;
  moyTirs: number;
  pctTir: number;
  serieType: "joueur" | "equipe" | "club";
};

type AggGardien = {
  id: number;
  nom: string;
  idEquipe: number | null;
  equipeNom: string;
  equipeColor: string;
  arrets: number;
  butsEncaisses: number;
  matchs: number;
  moyArrets: number;
  pctArrets: number;
};

type RankMap = {
  global: Record<number, number>;
  equipe: Record<number, number>;
  poste: Record<number, number>;
  total: number;
  totalEquipe: Record<number, number>;
  totalPoste: Record<string, number>;
};

function computeRanks(players: AggPlayer[], sortKey: keyof AggPlayer): RankMap {
  const joueurs = players.filter((p) => p.serieType === "joueur");
  const sorted = [...joueurs].sort(
    (a, b) => (b[sortKey] as number) - (a[sortKey] as number),
  );
  const global: Record<number, number> = {};
  sorted.forEach((p, i) => {
    global[p.id] = i + 1;
  });

  const equipe: Record<number, number> = {};
  const totalEquipe: Record<number, number> = {};
  const byEquipe: Record<number, AggPlayer[]> = {};
  joueurs.forEach((p) => {
    const k = p.idEquipe ?? -1;
    if (!byEquipe[k]) byEquipe[k] = [];
    byEquipe[k].push(p);
  });
  Object.entries(byEquipe).forEach(([key, group]) => {
    const k = Number(key);
    totalEquipe[k] = group.length;
    group
      .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))
      .forEach((p, i) => {
        equipe[p.id] = i + 1;
      });
  });

  const poste: Record<number, number> = {};
  const totalPoste: Record<string, number> = {};
  const byPoste: Record<string, AggPlayer[]> = {};
  joueurs.forEach((p) => {
    if (!byPoste[p.poste]) byPoste[p.poste] = [];
    byPoste[p.poste].push(p);
  });
  Object.entries(byPoste).forEach(([key, group]) => {
    totalPoste[key] = group.length;
    group
      .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))
      .forEach((p, i) => {
        poste[p.id] = i + 1;
      });
  });

  return {
    global,
    equipe,
    poste,
    total: joueurs.length,
    totalEquipe,
    totalPoste,
  };
}

function RankBadge({
  rank,
  total,
  label,
}: {
  rank: number;
  total: number;
  label: string;
}) {
  const ratio = rank / total;
  const color =
    rank === 1
      ? "bg-amber-400 text-white"
      : ratio <= 0.25
        ? "bg-emerald-500 text-white"
        : ratio <= 0.5
          ? "bg-primary/80 text-white"
          : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${color}`}
      >
        #{rank}
      </span>
      <span className="text-[10px] text-muted-foreground leading-tight">
        {label}
        <br />
        <span className="text-[9px] opacity-70">/{total}</span>
      </span>
    </div>
  );
}

function ScatterTooltipContent({
  payload,
  xKey,
  yKey,
  xLabel,
  yLabel,
  sortKey,
  agg,
}: {
  payload: readonly any[];
  xKey: string;
  yKey: string;
  xLabel: string;
  yLabel: string;
  sortKey: keyof AggPlayer;
  agg: AggPlayer[];
}) {
  if (!payload?.length) return null;
  const d = payload[0].payload as AggPlayer;

  if (d.serieType === "equipe") {
    return (
      <div className="bg-background border-2 rounded-2xl shadow-xl min-w-[180px] overflow-hidden">
        <div className="overflow-y-auto max-h-72">
          <div className="p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b">
              <svg width="12" height="12" viewBox="-1 -1 2 2">
                <polygon points="0,-1 1,0 0,1 -1,0" fill={d.equipeColor} />
              </svg>
              <p className="font-black text-sm">{d.nom}</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-primary">{d.buts}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Buts
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm">{d.tirs}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Tirs
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-amber-500">{d.pctTir}%</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  % Tir
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (d.serieType === "club") {
    return (
      <div className="bg-background border-2 rounded-2xl shadow-xl min-w-[180px] overflow-hidden">
        <div className="overflow-y-auto max-h-72">
          <div className="p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className="text-base leading-none">★</span>
              <p className="font-black text-sm">Club (total)</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-primary">{d.buts}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Buts
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm">{d.tirs}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Tirs
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-amber-500">{d.pctTir}%</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  % Tir
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ranks = computeRanks(agg, sortKey);
  const xVal = d[xKey as keyof AggPlayer];
  const yVal = d[yKey as keyof AggPlayer];
  const yIsPercent = yKey === "pctTir";

  return (
    <div className="bg-background border-2 rounded-2xl shadow-xl min-w-[210px] overflow-hidden">
      <div className="overflow-y-auto max-h-96">
        <div className="p-3 text-xs space-y-2">
          <div className="flex items-start gap-2 pb-2 border-b">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
              style={{ background: d.equipeColor }}
            >
              {d.nom.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm leading-tight truncate">
                {d.nom}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {d.poste} · {d.equipeNom}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm text-primary">{d.buts}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Buts
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm">{d.tirs}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Tirs
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm text-amber-500">{d.pctTir}%</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                % Tir
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm">{d.moyButs}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                B/match
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm">{d.moyTirs}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                T/match
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm">{d.matchs}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Matchs
              </p>
            </div>
          </div>
          {(xKey !== "tirs" || yKey !== "buts") && (
            <div className="flex gap-2 text-[10px] text-muted-foreground border-t pt-2">
              <span className="font-bold">{xLabel}:</span> <span>{xVal}</span>
              <span className="ml-2 font-bold">{yLabel}:</span>{" "}
              <span>{yIsPercent ? `${yVal}%` : yVal}</span>
            </div>
          )}
          <div className="border-t pt-2 space-y-1.5">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">
              Classements ({xLabel} → {yLabel})
            </p>
            <RankBadge
              rank={ranks.global[d.id] ?? 0}
              total={ranks.total}
              label="Classement global"
            />
            <RankBadge
              rank={ranks.equipe[d.id] ?? 0}
              total={ranks.totalEquipe[d.idEquipe ?? -1] ?? 1}
              label="Dans son équipe"
            />
            {d.poste !== "—" && (
              <RankBadge
                rank={ranks.poste[d.id] ?? 0}
                total={ranks.totalPoste[d.poste] ?? 1}
                label={`Poste ${d.poste}`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scatter Section (top-level component for stable React identity) ──────────
function ScatterSection({
  title,
  xKey,
  yKey,
  xLabel,
  yLabel,
  sortKey,
  top5,
  top5Label,
  xUnit = "",
  yUnit = "",
  showTeams = false,
  agg,
  aggTeams,
  aggClub,
  visibleEquipes,
  equipeColorMap,
}: {
  title: string;
  xKey: keyof AggPlayer;
  yKey: keyof AggPlayer;
  xLabel: string;
  yLabel: string;
  sortKey: keyof AggPlayer;
  top5: AggPlayer[];
  top5Label: string;
  xUnit?: string;
  yUnit?: string;
  showTeams?: boolean;
  agg: AggPlayer[];
  aggTeams: AggPlayer[];
  aggClub: AggPlayer;
  visibleEquipes: Array<{ id: number; nom: string }>;
  equipeColorMap: Record<number, string>;
}) {
  const [search, setSearch] = useState("");

  const filteredAgg = useMemo(
    () =>
      search.trim()
        ? agg.filter((p) => p.nom.toLowerCase().includes(search.toLowerCase()))
        : agg,
    [agg, search],
  );
  const ranks = computeRanks(agg, sortKey);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <ChartCard title={title}>
          {/* Recherche joueur */}
          <div className="mb-3 relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un joueur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <ResponsiveContainer
            width="100%"
            height={320}
            style={{ overflow: "visible" }}
          >
            <ScatterChart margin={{ top: 16, right: 32, bottom: 32, left: 32 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis
                dataKey={xKey as string}
                type="number"
                name={xLabel}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => (xUnit ? `${v}${xUnit}` : v)}
                domain={["auto", "auto"]}
                label={{
                  value: xLabel,
                  position: "insideBottom",
                  offset: -16,
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <YAxis
                dataKey={yKey as string}
                type="number"
                name={yLabel}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => (yUnit ? `${v}${yUnit}` : v)}
                domain={["auto", "auto"]}
                label={{
                  value: yLabel,
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <ZAxis range={[50, 180]} />
              <Tooltip
                isAnimationActive={false}
                cursor={{ strokeDasharray: "3 3" }}
                wrapperStyle={{ pointerEvents: "none", zIndex: 9999 }}
                content={({ payload }) => (
                  <ScatterTooltipContent
                    payload={payload ?? []}
                    xKey={xKey as string}
                    yKey={yKey as string}
                    xLabel={xLabel}
                    yLabel={yLabel}
                    sortKey={sortKey}
                    agg={agg}
                  />
                )}
              />
              <Scatter
                name="Joueurs"
                data={filteredAgg}
                shape={(props: any) => {
                  const { cx, cy, payload } = props as {
                    cx: number;
                    cy: number;
                    payload: AggPlayer;
                  };
                  const rank = ranks.global[payload.id] ?? 99;
                  const isTop3 = rank <= 3;
                  return (
                    <g>
                      {/* large transparent circle for reliable hover detection */}
                      <circle cx={cx} cy={cy} r={14} fill="transparent" />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isTop3 ? 7 : 5}
                        fill={payload.equipeColor}
                        opacity={isTop3 ? 1 : 0.75}
                        stroke={isTop3 ? "white" : "none"}
                        strokeWidth={1.5}
                      />
                      {isTop3 && (
                        <text
                          x={cx}
                          y={cy - 10}
                          textAnchor="middle"
                          fontSize={9}
                          fill={payload.equipeColor}
                          fontWeight="bold"
                        >
                          #{rank}
                        </text>
                      )}
                    </g>
                  );
                }}
              />
              {showTeams && (
                <Scatter
                  name="Équipes"
                  data={aggTeams}
                  shape={(props: any) => {
                    const { cx, cy, payload } = props as {
                      cx: number;
                      cy: number;
                      payload: AggPlayer;
                    };
                    const s = 9;
                    return (
                      <g>
                        <polygon
                          points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                          fill={payload.equipeColor}
                          stroke="white"
                          strokeWidth={1.5}
                          opacity={0.9}
                        />
                        <text
                          x={cx}
                          y={cy - s - 4}
                          textAnchor="middle"
                          fontSize={8}
                          fill={payload.equipeColor}
                          fontWeight="bold"
                        >
                          {payload.nom.split(" ").pop()}
                        </text>
                      </g>
                    );
                  }}
                />
              )}
              {showTeams && (
                <Scatter
                  name="Club"
                  data={[aggClub]}
                  shape={(props: any) => {
                    const { cx, cy } = props as { cx: number; cy: number };
                    const r1 = 10,
                      r2 = 5,
                      n = 5;
                    const pts = Array.from({ length: n * 2 }, (_, k) => {
                      const angle = (Math.PI / n) * k - Math.PI / 2;
                      const r = k % 2 === 0 ? r1 : r2;
                      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                    }).join(" ");
                    return (
                      <g>
                        <polygon
                          points={pts}
                          fill="#1e293b"
                          stroke="white"
                          strokeWidth={1.5}
                        />
                        <text
                          x={cx}
                          y={cy - r1 - 4}
                          textAnchor="middle"
                          fontSize={8}
                          fill="#1e293b"
                          fontWeight="bold"
                        >
                          Club
                        </text>
                      </g>
                    );
                  }}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 px-1 justify-center">
            {visibleEquipes.map((eq) => (
              <div
                key={eq.id}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ background: equipeColorMap[eq.id] }}
                />
                {eq.nom}
              </div>
            ))}
            {showTeams && (
              <>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <svg width="10" height="10" viewBox="-1 -1 2 2">
                    <polygon points="0,-1 1,0 0,1 -1,0" fill="#64748b" />
                  </svg>
                  Équipes
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="text-[11px] leading-none">★</span>
                  Club
                </div>
              </>
            )}
          </div>
        </ChartCard>
      </div>

      <Card className="rounded-3xl border-2 overflow-hidden">
        <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3 pt-4 px-5">
          <CardTitle className="font-sport italic text-sm uppercase text-muted-foreground">
            Top 5 — {top5Label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {top5.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0"
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-600/80 text-white" : "bg-muted text-muted-foreground"}`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs truncate">{p.nom}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: p.equipeColor }}
                  />
                  <p className="text-[10px] text-muted-foreground truncate">
                    {p.poste} · {p.equipeNom}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-sport italic font-black text-base text-primary">
                  {sortKey === "pctTir" ? `${p[sortKey]}%` : p[sortKey]}
                </span>
                <p className="text-[9px] text-muted-foreground">
                  {p.matchs} matchs
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Efficacite({ data, filters }: { data: StatsData; filters: Filters }) {


  const equipeColorMap = useMemo(() => {
    const m: Record<number, string> = {};
    data.equipes.forEach((eq, i) => {
      m[eq.id] = TEAM_PALETTE[i % TEAM_PALETTE.length];
    });
    return m;
  }, [data.equipes]);

  // Lookup rapide pour les matchs
  const matchMap = useMemo(
    () => Object.fromEntries(data.matchs.map((m) => [m.id, m])),
    [data.matchs],
  );

  const joueurMap = useMemo(
    () => Object.fromEntries(data.joueurs.map((j) => [j.id, j])),
    [data.joueurs],
  );

  // Agrégat exclusions vs matchs joués par joueur
  const exclusionsVsMatchs = useMemo(() => {
    const equipeMap = Object.fromEntries(data.equipes.map((e) => [e.id, e.nom]));
    const perJoueur: Record<
      number,
      {
        exclusions: number;
        matchs: number;
        nom: string;
        idEquipe: number | null;
        equipeColor: string;
        equipeNom: string;
        poste: string;
      }
    > = {};
    data.statsJoueurs.forEach((s) => {
      if (!s.id_joueur || !s.id_match) return;
      const j = joueurMap[s.id_joueur];
      if (!j?.id_equipe) return;
      if (!equipeOk(j.id_equipe, filters.equipeIds)) return;
      if (!applyMatchFilter(matchMap[s.id_match], filters, [j.id_equipe], data.competitions)) return;
      if (!perJoueur[s.id_joueur]) {
        perJoueur[s.id_joueur] = {
          exclusions: 0,
          matchs: 0,
          nom: formatNomPrenom(j.nom_prenom),
          idEquipe: j.id_equipe,
          equipeColor: equipeColorMap[j.id_equipe] ?? TEAM_PALETTE[0],
          equipeNom: equipeMap[j.id_equipe] ?? "—",
          poste: j.poste_principal ?? "—",
        };
      }
      perJoueur[s.id_joueur].exclusions += s.exclusions_2min ?? 0;
      perJoueur[s.id_joueur].matchs += 1;
    });
    return Object.entries(perJoueur)
      .map(([id, d]) => ({ id: Number(id), ...d }))
      .filter((d) => d.matchs > 0);
  }, [data, filters, equipeColorMap, matchMap, joueurMap]);

  // Top 5 exclusions
  const top5Exclusions = useMemo(() => {
    return [...exclusionsVsMatchs]
      .sort((a, b) => b.exclusions - a.exclusions)
      .slice(0, 5);
  }, [exclusionsVsMatchs]);

  const [gardienSearch, setGardienSearch] = useState("");


  // Agrégats par nom de joueur — regroupe les joueurs ayant joué dans plusieurs équipes
  const agg = useMemo<AggPlayer[]>(() => {
    const equipeMap = Object.fromEntries(
      data.equipes.map((e) => [e.id, e.nom]),
    );

    const nameGroups: Record<string, typeof data.joueurs> = {};
    data.joueurs.forEach((j) => {
      if (!nameGroups[j.nom_prenom]) nameGroups[j.nom_prenom] = [];
      nameGroups[j.nom_prenom].push(j);
    });

    const grouped = Object.entries(nameGroups).filter(
      ([, joueurs]) =>
        joueurs.some((j) => equipeOk(j.id_equipe, filters.equipeIds)) &&
        (filters.postes.length === 0 ||
          joueurs.some((j) =>
            filters.postes.includes(j.poste_principal ?? ""),
          )),
    );

    const result = grouped.map(([nom, joueurs]) => {
      const ids = new Set(joueurs.map((j) => j.id));
      const joueurByIdMap = Object.fromEntries(joueurs.map((j) => [j.id, j]));

      // Équipe principale + stats en une seule passe filtrée
      // → l'équipe principale reflète les filtres actifs (saison, compétition…)
      const matchsParEquipe: Record<number, number> = {};
      let buts = 0,
        tirs = 0,
        matchs = 0;
      data.statsJoueurs.forEach((s) => {
        if (!s.id_joueur || !ids.has(s.id_joueur)) return;
        if (!s.id_match) return;
        if (!isStatValide(s)) return;
        const match = matchMap[s.id_match];
        if (!match) return;
        const j = joueurByIdMap[s.id_joueur];
        if (!j?.id_equipe) return;
        if (!applyMatchFilter(match, filters, [j.id_equipe], data.competitions))
          return;
        matchsParEquipe[j.id_equipe] = (matchsParEquipe[j.id_equipe] ?? 0) + 1;
        buts += s.buts ?? 0;
        tirs += s.tirs ?? 0;
        matchs += 1;
      });

      const equipeEntries = Object.entries(matchsParEquipe).sort(
        (a, b) => b[1] - a[1],
      );
      const idEquipe = equipeEntries[0] ? Number(equipeEntries[0][0]) : null;
      const poste =
        joueurs.find((j) => j.id_equipe === idEquipe)?.poste_principal ??
        joueurs[0]?.poste_principal ??
        "—";

      return {
        id: joueurs[0].id,
        nom,
        poste,
        idEquipe,
        equipeNom: idEquipe ? (equipeMap[idEquipe] ?? "—") : "—",
        equipeColor: idEquipe
          ? (equipeColorMap[idEquipe] ?? TEAM_PALETTE[0])
          : TEAM_PALETTE[0],
        buts,
        tirs,
        matchs,
        moyButs: matchs ? +(buts / matchs).toFixed(2) : 0,
        moyTirs: matchs ? +(tirs / matchs).toFixed(2) : 0,
        pctTir: pct(buts, tirs),
        serieType: "joueur" as const,
      };
    });

    return result.filter((p) => p.matchs > 0 && p.buts >= 20);
  }, [data, filters, equipeColorMap, matchMap]);

  // Points de référence par équipe (forme diamant) — stats filtrées
  const aggTeams = useMemo<AggPlayer[]>(() => {
    const teams = data.equipes.filter((e) => equipeOk(e.id, filters.equipeIds));
    return teams.map((eq) => {
      const playerIds = new Set(
        data.joueurs.filter((j) => j.id_equipe === eq.id).map((j) => j.id),
      );
      let buts = 0,
        tirs = 0,
        matchs = 0;
      data.statsJoueurs.forEach((s) => {
        if (!s.id_joueur || !playerIds.has(s.id_joueur)) return;
        if (!s.id_match) return;
        if (!isStatValide(s)) return;
        const match = matchMap[s.id_match];
        if (!match) return;
        if (!applyMatchFilter(match, filters, [eq.id], data.competitions))
          return;
        buts += s.buts ?? 0;
        tirs += s.tirs ?? 0;
        matchs += 1;
      });
      return {
        id: -eq.id,
        nom: eq.nom,
        poste: "équipe",
        idEquipe: eq.id,
        equipeNom: eq.nom,
        equipeColor: equipeColorMap[eq.id] ?? TEAM_PALETTE[0],
        buts,
        tirs,
        matchs,
        moyButs: matchs ? +(buts / matchs).toFixed(2) : 0,
        moyTirs: matchs ? +(tirs / matchs).toFixed(2) : 0,
        pctTir: pct(buts, tirs),
        serieType: "equipe" as const,
      };
    });
  }, [data, filters, equipeColorMap, matchMap]);

  // Point de référence club (forme étoile) — somme de tous les joueurs qualifiés
  const aggClub = useMemo<AggPlayer>(() => {
    let buts = 0,
      tirs = 0,
      matchs = 0;
    agg.forEach((p) => {
      buts += p.buts;
      tirs += p.tirs;
      matchs += p.matchs;
    });
    return {
      id: -9999,
      nom: "Club",
      poste: "club",
      idEquipe: null,
      equipeNom: "Club",
      equipeColor: "#1e293b",
      buts,
      tirs,
      matchs,
      moyButs: matchs ? +(buts / matchs).toFixed(2) : 0,
      moyTirs: matchs ? +(tirs / matchs).toFixed(2) : 0,
      pctTir: pct(buts, tirs),
      serieType: "club" as const,
    };
  }, [agg]);

  // Agrégats gardiens — uniquement matchs avec ≥ 2 arrêts pour chaque gardien
  const aggGardiens = useMemo<AggGardien[]>(() => {
    const equipeMap = Object.fromEntries(
      data.equipes.map((e) => [e.id, e.nom]),
    );
    return data.joueurs
      .filter((j) => equipeOk(j.id_equipe, filters.equipeIds))
      .map((j) => {
        const statsG = data.statsJoueurs.filter((s) => {
          if (s.id_joueur !== j.id || !s.id_match) return false;
          if ((s.arrets ?? 0) < 2) return false;
          const match = matchMap[s.id_match];
          if (!match) return false;
          return (
            j.id_equipe != null &&
            applyMatchFilter(match, filters, [j.id_equipe], data.competitions)
          );
        });
        if (statsG.length === 0) return null;
        const totalArrets = statsG.reduce((a, s) => a + (s.arrets ?? 0), 0);
        const matchIds = new Set(statsG.map((s) => s.id_match!));
        const butsEncaisses = [...matchIds].reduce((acc, mid) => {
          const match = matchMap[mid];
          if (!match?.score_final) return acc;
          const [a, b] = match.score_final.split("-").map(Number);
          return acc + (match.equipe_recevant_id === j.id_equipe ? b : a);
        }, 0);
        const matchs = matchIds.size;
        return {
          id: j.id,
          nom: formatNomPrenom(j.nom_prenom),
          idEquipe: j.id_equipe,
          equipeNom: j.id_equipe ? (equipeMap[j.id_equipe] ?? "—") : "—",
          equipeColor: j.id_equipe
            ? (equipeColorMap[j.id_equipe] ?? TEAM_PALETTE[0])
            : TEAM_PALETTE[0],
          arrets: totalArrets,
          butsEncaisses,
          matchs,
          moyArrets: matchs ? +(totalArrets / matchs).toFixed(2) : 0,
          pctArrets: pct(totalArrets, totalArrets + butsEncaisses),
        } satisfies AggGardien;
      })
      .filter(Boolean) as AggGardien[];
  }, [data, filters, equipeColorMap, matchMap]);

  const filteredGardiens = useMemo(
    () =>
      gardienSearch.trim()
        ? aggGardiens.filter((g) =>
            g.nom.toLowerCase().includes(gardienSearch.toLowerCase()),
          )
        : aggGardiens,
    [aggGardiens, gardienSearch],
  );

  // Gardiens qualifiés : minimum 5 matchs (pour classements et scatter arrêts)
  const aggGardiensQual = useMemo(
    () => aggGardiens.filter((g) => g.matchs >= 5),
    [aggGardiens],
  );

  const top5Buts = [...agg].sort((a, b) => b.buts - a.buts).slice(0, 5);
  const top5MoyButs = [...agg]
    .sort((a, b) => b.moyButs - a.moyButs)
    .slice(0, 5);
  const top5Pct = [...agg].sort((a, b) => b.pctTir - a.pctTir).slice(0, 5);


  // Record buts en un seul match — tous joueurs filtrés
  const maxButsData = useMemo(() => {
    const equipeMap = Object.fromEntries(
      data.equipes.map((e) => [e.id, e.nom]),
    );
    const perJoueur: Record<
      number,
      { maxButs: number; matchs: number; nom: string; idEquipe: number | null }
    > = {};
    data.statsJoueurs.forEach((s) => {
      if (!s.id_joueur || !s.id_match) return;
      if (!isStatValide(s)) return;
      const match = matchMap[s.id_match];
      if (!match) return;
      const j = joueurMap[s.id_joueur];
      if (!j?.id_equipe) return;
      if (!equipeOk(j.id_equipe, filters.equipeIds)) return;
      if (!applyMatchFilter(match, filters, [j.id_equipe], data.competitions))
        return;
      const buts = s.buts ?? 0;
      if (!perJoueur[s.id_joueur]) {
        perJoueur[s.id_joueur] = {
          maxButs: buts,
          matchs: 1,
          nom: formatNomPrenom(j.nom_prenom),
          idEquipe: j.id_equipe,
        };
      } else {
        perJoueur[s.id_joueur].maxButs = Math.max(
          perJoueur[s.id_joueur].maxButs,
          buts,
        );
        perJoueur[s.id_joueur].matchs += 1;
      }
    });
    return Object.entries(perJoueur)
      .map(([id, d]) => ({
        id: Number(id),
        nom: d.nom,
        maxButs: d.maxButs,
        matchs: d.matchs,
        equipeColor: d.idEquipe
          ? (equipeColorMap[d.idEquipe] ?? TEAM_PALETTE[0])
          : TEAM_PALETTE[0],
        equipeNom: d.idEquipe ? (equipeMap[d.idEquipe] ?? "—") : "—",
      }))
      .filter((d) => d.maxButs > 0)
      .sort((a, b) => b.maxButs - a.maxButs)
      .slice(0, 15);
  }, [data, filters, equipeColorMap, matchMap, joueurMap]);

  // Record arrêts en un seul match — tous joueurs ayant au moins 1 arrêt
  const maxArretsData = useMemo(() => {
    const equipeMap = Object.fromEntries(
      data.equipes.map((e) => [e.id, e.nom]),
    );
    const perJoueur: Record<
      number,
      {
        maxArrets: number;
        matchs: number;
        nom: string;
        idEquipe: number | null;
      }
    > = {};
    data.statsJoueurs.forEach((s) => {
      const arrets = s.arrets ?? 0;
      if (!s.id_joueur || !s.id_match || arrets === 0) return;
      const match = matchMap[s.id_match];
      if (!match) return;
      const j = joueurMap[s.id_joueur];
      if (!j?.id_equipe) return;
      if (!equipeOk(j.id_equipe, filters.equipeIds)) return;
      if (!applyMatchFilter(match, filters, [j.id_equipe], data.competitions))
        return;
      if (!perJoueur[s.id_joueur]) {
        perJoueur[s.id_joueur] = {
          maxArrets: arrets,
          matchs: 1,
          nom: formatNomPrenom(j.nom_prenom),
          idEquipe: j.id_equipe,
        };
      } else {
        perJoueur[s.id_joueur].maxArrets = Math.max(
          perJoueur[s.id_joueur].maxArrets,
          arrets,
        );
        perJoueur[s.id_joueur].matchs += 1;
      }
    });
    return Object.entries(perJoueur)
      .map(([id, d]) => ({
        id: Number(id),
        nom: d.nom,
        maxArrets: d.maxArrets,
        matchs: d.matchs,
        equipeColor: d.idEquipe
          ? (equipeColorMap[d.idEquipe] ?? TEAM_PALETTE[0])
          : TEAM_PALETTE[0],
        equipeNom: d.idEquipe ? (equipeMap[d.idEquipe] ?? "—") : "—",
      }))
      .sort((a, b) => b.maxArrets - a.maxArrets)
      .slice(0, 15);
  }, [data, filters, equipeColorMap, matchMap, joueurMap]);

  const visibleEquipes = data.equipes.filter((e) =>
    equipeOk(e.id, filters.equipeIds),
  );

  const GardienTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as AggGardien;
    const sortedByPct = [...aggGardiens].sort(
      (a, b) => b.pctArrets - a.pctArrets,
    );
    const rank = sortedByPct.findIndex((g) => g.id === d.id) + 1;
    return (
      <div
        className="bg-background border-2 rounded-2xl shadow-xl min-w-[210px] overflow-hidden"
        style={{ zIndex: 9999 }}
      >
        <div className="overflow-y-auto max-h-96">
          <div className="p-3 text-xs space-y-2">
            <div className="flex items-start gap-2 pb-2 border-b">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
                style={{ background: d.equipeColor }}
              >
                {d.nom.charAt(0)}
              </div>
              <div>
                <p className="font-black text-sm">{d.nom}</p>
                <p className="text-[10px] text-muted-foreground">
                  {d.equipeNom}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-indigo-500">{d.arrets}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Arrêts
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-red-400">
                  {d.butsEncaisses}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Buts enc.
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-amber-500">
                  {d.moyArrets}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Moy/match
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm">{d.matchs}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Matchs
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center col-span-2">
                <p
                  className="font-black text-sm"
                  style={{ color: arretsColor(d.pctArrets) }}
                >
                  {d.pctArrets}%
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  % Arrêts
                </p>
              </div>
            </div>
            <div className="border-t pt-2">
              <RankBadge
                rank={rank}
                total={aggGardiens.length}
                label="Classement % arrêts"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const GardienArretTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as AggGardien;
    const sortedByArrets = [...aggGardiensQual].sort(
      (a, b) => b.arrets - a.arrets,
    );
    const rank = sortedByArrets.findIndex((g) => g.id === d.id) + 1;
    return (
      <div
        className="bg-background border-2 rounded-2xl shadow-xl min-w-[210px] overflow-hidden"
        style={{ zIndex: 9999 }}
      >
        <div className="p-3 text-xs space-y-2">
          <div className="flex items-start gap-2 pb-2 border-b">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
              style={{ background: d.equipeColor }}
            >
              {d.nom.charAt(0)}
            </div>
            <div>
              <p className="font-black text-sm">{d.nom}</p>
              <p className="text-[10px] text-muted-foreground">{d.equipeNom}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm text-indigo-500">{d.arrets}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Total Arrêts
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm text-amber-500">{d.moyArrets}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Moy/match
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm text-red-400">
                {d.butsEncaisses}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Buts enc.
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm">{d.matchs}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Matchs
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center col-span-2">
              <p
                className="font-black text-sm"
                style={{ color: arretsColor(d.pctArrets) }}
              >
                {d.pctArrets}%
              </p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                % Arrêts
              </p>
            </div>
          </div>
          {rank > 0 && (
            <div className="border-t pt-2">
              <RankBadge
                rank={rank}
                total={aggGardiensQual.length}
                label="Classement total arrêts (≥ 5 matchs)"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* ── Exclusions vs Matchs joués ─────────────────────────────── */}
      {exclusionsVsMatchs.length > 0 && (
        <div className="relative z-40 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <ChartCard title="Exclusions (2') vs Matchs joués (TOP 5)">
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 16, right: 32, bottom: 32, left: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="matchs"
                    type="number"
                    name="Matchs joués"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Matchs joués",
                      position: "insideBottom",
                      offset: -16,
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <YAxis
                    dataKey="exclusions"
                    type="number"
                    name="Exclusions (2')"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Exclusions (2')",
                      angle: -90,
                      position: "insideLeft",
                      offset: 12,
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip
                    isAnimationActive={false}
                    cursor={{ strokeDasharray: "3 3" }}
                    wrapperStyle={{ pointerEvents: "none", zIndex: 9999 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-background border-2 rounded-2xl shadow-xl p-3 text-xs min-w-40 space-y-1.5">
                          <div className="flex items-center gap-2 pb-1 border-b">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ background: d.equipeColor }}
                            />
                            <p className="font-black text-sm">{d.nom}</p>
                          </div>
                          <p className="text-muted-foreground text-[10px]">
                            {d.equipeNom}
                          </p>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground font-bold uppercase text-[10px]">Exclusions</span>
                            <span className="font-sport italic font-black text-red-500">{d.exclusions}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground font-bold uppercase text-[10px]">Matchs</span>
                            <span className="font-bold">{d.matchs}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    name="Joueurs"
                    data={exclusionsVsMatchs}
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={7} fill={payload.equipeColor} opacity={1} stroke="white" strokeWidth={1.5} />
                        </g>
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 px-1 justify-center">
                {visibleEquipes.map((eq) => (
                  <div
                    key={eq.id}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ background: equipeColorMap[eq.id] }}
                    />
                    {eq.nom}
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
          <Card className="rounded-3xl border-2 overflow-hidden">
            <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3 pt-4 px-5">
              <CardTitle className="font-sport italic text-sm uppercase text-muted-foreground">
                Top 5 — Exclusions (2')
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {top5Exclusions.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-600/80 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">{p.nom}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: p.equipeColor }}
                      />
                      <p className="text-[10px] text-muted-foreground truncate">
                        {p.poste} · {p.equipeNom}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-sport italic font-black text-base text-red-500">
                      {p.exclusions}
                    </span>
                    <p className="text-[9px] text-muted-foreground">
                      {p.matchs} matchs
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
      {/* ── Meilleures Performances ─────────────────────────────────────────── */}
      {(maxButsData.length > 0 || maxArretsData.length > 0) && (
        <div className="space-y-4">
          <div>
            <h3 className="font-sport italic text-xl uppercase tracking-tight">
              Meilleures Performances
            </h3>
            <p className="text-muted-foreground text-xs mt-0.5">
              Record personnel sur un seul match · Top 15
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── Max Buts ── */}
            {maxButsData.length > 0 && (
              <ChartCard title="Record Buts — Meilleur Match">
                <ResponsiveContainer
                  width="100%"
                  height={maxButsData.length * 34 + 24}
                >
                  <BarChart
                    data={maxButsData}
                    layout="vertical"
                    margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      opacity={0.2}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nom"
                      tick={{ fontSize: 10, fontWeight: 600 }}
                      width={118}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) =>
                        v.length > 17 ? v.slice(0, 15) + "\u2026" : v
                      }
                    />
                    <Tooltip
                      isAnimationActive={false}
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                      wrapperStyle={{ pointerEvents: "none", zIndex: 9999 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background border-2 rounded-2xl shadow-xl p-3 text-xs min-w-40 space-y-1.5">
                            <div className="flex items-center gap-2 pb-1 border-b">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ background: d.equipeColor }}
                              />
                              <p className="font-black text-sm">{d.nom}</p>
                            </div>
                            <p className="text-muted-foreground text-[10px]">
                              {d.equipeNom}
                            </p>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground font-bold uppercase text-[10px]">
                                Record
                              </span>
                              <span className="font-sport italic font-black text-primary">
                                {d.maxButs} but{d.maxButs > 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground font-bold uppercase text-[10px]">
                                Matchs
                              </span>
                              <span className="font-bold">{d.matchs}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="maxButs"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={22}
                      label={{
                        position: "right",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {maxButsData.map((entry, i) => (
                        <Cell key={i} fill={entry.equipeColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* ── Max Arrêts ── */}
            {maxArretsData.length > 0 && (
              <ChartCard title="Record Arrêts — Meilleur Match">
                <ResponsiveContainer
                  width="100%"
                  height={maxArretsData.length * 34 + 24}
                >
                  <BarChart
                    data={maxArretsData}
                    layout="vertical"
                    margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      opacity={0.2}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nom"
                      tick={{ fontSize: 10, fontWeight: 600 }}
                      width={118}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) =>
                        v.length > 17 ? v.slice(0, 15) + "\u2026" : v
                      }
                    />
                    <Tooltip
                      isAnimationActive={false}
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                      wrapperStyle={{ pointerEvents: "none", zIndex: 9999 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background border-2 rounded-2xl shadow-xl p-3 text-xs min-w-40 space-y-1.5">
                            <div className="flex items-center gap-2 pb-1 border-b">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ background: d.equipeColor }}
                              />
                              <p className="font-black text-sm">{d.nom}</p>
                            </div>
                            <p className="text-muted-foreground text-[10px]">
                              {d.equipeNom}
                            </p>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground font-bold uppercase text-[10px]">
                                Record
                              </span>
                              <span className="font-sport italic font-black text-emerald-500">
                                {d.maxArrets} arrêt{d.maxArrets > 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground font-bold uppercase text-[10px]">
                                Matchs (avec arrêts)
                              </span>
                              <span className="font-bold">{d.matchs}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="maxArrets"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={22}
                      label={{
                        position: "right",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {maxArretsData.map((entry, i) => (
                        <Cell key={i} fill={entry.equipeColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </div>
      )}

      {/* ─── Gardiens — 3 Nuages de points vs Matchs joués ─────────── */}
      {aggGardiens.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-sport italic text-xl uppercase tracking-tight">
              Gardiens — Performance vs Matchs joués
            </h3>
            <p className="text-muted-foreground text-xs mt-0.5">
              Nuages de points · taille du point proportionnelle au nombre de matchs
            </p>
          </div>
          {/* Recherche gardien partagée */}
          <div className="relative max-w-xs">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un gardien…"
              value={gardienSearch}
              onChange={(e) => setGardienSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ── Total Arrêts vs Matchs ── */}
            <ChartCard title="Total Arrêts vs Matchs joués">
              <ResponsiveContainer width="100%" height={280} style={{ overflow: "visible" }}>
                <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="matchs" type="number" name="Matchs joués" tick={{ fontSize: 10 }}
                    label={{ value: "Matchs joués", position: "insideBottom", offset: -16, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis dataKey="arrets" type="number" name="Total Arrêts" tick={{ fontSize: 10 }}
                    label={{ value: "Total Arrêts", angle: -90, position: "insideLeft", offset: 14, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ZAxis dataKey="matchs" range={[40, 160]} />
                  <Tooltip isAnimationActive={false} cursor={{ strokeDasharray: "3 3" }}
                    wrapperStyle={{ pointerEvents: "none", zIndex: 9999 }}
                    content={<GardienTooltip />}
                  />
                  <Scatter name="Gardiens" data={filteredGardiens}
                    shape={(props: any) => {
                      const { cx, cy, payload } = props as { cx: number; cy: number; payload: AggGardien };
                      const sorted = [...aggGardiens].sort((a, b) => b.arrets - a.arrets);
                      const rank = sorted.findIndex((g) => g.id === payload.id) + 1;
                      const isTop3 = rank <= 3;
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={14} fill="transparent" />
                          <circle cx={cx} cy={cy} r={isTop3 ? 7 : 5} fill={payload.equipeColor} opacity={isTop3 ? 1 : 0.75} stroke={isTop3 ? "white" : "none"} strokeWidth={1.5} />
                          {isTop3 && <text x={cx} y={cy - 10} textAnchor="middle" fontSize={9} fill={payload.equipeColor} fontWeight="bold">#{rank}</text>}
                        </g>
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* ── Moy. Arrêts vs Matchs ── */}
            <ChartCard title="Moy. Arrêts / Match vs Matchs joués">
              <ResponsiveContainer width="100%" height={280} style={{ overflow: "visible" }}>
                <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="matchs" type="number" name="Matchs joués" tick={{ fontSize: 10 }}
                    label={{ value: "Matchs joués", position: "insideBottom", offset: -16, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis dataKey="moyArrets" type="number" name="Moy. Arrêts" tick={{ fontSize: 10 }}
                    label={{ value: "Moy. Arrêts", angle: -90, position: "insideLeft", offset: 14, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ZAxis dataKey="matchs" range={[40, 160]} />
                  <Tooltip isAnimationActive={false} cursor={{ strokeDasharray: "3 3" }}
                    wrapperStyle={{ pointerEvents: "none", zIndex: 9999 }}
                    content={<GardienTooltip />}
                  />
                  <Scatter name="Gardiens" data={filteredGardiens}
                    shape={(props: any) => {
                      const { cx, cy, payload } = props as { cx: number; cy: number; payload: AggGardien };
                      const sorted = [...aggGardiens].sort((a, b) => b.moyArrets - a.moyArrets);
                      const rank = sorted.findIndex((g) => g.id === payload.id) + 1;
                      const isTop3 = rank <= 3;
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={14} fill="transparent" />
                          <circle cx={cx} cy={cy} r={isTop3 ? 7 : 5} fill={payload.equipeColor} opacity={isTop3 ? 1 : 0.75} stroke={isTop3 ? "white" : "none"} strokeWidth={1.5} />
                          {isTop3 && <text x={cx} y={cy - 10} textAnchor="middle" fontSize={9} fill={payload.equipeColor} fontWeight="bold">#{rank}</text>}
                        </g>
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* ── % Arrêts vs Matchs ── */}
            <ChartCard title="% Arrêts vs Matchs joués">
              <ResponsiveContainer width="100%" height={280} style={{ overflow: "visible" }}>
                <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="matchs" type="number" name="Matchs joués" tick={{ fontSize: 10 }}
                    label={{ value: "Matchs joués", position: "insideBottom", offset: -16, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis dataKey="pctArrets" type="number" name="% Arrêts" domain={[0, 100]} tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                    label={{ value: "% Arrêts", angle: -90, position: "insideLeft", offset: 14, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ZAxis dataKey="matchs" range={[40, 160]} />
                  <Tooltip isAnimationActive={false} cursor={{ strokeDasharray: "3 3" }}
                    wrapperStyle={{ pointerEvents: "none", zIndex: 9999 }}
                    content={<GardienTooltip />}
                  />
                  <Scatter name="Gardiens" data={filteredGardiens}
                    shape={(props: any) => {
                      const { cx, cy, payload } = props as { cx: number; cy: number; payload: AggGardien };
                      const sorted = [...aggGardiens].sort((a, b) => b.pctArrets - a.pctArrets);
                      const rank = sorted.findIndex((g) => g.id === payload.id) + 1;
                      const isTop3 = rank <= 3;
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={14} fill="transparent" />
                          <circle cx={cx} cy={cy} r={isTop3 ? 7 : 5} fill={payload.equipeColor} opacity={isTop3 ? 1 : 0.75} stroke={isTop3 ? "white" : "none"} strokeWidth={1.5} />
                          {isTop3 && <text x={cx} y={cy - 10} textAnchor="middle" fontSize={9} fill={payload.equipeColor} fontWeight="bold">#{rank}</text>}
                        </g>
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Légende équipes */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 justify-center">
            {visibleEquipes.map((eq) => (
              <div key={eq.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: equipeColorMap[eq.id] }} />
                {eq.nom}
              </div>
            ))}
          </div>

          {/* ── Top 5 gardiens ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top 5 — Total Arrêts */}
            <Card className="rounded-3xl border-2 overflow-hidden">
              <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3 pt-4 px-5">
                <CardTitle className="font-sport italic text-sm uppercase text-muted-foreground">
                  Top 5 — Total Arrêts
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">≥ 5 matchs</p>
              </CardHeader>
              <CardContent className="p-0">
                {[...aggGardiensQual]
                  .sort((a, b) => b.arrets - a.arrets)
                  .slice(0, 5)
                  .map((g, i) => (
                    <div key={g.id} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-600/80 text-white" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate">{g.nom}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.equipeColor }} />
                          <p className="text-[10px] text-muted-foreground truncate">{g.equipeNom}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-sport italic font-black text-base text-indigo-500">{g.arrets}</span>
                        <p className="text-[9px] text-muted-foreground">{g.matchs}m · {g.moyArrets}/m</p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Top 5 — Moy. Arrêts */}
            <Card className="rounded-3xl border-2 overflow-hidden">
              <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3 pt-4 px-5">
                <CardTitle className="font-sport italic text-sm uppercase text-muted-foreground">
                  Top 5 — Moy. Arrêts / Match
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">≥ 5 matchs</p>
              </CardHeader>
              <CardContent className="p-0">
                {[...aggGardiensQual]
                  .sort((a, b) => b.moyArrets - a.moyArrets)
                  .slice(0, 5)
                  .map((g, i) => (
                    <div key={g.id} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-600/80 text-white" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate">{g.nom}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.equipeColor }} />
                          <p className="text-[10px] text-muted-foreground truncate">{g.equipeNom}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-sport italic font-black text-base text-indigo-500">{g.moyArrets}</span>
                        <p className="text-[9px] text-muted-foreground">{g.matchs}m · {g.arrets} total</p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Top 5 — % Arrêts */}
            <Card className="rounded-3xl border-2 overflow-hidden">
              <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3 pt-4 px-5">
                <CardTitle className="font-sport italic text-sm uppercase text-muted-foreground">
                  Top 5 — % Arrêts
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">≥ 5 matchs</p>
              </CardHeader>
              <CardContent className="p-0">
                {[...aggGardiensQual]
                  .sort((a, b) => b.pctArrets - a.pctArrets)
                  .slice(0, 5)
                  .map((g, i) => (
                    <div key={g.id} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-600/80 text-white" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate">{g.nom}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.equipeColor }} />
                          <p className="text-[10px] text-muted-foreground truncate">{g.equipeNom}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-sport italic font-black text-base" style={{ color: arretsColor(g.pctArrets) }}>{g.pctArrets}%</span>
                        <p className="text-[9px] text-muted-foreground">{g.matchs}m · {g.arrets} arrêts</p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="relative z-30">
        <ScatterSection
          title="Total Buts vs Total Tirs"
          xKey="tirs"
          yKey="buts"
          xLabel="Tirs"
          yLabel="Buts"
          sortKey="buts"
          top5={top5Buts}
          top5Label="Total buts"
          agg={agg}
          aggTeams={aggTeams}
          aggClub={aggClub}
          visibleEquipes={visibleEquipes}
          equipeColorMap={equipeColorMap}
        />
      </div>
      <div className="relative z-20">
        <ScatterSection
          title="Moy. Buts / Match vs Matchs joués"
          xKey="matchs"
          yKey="moyButs"
          xLabel="Matchs joués"
          yLabel="Moy. Buts"
          sortKey="moyButs"
          top5={top5MoyButs}
          top5Label="Moy buts/match"
          agg={agg}
          aggTeams={aggTeams}
          aggClub={aggClub}
          visibleEquipes={visibleEquipes}
          equipeColorMap={equipeColorMap}
        />
      </div>
      <div className="relative z-10">
        <ScatterSection
          title="% au Tir — Efficacité"
          xKey="buts"
          yKey="pctTir"
          xLabel="Total Buts"
          yLabel="% au Tir"
          sortKey="pctTir"
          top5={top5Pct}
          top5Label="% au tir"
          yUnit="%"
          agg={agg}
          aggTeams={aggTeams}
          aggClub={aggClub}
          visibleEquipes={visibleEquipes}
          equipeColorMap={equipeColorMap}
        />
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  ONGLET 4 — STATS OFFENSIVES                                    ║
// ╚══════════════════════════════════════════════════════════════════╝
function StatsOffensives({
  data,
  filters,
}: {
  data: StatsData;
  filters: Filters;
}) {
  const equipeIds = filters.equipeIds;

  // ── Par équipe : moyenne buts & tirs (FIX: tirs filtrés sur les matchs filtrés) ──
  const parEquipe = useMemo(
    () =>
      data.equipes
        .filter((eq) => equipeIds.includes(eq.id))
        .map((eq) => {
          const ms = data.matchs.filter((m) =>
            applyMatchFilter(m, filters, [eq.id], data.competitions),
          );
          const msIds = new Set(ms.map((m) => m.id));
          const butsMarques = ms.reduce((acc, m) => {
            const [a, b] = m.score_final!.split("-").map(Number);
            return acc + (m.equipe_recevant_id === eq.id ? a : b);
          }, 0);
          const butsEncaisses = ms.reduce((acc, m) => {
            const [a, b] = m.score_final!.split("-").map(Number);
            return acc + (m.equipe_recevant_id === eq.id ? b : a);
          }, 0);
          const tirsTotaux = data.statsJoueurs
            .filter((s) => {
              const j = data.joueurs.find((jj) => jj.id === s.id_joueur);
              return (
                j?.id_equipe === eq.id &&
                s.id_match !== null &&
                msIds.has(s.id_match!)
              );
            })
            .reduce((acc, s) => acc + (s.tirs ?? 0), 0);
          const n = ms.length;
          return {
            equipe: eq.nom,
            moyButs: n ? +(butsMarques / n).toFixed(1) : 0,
            moyTirs: n ? +(tirsTotaux / n).toFixed(1) : 0,
            moyEncaisses: n ? +(butsEncaisses / n).toFixed(1) : 0,
            pctTir: pct(butsMarques, tirsTotaux),
            totalButs: butsMarques,
            totalTirs: tirsTotaux,
            matchs: n,
          };
        }),
    [data, equipeIds, filters],
  );

  // ── Buts par match (timeline, coloré V/N/D) ──
  const butsParMatch = useMemo(() => {
    const rows: {
      label: string;
      buts: number;
      encaisses: number;
      result: string;
      equipe: string;
      date: string;
    }[] = [];
    data.equipes
      .filter((eq) => equipeIds.includes(eq.id))
      .forEach((eq) => {
        data.matchs
          .filter((m) =>
            applyMatchFilter(m, filters, [eq.id], data.competitions),
          )
          .sort((a, b) =>
            (a.date_match ?? "").localeCompare(b.date_match ?? ""),
          )
          .forEach((m, i) => {
            const [a, b] = m.score_final!.split("-").map(Number);
            const scored = m.equipe_recevant_id === eq.id ? a : b;
            const conceded = m.equipe_recevant_id === eq.id ? b : a;
            rows.push({
              label: m.date_match ? fmtDate(m.date_match) : `M${i + 1}`,
              buts: scored,
              encaisses: conceded,
              result: getResult(m, [eq.id]) ?? "draw",
              equipe: eq.nom,
              date: m.date_match ?? "",
            });
          });
      });
    return rows;
  }, [data, equipeIds, filters]);

  // ── Domicile vs Extérieur ──
  const domExt = useMemo(() => {
    const acc = { dom: { buts: 0, n: 0 }, ext: { buts: 0, n: 0 } };
    data.equipes
      .filter((eq) => equipeIds.includes(eq.id))
      .forEach((eq) => {
        data.matchs
          .filter((m) =>
            applyMatchFilter(m, filters, [eq.id], data.competitions),
          )
          .forEach((m) => {
            const [a, b] = m.score_final!.split("-").map(Number);
            const scored = m.equipe_recevant_id === eq.id ? a : b;
            if (m.equipe_recevant_id === eq.id) {
              acc.dom.buts += scored;
              acc.dom.n++;
            } else {
              acc.ext.buts += scored;
              acc.ext.n++;
            }
          });
      });
    return [
      {
        context: "Domicile",
        moyButs: acc.dom.n ? +(acc.dom.buts / acc.dom.n).toFixed(1) : 0,
        matchs: acc.dom.n,
      },
      {
        context: "Extérieur",
        moyButs: acc.ext.n ? +(acc.ext.buts / acc.ext.n).toFixed(1) : 0,
        matchs: acc.ext.n,
      },
    ];
  }, [data, equipeIds, filters]);

  const equipeLabels = data.equipes
    .filter((eq) => equipeIds.includes(eq.id))
    .map((eq) => eq.nom);

  // ── Moy. buts cumulée + % tir cumulé par équipe ──
  const cumulChartData = useMemo(() => {
    const map: Record<string, any> = {};
    data.equipes
      .filter((eq) => equipeIds.includes(eq.id))
      .forEach((eq) => {
        let cumButs = 0,
          cumTirs = 0,
          n = 0;
        const msIds = new Set(
          data.matchs
            .filter((m) =>
              applyMatchFilter(m, filters, [eq.id], data.competitions),
            )
            .map((m) => m.id),
        );
        const tirsByMatch: Record<number, number> = {};
        data.statsJoueurs.forEach((s) => {
          if (!s.id_match || !msIds.has(s.id_match)) return;
          const j = data.joueurs.find((jj) => jj.id === s.id_joueur);
          if (!j || j.id_equipe !== eq.id) return;
          tirsByMatch[s.id_match] =
            (tirsByMatch[s.id_match] ?? 0) + (s.tirs ?? 0);
        });
        data.matchs
          .filter((m) => msIds.has(m.id))
          .sort((a, b) =>
            (a.date_match ?? "").localeCompare(b.date_match ?? ""),
          )
          .forEach((m) => {
            const [a, b] = m.score_final!.split("-").map(Number);
            cumButs += m.equipe_recevant_id === eq.id ? a : b;
            cumTirs += tirsByMatch[m.id] ?? 0;
            n++;
            const isoKey = m.date_match ?? `M${n}`;
            const label = m.date_match ? fmtDate(m.date_match) : `M${n}`;
            if (!map[isoKey]) map[isoKey] = { label };
            map[isoKey][`${eq.nom}_moy`] = parseFloat((cumButs / n).toFixed(2));
            map[isoKey][`${eq.nom}_pct`] = pct(cumButs, cumTirs);
          });
      });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [data, equipeIds, filters]);
  const OffTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div
        className="bg-background border-2 rounded-2xl shadow-xl min-w-[200px] overflow-hidden"
        style={{ zIndex: 9999 }}
      >
        <div className="overflow-y-auto max-h-72">
          <div className="p-3 text-xs space-y-2">
            <p className="font-black text-sm pb-2 border-b">{d.equipe}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-emerald-500">
                  {d.moyButs}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Moy. Buts
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-indigo-500">
                  {d.moyTirs}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Moy. Tirs
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-red-400">
                  {d.moyEncaisses}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  Moy. Enc.
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
                <p className="font-black text-sm text-amber-500">{d.pctTir}%</p>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">
                  % Tir
                </p>
              </div>
            </div>
            <div className="border-t pt-2 text-[10px] text-muted-foreground flex justify-between">
              <span>
                {d.totalButs} buts / {d.totalTirs} tirs
              </span>
              <span>{d.matchs} matchs</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MatchTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const rcol =
      d.result === "win"
        ? COL_WIN
        : d.result === "loss"
          ? "#ef4444"
          : "#f59e0b";
    const rlabel =
      d.result === "win" ? "Victoire" : d.result === "loss" ? "Défaite" : "Nul";
    return (
      <div
        className="bg-background border-2 rounded-2xl shadow-xl min-w-[180px] overflow-hidden"
        style={{ zIndex: 9999 }}
      >
        <div className="p-3 text-xs space-y-2">
          <div className="flex justify-between items-center pb-2 border-b">
            <p className="font-black">
              {d.label} · {d.equipe}
            </p>
            <span
              className="font-black text-[10px] px-2 py-0.5 rounded-full ml-2"
              style={{ background: rcol + "22", color: rcol }}
            >
              {rlabel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm text-emerald-500">{d.buts}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Buts
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm text-red-400">{d.encaisses}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Encaissés
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TopButeurTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div
        className="bg-background border-2 rounded-2xl shadow-xl min-w-[190px] overflow-hidden"
        style={{ zIndex: 9999 }}
      >
        <div className="p-3 text-xs space-y-2">
          <p className="font-black text-sm pb-2 border-b truncate">{d.nom}</p>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm text-primary">{d.buts}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Buts
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm">{d.moyButs}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                B/match
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm text-amber-500">{d.pctTir}%</p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                % Tir
              </p>
            </div>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Efficacité</span>
              <span>
                {d.buts}/{d.tirs}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${d.pctTir}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Couleur de barre selon résultat
  const getMatchBarColor = (entry: any) =>
    entry.result === "win"
      ? COL_WIN
      : entry.result === "loss"
        ? "#ef4444"
        : "#f59e0b";

  return (
    <div className="space-y-6">
      {/* Metrics globaux */}
      {parEquipe.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {parEquipe.map((eq) => (
              <MetricCard
                key={eq.equipe}
                label={`Moy. Buts — ${eq.equipe}`}
                value={eq.moyButs}
                color="text-emerald-600"
                sub={`${eq.matchs} matchs`}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {parEquipe.map((eq, i) => (
              <Card
                key={eq.equipe}
                className="rounded-3xl border-2 overflow-hidden"
              >
                <div className="bg-muted/50 border-b px-5 py-3">
                  <p className="text-[11px] font-black uppercase tracking-wide text-amber-600">
                    % au Tir — {eq.equipe}
                  </p>
                </div>
                <div className="flex flex-col items-center px-4 py-2">
                  <GaugeArc
                    value={eq.pctTir}
                    label={`${eq.totalButs} buts / ${eq.totalTirs} tirs`}
                    gradId={`gauge-tir-off-${i}`}
                  />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Moyenne Buts & Tirs par match + % au tir */}
      <ChartCard title="Moyenne Buts & Tirs par match — par équipe">
        <ResponsiveContainer
          width="100%"
          height={280}
          style={{ overflow: "visible" }}
        >
          <ComposedChart data={parEquipe}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="equipe" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              isAnimationActive={false}
              content={<OffTooltip />}
              wrapperStyle={{ pointerEvents: "auto", zIndex: 9999 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="left"
              dataKey="moyButs"
              name="Moy. Buts"
              fill={COL_WIN}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="moyTirs"
              name="Moy. Tirs"
              fill="#6366f1"
              opacity={0.6}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pctTir"
              name="% au Tir"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 5, fill: "#f59e0b" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Moy. buts cumulée + % tir cumulé */}
      {cumulChartData.length > 1 && (
        <ChartCard title="Moyenne de buts cumulée & % au tir cumulé — par équipe">
          <ResponsiveContainer
            width="100%"
            height={280}
            style={{ overflow: "visible" }}
          >
            <ComposedChart data={cumulChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                label={{
                  value: "Moy. buts",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                label={{
                  value: "% Tir",
                  angle: 90,
                  position: "insideRight",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <Tooltip isAnimationActive={false} wrapperStyle={{ pointerEvents: "auto", zIndex: 9999 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {equipeLabels.map((nom, i) => (
                <Line
                  key={nom + "_moy"}
                  yAxisId="left"
                  type="monotone"
                  dataKey={`${nom}_moy`}
                  name={`${nom} — moy. buts`}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
              {equipeLabels.map((nom, i) => (
                <Line
                  key={nom + "_pct"}
                  yAxisId="right"
                  type="monotone"
                  dataKey={`${nom}_pct`}
                  name={`${nom} — % tir`}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="5 3"
                  connectNulls
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Domicile vs Extérieur */}
      {domExt.some((d) => d.matchs > 0) && (
        <ChartCard title="Moy. Buts — Domicile vs Extérieur">
          <ResponsiveContainer
            width="100%"
            height={200}
            style={{ overflow: "visible" }}
          >
            <BarChart data={domExt}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="context" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                isAnimationActive={false}
                wrapperStyle={{ zIndex: 9999 }}
                formatter={(v: any, name?: string) => [
                  `${v} buts/match`,
                  name ?? "",
                ]}
              />
              <Bar dataKey="moyButs" name="Moy. Buts" radius={[6, 6, 0, 0]}>
                <Cell fill="#6366f1" />
                <Cell fill="#f59e0b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  ONGLET 5 — STATS DÉFENSIVES                                    ║
// ╚══════════════════════════════════════════════════════════════════╝
function StatsDefensives({
  data,
  filters,
}: {
  data: StatsData;
  filters: Filters;
}) {
  const equipeIds = filters.equipeIds;
  const [gardienSort, setGardienSort] = useState<
    "totalArrets" | "moyArrets" | "pctArrets"
  >("totalArrets");

  // ── Stats par équipe ──
  const parEquipe = useMemo(() => {
    return data.equipes
      .filter((eq) => equipeIds.includes(eq.id))
      .map((eq) => {
        const ms = data.matchs.filter((m) =>
          applyMatchFilter(m, filters, [eq.id], data.competitions),
        );

        // Arrêts totaux par match — tous joueurs de l'équipe (les arrêts non nuls viennent toujours des gardiens)
        const teamPlayerIds = new Set(
          data.joueurs.filter((j) => j.id_equipe === eq.id).map((j) => j.id),
        );
        const arretsByMatch: Record<number, number> = {};
        data.statsJoueurs.forEach((s) => {
          if (
            !s.id_match ||
            s.id_joueur == null ||
            !teamPlayerIds.has(s.id_joueur)
          )
            return;
          arretsByMatch[s.id_match] =
            (arretsByMatch[s.id_match] ?? 0) + (s.arrets ?? 0);
        });

        // Exclusions 2 min : somme depuis statistiques_joueurs
        const exclByMatch: Record<number, number> = {};
        data.statsJoueurs.forEach((s) => {
          if (
            !s.id_match ||
            s.id_joueur == null ||
            !teamPlayerIds.has(s.id_joueur)
          )
            return;
          exclByMatch[s.id_match] =
            (exclByMatch[s.id_match] ?? 0) + (s.exclusions_2min ?? 0);
        });

        // Matchs valides pour les stats gardien (≥ 2 arrêts enregistrés)
        const msArrets = ms.filter((m) => (arretsByMatch[m.id] ?? 0) >= 2);

        const butsEncaisses = ms.reduce((acc, m) => {
          const [a, b] = m.score_final!.split("-").map(Number);
          return acc + (m.equipe_recevant_id === eq.id ? b : a);
        }, 0);

        // Buts encaissés & arrêts uniquement sur les matchs valides (pour le % arrêts)
        const butsEncaissesSurArrets = msArrets.reduce((acc, m) => {
          const [a, b] = m.score_final!.split("-").map(Number);
          return acc + (m.equipe_recevant_id === eq.id ? b : a);
        }, 0);
        const totalArrets = msArrets.reduce(
          (acc, m) => acc + (arretsByMatch[m.id] ?? 0),
          0,
        );
        const totalExcl = ms.reduce(
          (a: number, m) => a + (exclByMatch[m.id] ?? 0),
          0,
        );
        const pctArrets = pct(
          totalArrets,
          totalArrets + butsEncaissesSurArrets,
        );

        return {
          equipe: eq.nom,
          equipeId: eq.id,
          butsEncaisses,
          moyButsEncaisses: ms.length
            ? +(butsEncaisses / ms.length).toFixed(1)
            : 0,
          totalArrets,
          pctArrets,
          exclusions2min: totalExcl,
          moyExcl: ms.length ? +(totalExcl / ms.length).toFixed(2) : 0,
          matchs: ms.length,
          matchsAvecArrets: msArrets.length,
        };
      });
  }, [data, equipeIds, filters]);

  // ── Stats individuelles gardiens ──
  const statsGardiens = useMemo(() => {
    const result: {
      nom: string;
      equipe: string;
      totalArrets: number;
      totalButsEncaisses: number;
      pctArrets: number;
      matchs: number;
      moyArrets: number;
    }[] = [];

    data.equipes
      .filter((eq) => equipeIds.includes(eq.id))
      .forEach((eq) => {
        const ms = data.matchs.filter((m) =>
          applyMatchFilter(m, filters, [eq.id], data.competitions),
        );
        const msIds = new Set(ms.map((m) => m.id));
        const gardiens = data.joueurs.filter(
          (j) =>
            j.id_equipe === eq.id &&
            j.poste_principal?.toLowerCase().includes("gardien"),
        );

        // Utilise les gardiens tagués, sinon tout joueur ayant des arrêts enregistrés
        const joueursSurValidMatchs =
          gardiens.length > 0
            ? gardiens
            : data.joueurs.filter(
                (j) =>
                  j.id_equipe === eq.id &&
                  data.statsJoueurs.some(
                    (s) =>
                      s.id_joueur === j.id &&
                      msIds.has(s.id_match!) &&
                      (s.arrets ?? 0) > 0,
                  ),
              );

        joueursSurValidMatchs.forEach((gardien) => {
          // Seuls les matchs où CE gardien a ≥ 2 arrêts sont pris en compte
          const statsG = data.statsJoueurs.filter(
            (s) =>
              s.id_joueur === gardien.id &&
              s.id_match != null &&
              msIds.has(s.id_match!) &&
              (s.arrets ?? 0) >= 2,
          );
          if (statsG.length === 0) return;

          const gardienMatchIds = new Set(statsG.map((s) => s.id_match));
          const totalArrets = statsG.reduce(
            (acc, s) => acc + (s.arrets ?? 0),
            0,
          );
          const matchsJoues = gardienMatchIds.size;
          const butsEncaisses = ms
            .filter((m) => gardienMatchIds.has(m.id))
            .reduce((acc, m) => {
              const [a, b] = m.score_final!.split("-").map(Number);
              return acc + (m.equipe_recevant_id === eq.id ? b : a);
            }, 0);

          result.push({
            nom: formatNomPrenom(gardien.nom_prenom),
            equipe: eq.nom,
            totalArrets,
            totalButsEncaisses: butsEncaisses,
            pctArrets: pct(totalArrets, totalArrets + butsEncaisses),
            matchs: matchsJoues,
            moyArrets: matchsJoues
              ? +(totalArrets / matchsJoues).toFixed(1)
              : 0,
          });
        });
      });

    return result;
  }, [data, equipeIds, filters]);

  const sortedGardiens = useMemo(
    () => [...statsGardiens].sort((a, b) => b[gardienSort] - a[gardienSort]),
    [statsGardiens, gardienSort],
  );

  // ── Timeline % arrêts par match — numéro chronologique par équipe ──
  const arretTimeline = useMemo(() => {
    const equipeData: Record<
      string,
      Array<{ pct: number; arr: number; enc: number }>
    > = {};
    data.equipes
      .filter((eq) => equipeIds.includes(eq.id))
      .forEach((eq) => {
        const teamPlayerIds = new Set(
          data.joueurs.filter((j) => j.id_equipe === eq.id).map((j) => j.id),
        );
        const arretsByMatch: Record<number, number> = {};
        data.statsJoueurs.forEach((s) => {
          if (
            !s.id_match ||
            s.id_joueur == null ||
            !teamPlayerIds.has(s.id_joueur)
          )
            return;
          arretsByMatch[s.id_match] =
            (arretsByMatch[s.id_match] ?? 0) + (s.arrets ?? 0);
        });
        const validMatches = data.matchs
          .filter(
            (m) =>
              applyMatchFilter(m, filters, [eq.id], data.competitions) &&
              (arretsByMatch[m.id] ?? 0) >= 2,
          )
          .sort((a, b) =>
            (a.date_match ?? "").localeCompare(b.date_match ?? ""),
          );
        equipeData[eq.nom] = validMatches.map((m) => {
          const [a, b] = m.score_final!.split("-").map(Number);
          const enc = m.equipe_recevant_id === eq.id ? b : a;
          const arr = arretsByMatch[m.id] ?? 0;
          return { pct: pct(arr, arr + enc), arr, enc };
        });
      });
    const maxLen = Math.max(
      0,
      ...Object.values(equipeData).map((d) => d.length),
    );
    return Array.from({ length: maxLen }, (_, i) => {
      const row: Record<string, any> = { label: `Match ${i + 1}` };
      Object.entries(equipeData).forEach(([nom, matches]) => {
        if (i < matches.length) {
          row[nom] = matches[i].pct;
          row[`${nom}_arr`] = matches[i].arr;
          row[`${nom}_enc`] = matches[i].enc;
        }
      });
      return row;
    });
  }, [data, equipeIds, filters]);

  // ── Timeline exclusions 2 min — moyenne cumulée par match ──
  const excl2minTimeline = useMemo(() => {
    const eqs = data.equipes.filter((eq) => equipeIds.includes(eq.id));
    const ms = data.matchs
      .filter((m) => applyMatchFilter(m, filters, equipeIds, data.competitions))
      .sort((a, b) => (a.date_match ?? "").localeCompare(b.date_match ?? ""));

    // Précalcul exclusions par match et par équipe
    const exclByMatchByEquipe: Record<number, Record<number, number>> = {};
    eqs.forEach((eq) => {
      const teamPlayerIds = new Set(
        data.joueurs.filter((j) => j.id_equipe === eq.id).map((j) => j.id),
      );
      data.statsJoueurs.forEach((s) => {
        if (
          !s.id_match ||
          s.id_joueur == null ||
          !teamPlayerIds.has(s.id_joueur)
        )
          return;
        if (!exclByMatchByEquipe[s.id_match])
          exclByMatchByEquipe[s.id_match] = {};
        exclByMatchByEquipe[s.id_match][eq.id] =
          (exclByMatchByEquipe[s.id_match][eq.id] ?? 0) +
          (s.exclusions_2min ?? 0);
      });
    });

    // Compteurs cumulatifs par équipe
    const cumSum: Record<number, number> = {};
    const cumCount: Record<number, number> = {};
    eqs.forEach((eq) => {
      cumSum[eq.id] = 0;
      cumCount[eq.id] = 0;
    });

    return ms.map((m) => {
      const point: any = { label: fmtDate(m.date_match) };
      eqs.forEach((eq) => {
        if (m.equipe_recevant_id === eq.id || m.equipe_exterieur_id === eq.id) {
          cumSum[eq.id] += exclByMatchByEquipe[m.id]?.[eq.id] ?? 0;
          cumCount[eq.id] += 1;
          point[eq.nom] =
            cumCount[eq.id] > 0
              ? +(cumSum[eq.id] / cumCount[eq.id]).toFixed(2)
              : 0;
        }
      });
      return point;
    });
  }, [data, equipeIds, filters]);

  const equipeLabels = data.equipes
    .filter((eq) => equipeIds.includes(eq.id))
    .map((eq) => eq.nom);

  // ── Tooltips ──
  const DefTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div
        className="bg-background border-2 rounded-2xl shadow-xl min-w-[200px] overflow-hidden"
        style={{ zIndex: 9999 }}
      >
        <div className="p-3 text-xs space-y-2">
          <p className="font-black text-sm pb-2 border-b">{d.equipe}</p>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm text-indigo-500">
                {d.totalArrets}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Arrêts
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center">
              <p className="font-black text-sm text-red-400">
                {d.butsEncaisses}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                Buts enc.
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-2 py-1.5 text-center col-span-2">
              <p
                className="font-black text-sm"
                style={{ color: arretsColor(d.pctArrets) }}
              >
                {d.pctArrets}%
              </p>
              <p className="text-[9px] text-muted-foreground uppercase font-bold">
                % Arrêts
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center border-t pt-2">
            Sur {d.matchsAvecArrets} matchs avec arrêts / {d.matchs} total
          </p>
        </div>
      </div>
    );
  };

  const ArretTimelineTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="bg-background border-2 rounded-2xl shadow-xl min-w-40 overflow-hidden"
        style={{ zIndex: 9999 }}
      >
        <div className="p-3 text-xs space-y-1.5">
          <p className="font-black pb-1 border-b">{label}</p>
          {equipeLabels.map((nom, i) => {
            const entry = payload.find((p: any) => p.dataKey === nom);
            if (!entry) return null;
            const d = entry.payload;
            return (
              <div
                key={nom}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  <span>{nom}</span>
                </div>
                <div className="text-right">
                  <span className="font-black">{entry.value}%</span>
                  <span className="text-muted-foreground ml-1">
                    ({d[`${nom}_arr`]}A / {d[`${nom}_enc`]}E)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      {parEquipe.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {parEquipe.map((eq) => (
            <MetricCard
              key={eq.equipe}
              label={`Moy. Enc. — ${eq.equipe}`}
              value={eq.moyButsEncaisses}
              color="text-red-500"
              sub={`${eq.matchs} matchs`}
            />
          ))}
        </div>
      )}

      {/* Jauges % arrêts par équipe */}
      {parEquipe.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {parEquipe.map((eq, i) => (
            <Card
              key={eq.equipe}
              className="rounded-3xl border-2 overflow-hidden"
            >
              <div className="bg-muted/50 border-b px-5 py-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-indigo-600">
                  % Arrêts — {eq.equipe}
                </p>
              </div>
              <div className="flex flex-col items-center px-4 py-2">
                <GaugeArc
                  value={eq.pctArrets}
                  label={`${eq.totalArrets} arrêts · ${eq.matchsAvecArrets} matchs`}
                  gradId={`gauge-arr-${i}`}
                  colorScheme="arrets"
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Arrêts & % arrêts par équipe */}
      <ChartCard title="Arrêts & % Arrêts par équipe">
        <ResponsiveContainer
          width="100%"
          height={280}
          style={{ overflow: "visible" }}
        >
          <ComposedChart data={parEquipe}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="equipe" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              isAnimationActive={false}
              content={<DefTooltip />}
              wrapperStyle={{ pointerEvents: "auto", zIndex: 9999 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="left"
              dataKey="totalArrets"
              name="Arrêts"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="butsEncaisses"
              name="Buts enc."
              fill={COL_LOSS}
              radius={[4, 4, 0, 0]}
              opacity={0.7}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pctArrets"
              name="% Arrêts"
              stroke={arretsColor(
                parEquipe.reduce((s: number, e) => s + e.pctArrets, 0) /
                  Math.max(1, parEquipe.length),
              )}
              strokeWidth={2.5}
              dot={(p: any) => (
                <circle
                  key={`def-dot-${p.cx}`}
                  cx={p.cx}
                  cy={p.cy}
                  r={5}
                  fill={arretsColor(p.payload.pctArrets)}
                />
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Stats individuelles gardiens */}
      {statsGardiens.length > 0 && (
        <ChartCard title="Statistiques individuelles — Gardiens">
          {/* Boutons de tri */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-[10px] font-black uppercase text-muted-foreground">
              Trier par
            </span>
            {(
              [
                { key: "totalArrets", label: "Total Arrêts" },
                { key: "moyArrets", label: "Moy. Arrêts" },
                { key: "pctArrets", label: "% Arrêts" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setGardienSort(key)}
                className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-colors ${
                  gardienSort === key
                    ? "bg-primary text-white border-primary"
                    : "bg-muted/40 text-muted-foreground border-transparent hover:border-primary/40 hover:text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
            {sortedGardiens.map((g) => {
              const color = arretsColor(g.pctArrets);
              return (
                <div
                  key={g.nom + g.equipe}
                  className="rounded-2xl border bg-muted/30 p-3 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-sm">{g.nom}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {g.equipe}
                      </p>
                    </div>
                    <span className="text-xl font-black" style={{ color }}>
                      {g.pctArrets}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${g.pctArrets}%`, background: color }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                    <div className="bg-background rounded-lg py-1">
                      <p className="font-black text-indigo-500">
                        {g.totalArrets}
                      </p>
                      <p className="text-muted-foreground">Arrêts</p>
                    </div>
                    <div className="bg-background rounded-lg py-1">
                      <p className="font-black text-amber-500">{g.moyArrets}</p>
                      <p className="text-muted-foreground">Moy/match</p>
                    </div>
                    <div className="bg-background rounded-lg py-1">
                      <p className="font-black">{g.matchs}</p>
                      <p className="text-muted-foreground">Matchs</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}

      {/* Timeline % arrêts par match */}
      {arretTimeline.length > 1 && (
        <ChartCard title="Évolution % Arrêts par match (matchs avec ≥ 2 arrêts enregistrés)">
          <ResponsiveContainer
            width="100%"
            height={260}
            style={{ overflow: "visible" }}
          >
            <LineChart data={arretTimeline}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                isAnimationActive={false}
                content={<ArretTimelineTooltip />}
                wrapperStyle={{ pointerEvents: "auto", zIndex: 9999 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {equipeLabels.map((nom, i) => (
                <Line
                  key={nom}
                  type="monotone"
                  dataKey={nom}
                  name={nom}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Exclusions 2 min */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Exclusions 2 min totales par équipe">
          <ResponsiveContainer
            width="100%"
            height={240}
            style={{ overflow: "visible" }}
          >
            <ComposedChart data={parEquipe}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="equipe" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => v.toFixed(1)}
                tick={{ fontSize: 11 }}
              />
              <Tooltip isAnimationActive={false} wrapperStyle={{ zIndex: 9999 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                yAxisId="left"
                dataKey="exclusions2min"
                name="Exclusions 2 min"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="moyExcl"
                name="Moy. / match"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 5, fill: "#f59e0b" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {excl2minTimeline.length > 1 && (
          <ChartCard title="Moyenne cumulée exclusions 2 min — par match">
            <ResponsiveContainer
              width="100%"
              height={240}
              style={{ overflow: "visible" }}
            >
              <LineChart data={excl2minTimeline}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => v.toFixed(1)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  isAnimationActive={false}
                  wrapperStyle={{ zIndex: 9999 }}
                  formatter={(v: any) =>
                    typeof v === "number" ? v.toFixed(2) : "-"
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {equipeLabels.map((nom, i) => (
                  <Line
                    key={nom}
                    type="monotone"
                    dataKey={nom}
                    name={nom}
                    stroke={PALETTE[i % PALETTE.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}

// ─── Helper équipe filter ─────────────────────────────────────────────────────
function equipeOk(idEquipe: number | null, equipeIds: number[]) {
  return idEquipe != null && equipeIds.includes(idEquipe);
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  ONGLET 6 — TOP PROGRESSIONS                                    ║
// ╚══════════════════════════════════════════════════════════════════╝

type PlayerEvol = {
  joueur: StatsData["joueurs"][0];
  equipeColor: string;
  equipeNom: string;
  isGardien: boolean;
  nCurrent: number;
  nRef: number;
  delta_moy_buts: number | null;
  delta_moy_tirs: number | null;
  delta_pct_tir: number | null;
  cur_moy_buts: number;
  cur_moy_tirs: number;
  cur_pct_tir: number;
  ref_moy_buts: number;
  ref_moy_tirs: number;
  ref_pct_tir: number;
  delta_pct_arrets: number | null;
  delta_moy_arrets: number | null;
  cur_pct_arrets: number | null;
  cur_moy_arrets: number | null;
  ref_pct_arrets: number | null;
  ref_moy_arrets: number | null;
};

function TopTooltipRow({
  label,
  cur,
  refVal,
  delta,
  unit = "",
  colorFn,
}: {
  label: string;
  cur: number;
  refVal: number;
  delta: number;
  unit?: string;
  colorFn?: (v: number) => string;
}) {
  const col = colorFn
    ? colorFn(cur)
    : delta > 0
      ? "#10b981"
      : delta < 0
        ? "#ef4444"
        : "#94a3b8";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1 text-[10px]">
        <span className="text-muted-foreground/60">
          {refVal}
          {unit}
        </span>
        <span className="text-muted-foreground/50">→</span>
        <span className="font-bold" style={{ color: col }}>
          {cur}
          {unit}
        </span>
        <span className="font-black" style={{ color: col }}>
          ({delta > 0 ? "+" : ""}
          {delta}
          {unit})
        </span>
      </div>
    </div>
  );
}

function TopRankCard({
  title,
  entries,
  deltaKey,
  unit,
  colorFn,
}: {
  title: string;
  entries: PlayerEvol[];
  deltaKey: keyof PlayerEvol;
  unit: string;
  colorFn?: (v: number) => string;
}) {
  const [hovId, setHovId] = useState<number | null>(null);

  if (!entries.length) {
    return (
      <Card className="rounded-3xl border-2 overflow-hidden opacity-60">
        <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3 pt-4 px-5">
          <CardTitle className="font-sport italic text-sm uppercase text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-center text-xs text-muted-foreground italic">
          Données insuffisantes (min. 3 matchs requis)
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-2 overflow-visible">
      <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3 pt-4 px-5 rounded-t-3xl">
        <CardTitle className="font-sport italic text-sm uppercase text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {entries.map((e, i) => {
          const deltaVal = e[deltaKey] as number;
          const isHov = hovId === e.joueur.id;
          return (
            <div
              key={e.joueur.id}
              className="relative flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-default"
              onMouseEnter={() => setHovId(e.joueur.id)}
              onMouseLeave={() => setHovId(null)}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                  i === 0
                    ? "bg-amber-400 text-white"
                    : i === 1
                      ? "bg-slate-300 text-slate-700"
                      : i === 2
                        ? "bg-amber-600/80 text-white"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs truncate">
                  {formatNomPrenom(e.joueur.nom_prenom)}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: e.equipeColor }}
                  />
                  <p className="text-[10px] text-muted-foreground truncate">
                    {e.joueur.poste_principal ?? "—"} · {e.equipeNom}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className="font-sport italic font-black text-base"
                  style={{
                    color:
                      deltaVal > 0
                        ? "#10b981"
                        : deltaVal < 0
                          ? "#ef4444"
                          : "#94a3b8",
                  }}
                >
                  {deltaVal > 0 ? "+" : ""}
                  {deltaVal}
                  {unit}
                </span>
                <p className="text-[9px] text-muted-foreground">
                  {e.nCurrent} matchs
                </p>
              </div>

              {/* Tooltip — toutes les évolutions */}
              {isHov && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 z-100 mb-2 w-60 bg-popover border rounded-2xl shadow-xl p-3 pointer-events-none">
                  <p className="font-black uppercase text-[10px] text-muted-foreground mb-2 truncate">
                    {formatNomPrenom(e.joueur.nom_prenom)}
                  </p>
                  <div className="space-y-1.5 text-[11px]">
                    {e.delta_moy_buts !== null && (
                      <TopTooltipRow
                        label="Moy. Buts"
                        cur={e.cur_moy_buts}
                        refVal={e.ref_moy_buts}
                        delta={e.delta_moy_buts}
                      />
                    )}
                    {e.delta_moy_tirs !== null && (
                      <TopTooltipRow
                        label="Moy. Tirs"
                        cur={e.cur_moy_tirs}
                        refVal={e.ref_moy_tirs}
                        delta={e.delta_moy_tirs}
                      />
                    )}
                    {e.delta_pct_tir !== null && (
                      <TopTooltipRow
                        label="% Efficacité"
                        cur={e.cur_pct_tir}
                        refVal={e.ref_pct_tir}
                        delta={e.delta_pct_tir}
                        unit="%"
                      />
                    )}
                    {e.delta_pct_arrets !== null && (
                      <TopTooltipRow
                        label="% Arrêts"
                        cur={e.cur_pct_arrets ?? 0}
                        refVal={e.ref_pct_arrets ?? 0}
                        delta={e.delta_pct_arrets}
                        unit="%"
                        colorFn={arretsColor}
                      />
                    )}
                    {e.delta_moy_arrets !== null && (
                      <TopTooltipRow
                        label="Moy. Arrêts"
                        cur={e.cur_moy_arrets ?? 0}
                        refVal={e.ref_moy_arrets ?? 0}
                        delta={e.delta_moy_arrets}
                      />
                    )}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2 pt-1.5 border-t">
                    {e.nCurrent} matchs actuels · {e.nRef} matchs réf.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function StatsTop({ data, filters }: { data: StatsData; filters: Filters }) {
  const [compareMode, setCompareMode] = useState<
    "5M" | "5S" | "10M" | "10S" | "SAISON" | "TOTAL"
  >("5M");
  const [refSaison, setRefSaison] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<string>("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const availableSaisons = useMemo(() => {
    const s = new Set<string>();
    data.matchs.forEach((m) => {
      const sais = getMatchSaison(m, data.competitions);
      if (sais) s.add(sais);
    });
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [data]);

  const equipeColorMap = useMemo(() => {
    const m: Record<number, string> = {};
    data.equipes.forEach((eq, i) => {
      m[eq.id] = TEAM_PALETTE[i % TEAM_PALETTE.length];
    });
    return m;
  }, [data.equipes]);

  const allEvolutions = useMemo((): PlayerEvol[] => {
    return data.joueurs
      .filter((j) => equipeOk(j.id_equipe, filters.equipeIds))
      .flatMap((joueur): PlayerEvol[] => {
        const joueurId = joueur.id;
        const joueurEquipeId = joueur.id_equipe;
        if (!joueurEquipeId) return [];

        const equipeColor = equipeColorMap[joueurEquipeId] ?? TEAM_PALETTE[0];
        const equipeNom =
          data.equipes.find((e) => e.id === joueurEquipeId)?.nom ?? "";

        const statsJoueur = data.statsJoueurs
          .filter((s) => {
            if (s.id_joueur !== joueurId || !s.id_match) return false;
            if (!isStatValide(s)) return false;
            const match = data.matchs.find((m) => m.id === s.id_match);
            return match
              ? applyMatchFilter(
                  match,
                  filters,
                  [joueurEquipeId],
                  data.competitions,
                )
              : false;
          })
          .map((s) => {
            const match = data.matchs.find((m) => m.id === s.id_match)!;
            return { ...s, date_match: match.date_match ?? null, match };
          })
          .sort((a, b) =>
            (a.date_match ?? "").localeCompare(b.date_match ?? ""),
          );

        if (!statsJoueur.length) return [];

        const last = statsJoueur[statsJoueur.length - 1];
        const currentSaison =
          filters.saisonFilter || getMatchSaison(last.match, data.competitions);

        const allForSaison = (saison: string | null): typeof statsJoueur => {
          if (!saison) return [];
          return data.statsJoueurs
            .filter((s) => s.id_joueur === joueurId && s.id_match != null && isStatValide(s))
            .map((s) => {
              const match = data.matchs.find((m) => m.id === s.id_match);
              if (!match) return null;
              if (
                match.equipe_recevant_id !== joueurEquipeId &&
                match.equipe_exterieur_id !== joueurEquipeId
              )
                return null;
              if (getMatchSaison(match, data.competitions) !== saison)
                return null;
              return { ...s, date_match: match.date_match ?? null, match };
            })
            .filter(Boolean) as typeof statsJoueur;
        };

        const allTotal = (): typeof statsJoueur =>
          data.statsJoueurs
            .filter((s) => s.id_joueur === joueurId && s.id_match != null && isStatValide(s))
            .map((s) => {
              const match = data.matchs.find((m) => m.id === s.id_match);
              if (!match) return null;
              if (
                match.equipe_recevant_id !== joueurEquipeId &&
                match.equipe_exterieur_id !== joueurEquipeId
              )
                return null;
              return { ...s, date_match: match.date_match ?? null, match };
            })
            .filter(Boolean) as typeof statsJoueur;

        let cur: typeof statsJoueur = [];
        let ref: typeof statsJoueur = [];
        if (compareMode === "5M") {
          cur = statsJoueur.slice(-5);
          ref = statsJoueur.slice(-10, -5);
        } else if (compareMode === "5S") {
          cur = statsJoueur.slice(-5);
          ref = allForSaison(currentSaison);
        } else if (compareMode === "10M") {
          cur = statsJoueur.slice(-10);
          ref = statsJoueur.slice(-20, -10);
        } else if (compareMode === "10S") {
          cur = statsJoueur.slice(-10);
          ref = allForSaison(currentSaison);
        } else if (compareMode === "TOTAL") {
          cur = allForSaison(currentSaison);
          ref = allTotal();
        } else {
          // SAISON
          cur = statsJoueur;
          if (refSaison) {
            ref = data.statsJoueurs
              .filter((s) => {
                if (s.id_joueur !== joueurId || !s.id_match) return false;
                if (!isStatValide(s)) return false;
                const match = data.matchs.find((m) => m.id === s.id_match);
                if (!match) return false;
                if (
                  match.equipe_recevant_id !== joueurEquipeId &&
                  match.equipe_exterieur_id !== joueurEquipeId
                )
                  return false;
                return getMatchSaison(match, data.competitions) === refSaison;
              })
              .map((s) => {
                const match = data.matchs.find((m) => m.id === s.id_match)!;
                return { ...s, date_match: match.date_match ?? null, match };
              });
          }
        }

        const MIN_CURRENT = 3;
        if (cur.length < MIN_CURRENT || !ref.length) return [];

        const perfOf = (arr: typeof statsJoueur) => {
          if (!arr.length) return null;
          const tb = arr.reduce((a, s) => a + (s.buts ?? 0), 0);
          const tt = arr.reduce((a, s) => a + (s.tirs ?? 0), 0);
          const n = arr.length;
          return {
            moy_buts: +(tb / n).toFixed(2),
            moy_tirs: +(tt / n).toFixed(2),
            pct_tir: pct(tb, tt),
          };
        };
        const cp = perfOf(cur);
        const rp = perfOf(ref);

        const pp = (joueur.poste_principal ?? "").toLowerCase();
        const ps = (joueur.postes_secondaires ?? []).map((p: string) =>
          p.toLowerCase(),
        );
        const isGardien =
          pp.includes("gardien") ||
          ps.some((p: string) => p.includes("gardien"));

        let cgp: { moy_arrets: number; pct_arrets: number } | null = null;
        let rgp: { moy_arrets: number; pct_arrets: number } | null = null;
        if (isGardien) {
          const garPerfOf = (arr: typeof statsJoueur) => {
            const g = arr.filter((s) => (s.arrets ?? 0) >= 2);
            if (!g.length) return null;
            const ta = g.reduce((a, s) => a + (s.arrets ?? 0), 0);
            const te = g.reduce((acc, s) => {
              if (!s.match.score_final) return acc;
              const [a, b] = s.match.score_final.split("-").map(Number);
              return (
                acc + (s.match.equipe_recevant_id === joueurEquipeId ? b : a)
              );
            }, 0);
            const n = g.length;
            return {
              moy_arrets: +(ta / n).toFixed(2),
              pct_arrets: pct(ta, ta + te),
            };
          };
          cgp = garPerfOf(cur);
          rgp = garPerfOf(ref);
        }

        return [
          {
            joueur,
            equipeColor,
            equipeNom,
            isGardien,
            nCurrent: cur.length,
            nRef: ref.length,
            delta_moy_buts:
              cp && rp ? +(cp.moy_buts - rp.moy_buts).toFixed(2) : null,
            delta_moy_tirs:
              cp && rp ? +(cp.moy_tirs - rp.moy_tirs).toFixed(2) : null,
            delta_pct_tir: cp && rp ? cp.pct_tir - rp.pct_tir : null,
            cur_moy_buts: cp?.moy_buts ?? 0,
            cur_moy_tirs: cp?.moy_tirs ?? 0,
            cur_pct_tir: cp?.pct_tir ?? 0,
            ref_moy_buts: rp?.moy_buts ?? 0,
            ref_moy_tirs: rp?.moy_tirs ?? 0,
            ref_pct_tir: rp?.pct_tir ?? 0,
            delta_pct_arrets:
              cgp && rgp ? cgp.pct_arrets - rgp.pct_arrets : null,
            delta_moy_arrets:
              cgp && rgp ? +(cgp.moy_arrets - rgp.moy_arrets).toFixed(2) : null,
            cur_pct_arrets: cgp?.pct_arrets ?? null,
            cur_moy_arrets: cgp?.moy_arrets ?? null,
            ref_pct_arrets: rgp?.pct_arrets ?? null,
            ref_moy_arrets: rgp?.moy_arrets ?? null,
          },
        ];
      });
  }, [data, filters, compareMode, refSaison, equipeColorMap]);

  const rankings = useMemo(() => {
    const topN = (deltaKey: keyof PlayerEvol, n = 5, gardienOnly?: boolean) =>
      [...allEvolutions]
        .filter((e) => {
          const v = e[deltaKey];
          if (v === null || v === undefined) return false;
          if (gardienOnly === true && !e.isGardien) return false;
          if (gardienOnly === false && e.isGardien) return false;
          return true;
        })
        .sort((a, b) => (b[deltaKey] as number) - (a[deltaKey] as number))
        .slice(0, n);
    return {
      pct_arrets: topN("delta_pct_arrets", 5, true),
      moy_arrets: topN("delta_moy_arrets", 5, true),
      moy_buts: topN("delta_moy_buts", 5, false),
      moy_tirs: topN("delta_moy_tirs", 5, false),
      pct_tir: topN("delta_pct_tir", 5, false),
    };
  }, [allEvolutions]);

  const handleSort = (key: string) => {
    if (sortCol === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(key);
      setSortDir("desc");
    }
  };

  type TCol = {
    key: string;
    label: string;
    sub?: string;
    isEvol?: boolean;
    getValue: (e: PlayerEvol) => number | string | null;
    fmt?: (v: number) => string;
  };
  const TCOLS: TCol[] = [
    {
      key: "nom",
      label: "Joueur",
      getValue: (e) => formatNomPrenom(e.joueur.nom_prenom),
    },
    { key: "equipeNom", label: "Équipe", getValue: (e) => e.equipeNom },
    {
      key: "poste",
      label: "Poste",
      getValue: (e) => e.joueur.poste_principal ?? "—",
    },
    { key: "nCurrent", label: "Matchs", getValue: (e) => e.nCurrent },
    {
      key: "cur_moy_buts",
      label: "Moy. Buts",
      getValue: (e) => e.cur_moy_buts,
    },
    {
      key: "evol_moy_buts",
      label: "Évol.",
      sub: "Δ Buts",
      isEvol: true,
      getValue: (e) => evolPct(e.cur_moy_buts, e.ref_moy_buts),
      fmt: (v) => `${v > 0 ? "+" : ""}${v}`,
    },
    {
      key: "cur_moy_tirs",
      label: "Moy. Tirs",
      getValue: (e) => e.cur_moy_tirs,
    },
    {
      key: "evol_moy_tirs",
      label: "Évol.",
      sub: "Δ Tirs",
      isEvol: true,
      getValue: (e) => evolPct(e.cur_moy_tirs, e.ref_moy_tirs),
      fmt: (v) => `${v > 0 ? "+" : ""}${v}`,
    },
    {
      key: "cur_pct_tir",
      label: "% Tir",
      getValue: (e) => e.cur_pct_tir,
      fmt: (v) => `${v}%`,
    },
    {
      key: "evol_pct_tir",
      label: "Évol.",
      sub: "Δ % Tir",
      isEvol: true,
      getValue: (e) => evolPct(e.cur_pct_tir, e.ref_pct_tir),
      fmt: (v) => `${v > 0 ? "+" : ""}${v}%`,
    },
    {
      key: "cur_pct_arrets",
      label: "% Arrêts",
      getValue: (e) => e.cur_pct_arrets,
      fmt: (v) => `${v}%`,
    },
    {
      key: "evol_pct_arrets",
      label: "Évol.",
      sub: "Δ % Arr.",
      isEvol: true,
      getValue: (e) => evolPct(e.cur_pct_arrets, e.ref_pct_arrets),
      fmt: (v) => `${v > 0 ? "+" : ""}${v}%`,
    },
    {
      key: "cur_moy_arrets",
      label: "Moy. Arrêts",
      getValue: (e) => e.cur_moy_arrets,
    },
    {
      key: "evol_moy_arrets",
      label: "Évol.",
      sub: "Δ Moy. Arr.",
      isEvol: true,
      getValue: (e) => evolPct(e.cur_moy_arrets, e.ref_moy_arrets),
      fmt: (v) => `${v > 0 ? "+" : ""}${v}`,
    },
  ];

  const sortedRows = useMemo(() => {
    const getVal = (e: PlayerEvol): number | string | null => {
      switch (sortCol) {
        case "nom":
          return e.joueur.nom_prenom;
        case "equipeNom":
          return e.equipeNom;
        case "poste":
          return e.joueur.poste_principal ?? "—";
        case "nCurrent":
          return e.nCurrent;
        case "cur_moy_buts":
          return e.cur_moy_buts;
        case "evol_moy_buts":
          return evolPct(e.cur_moy_buts, e.ref_moy_buts);
        case "cur_moy_tirs":
          return e.cur_moy_tirs;
        case "evol_moy_tirs":
          return evolPct(e.cur_moy_tirs, e.ref_moy_tirs);
        case "cur_pct_tir":
          return e.cur_pct_tir;
        case "evol_pct_tir":
          return evolPct(e.cur_pct_tir, e.ref_pct_tir);
        case "cur_pct_arrets":
          return e.cur_pct_arrets;
        case "evol_pct_arrets":
          return evolPct(e.cur_pct_arrets, e.ref_pct_arrets);
        case "cur_moy_arrets":
          return e.cur_moy_arrets;
        case "evol_moy_arrets":
          return evolPct(e.cur_moy_arrets, e.ref_moy_arrets);
        default:
          return 0;
      }
    };
    return [...allEvolutions].sort((a, b) => {
      const va = getVal(a),
        vb = getVal(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "string" && typeof vb === "string")
        return sortDir === "asc"
          ? va.localeCompare(vb, "fr")
          : vb.localeCompare(va, "fr");
      return sortDir === "asc"
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });
  }, [allEvolutions, sortCol, sortDir]);

  const modeLabels: Record<string, string> = {
    "5M": "5 vs 5 préc.",
    "5S": "5 vs saison",
    "10M": "10 vs 10 préc.",
    "10S": "10 vs saison",
    TOTAL: "Saison vs total",
    SAISON: "Saison vs saison",
  };

  const hasGardienData =
    rankings.pct_arrets.length > 0 || rankings.moy_arrets.length > 0;
  const hasFieldData =
    rankings.moy_buts.length > 0 ||
    rankings.moy_tirs.length > 0 ||
    rankings.pct_tir.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Sélecteur de période ── */}
      <Card className="rounded-3xl border-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-black uppercase text-muted-foreground mr-1">
            Période d'analyse
          </p>
          {(["5M", "5S", "10M", "10S", "TOTAL", "SAISON"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setCompareMode(m)}
              className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border transition-colors ${
                compareMode === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-muted-foreground/30 hover:bg-muted"
              }`}
            >
              {modeLabels[m]}
            </button>
          ))}
          {compareMode === "SAISON" && (
            <select
              className="text-xs font-bold rounded-xl border px-3 py-2 bg-background ml-1"
              value={refSaison ?? ""}
              onChange={(e) => setRefSaison(e.target.value || null)}
            >
              <option value="">— Saison de référence</option>
              {availableSaisons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Min. 3 matchs dans la période actuelle requis · Survolez un joueur
          pour afficher toutes ses évolutions
        </p>
      </Card>

      {/* ── Gardiens ── */}
      {hasGardienData && (
        <div className="space-y-3">
          <h3 className="font-sport italic uppercase text-sm font-black text-muted-foreground px-1">
            Gardiens — Meilleures progressions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TopRankCard
              title="% Arrêts — Top progression"
              entries={rankings.pct_arrets}
              deltaKey="delta_pct_arrets"
              unit="%"
              colorFn={arretsColor}
            />
            <TopRankCard
              title="Moy. Arrêts — Top progression"
              entries={rankings.moy_arrets}
              deltaKey="delta_moy_arrets"
              unit=""
            />
          </div>
        </div>
      )}

      {/* ── Joueurs de champ ── */}
      {hasFieldData && (
        <div className="space-y-3">
          <h3 className="font-sport italic uppercase text-sm font-black text-muted-foreground px-1">
            Joueurs de champ — Meilleures progressions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TopRankCard
              title="Moy. Buts — Top progression"
              entries={rankings.moy_buts}
              deltaKey="delta_moy_buts"
              unit=""
            />
            <TopRankCard
              title="Moy. Tirs — Top progression"
              entries={rankings.moy_tirs}
              deltaKey="delta_moy_tirs"
              unit=""
            />
            <TopRankCard
              title="% Efficacité — Top progression"
              entries={rankings.pct_tir}
              deltaKey="delta_pct_tir"
              unit="%"
            />
          </div>
        </div>
      )}

      {!hasGardienData && !hasFieldData && (
        <Card className="rounded-3xl border-2 p-8 text-center">
          <p className="text-muted-foreground italic text-sm">
            Aucun joueur avec suffisamment de matchs dans les deux périodes pour
            cette configuration.
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            Essayez un autre mode ou vérifiez les filtres appliqués.
          </p>
        </Card>
      )}

      {/* ── Tableau complet ── */}
      {sortedRows.length > 0 && (
        <Card className="rounded-3xl border-2 overflow-hidden">
          <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3 pt-4 px-5">
            <CardTitle className="font-sport italic text-sm uppercase text-muted-foreground">
              Tableau — Tous les joueurs ({sortedRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 960 }}>
                <thead>
                  <tr className="bg-muted/50 border-b">
                    {TCOLS.map((col, ci) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`px-3 py-2.5 text-left cursor-pointer select-none whitespace-nowrap font-black uppercase text-[10px] hover:bg-muted/80 transition-colors ${
                          col.isEvol
                            ? "bg-muted/30 text-center"
                            : "text-muted-foreground"
                        } ${ci === 0 ? "sticky left-0 bg-muted/50 z-20" : ""}`}
                      >
                        <span className="inline-flex flex-col">
                          <span>
                            {col.label}
                            {sortCol === col.key && (
                              <span className="ml-1 text-primary">
                                {sortDir === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </span>
                          {col.sub && (
                            <span className="text-[8px] font-normal normal-case opacity-60">
                              {col.sub}
                            </span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((e) => (
                    <tr
                      key={e.joueur.id}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      {TCOLS.map((col, ci) => {
                        const raw = col.getValue(e);
                        const isNull = raw === null;
                        const numVal = typeof raw === "number" ? raw : null;
                        const display = isNull
                          ? "—"
                          : col.fmt && numVal !== null
                            ? col.fmt(numVal)
                            : typeof raw === "string"
                              ? raw
                              : String(raw);
                        const evolColor =
                          col.isEvol && numVal !== null
                            ? numVal > 0
                              ? "#10b981"
                              : numVal < 0
                                ? "#ef4444"
                                : "#94a3b8"
                            : undefined;
                        return (
                          <td
                            key={col.key}
                            className={`px-3 py-2 whitespace-nowrap ${
                              ci === 0
                                ? "sticky left-0 bg-background font-bold z-10"
                                : ""
                            } ${col.isEvol ? "text-center font-black" : ""} ${
                              isNull ? "text-muted-foreground/40" : ""
                            }`}
                            style={{
                              ...(ci === 0
                                ? { borderLeft: `3px solid ${e.equipeColor}` }
                                : {}),
                              ...(evolColor ? { color: evolColor } : {}),
                            }}
                          >
                            {ci === 0 ? (
                              <span className="block truncate max-w-[140px]">
                                {display}
                              </span>
                            ) : (
                              display
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  ONGLET 7 — VERSUS / COMPARATIF                                 ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── Types internes ─────────────────────────────────────────────────
type VersusEntity =
  | { type: "joueur"; id: number }
  | { type: "equipe"; id: number }
  | { type: "club" }
  | { type: "poste"; poste: string };

type VersusStats = {
  label: string;
  color: string;
  matchs: number;
  victoires: number;
  nuls: number;
  defaites: number;
  pctVictoire: number;
  totalButs: number;
  totalTirs: number;
  moyButs: number;
  moyTirs: number;
  pctTir: number;
  totalArrets: number;
  moyArrets: number;
  pctArrets: number;
  totalExcl: number;
  moyExcl: number;
  total7m: number;
  moy7m: number;
  butsParVictoire: number;
  butsParDefaite: number;
  butsEncParVictoire: number;
  butsEncParDefaite: number;
  isGardienEntity: boolean;
  // Pic & constance — buts par match
  recordButs: number;
  q1Buts: number;
  medianButs: number;
  q3Buts: number;
  // Pic & constance — arrêts par match (gardien)
  recordArrets: number;
  q1Arrets: number;
  medianArrets: number;
  q3Arrets: number;
};

// ── Mini filtre latéral pour le panel Versus ───────────────────────
function VersusFilterPanel({
  data,
  filters,
  setFilters,
  label,
  color,
}: {
  data: StatsData;
  filters: Filters;
  setFilters: (f: Filters) => void;
  label: string;
  color: string;
}) {
  const saisons = [...new Set(data.competitions.map((c) => c.saison))]
    .sort()
    .reverse();
  const compOptions = data.competitions
    .filter((c) => !filters.saisonFilter || c.saison === filters.saisonFilter)
    .map((c) => ({ id: c.id, label: c.nom }));
  const equipeOptions = data.equipes.map((e) => ({ id: e.id, label: e.nom }));

  return (
    <div className="space-y-2">
      <p
        className="text-[9px] font-black uppercase tracking-widest"
        style={{ color }}
      >
        {label} — Filtres
      </p>
      {/* Saison */}
      <select
        className="w-full text-xs font-bold rounded-xl border px-3 py-1.5 bg-background"
        value={filters.saisonFilter}
        onChange={(e) =>
          setFilters({
            ...filters,
            saisonFilter: e.target.value,
            competitionIds: [],
          })
        }
      >
        <option value="">Toutes saisons</option>
        {saisons.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {/* Équipes */}
      <MultiSelectDropdown
        label="Équipes"
        options={equipeOptions}
        selected={
          filters.equipeIds.length === data.equipes.length
            ? []
            : filters.equipeIds
        }
        onChange={(ids) =>
          setFilters({
            ...filters,
            equipeIds: ids.length === 0 ? data.equipes.map((e) => e.id) : ids,
          })
        }
        allLabel="Toutes les équipes"
      />
      {/* Compétitions */}
      <MultiSelectDropdown
        label="Compétitions"
        options={compOptions}
        selected={filters.competitionIds}
        onChange={(ids) => setFilters({ ...filters, competitionIds: ids })}
        allLabel="Toutes compétitions"
      />
      {/* Localisation */}
      <select
        className="w-full text-xs font-bold rounded-xl border px-3 py-1.5 bg-background"
        value={filters.localisation}
        onChange={(e) =>
          setFilters({
            ...filters,
            localisation: e.target.value as Filters["localisation"],
          })
        }
      >
        <option value="tous">Dom. + Ext.</option>
        <option value="domicile">Domicile</option>
        <option value="exterieur">Extérieur</option>
      </select>
      {/* Difficulté */}
      <StringMultiSelect
        label="Difficulté"
        options={ALL_DIFFICULTES}
        selected={filters.difficultes as string[]}
        onChange={(vals) =>
          setFilters({ ...filters, difficultes: vals as Difficulte[] })
        }
        allLabel="Toutes difficultés"
      />
      {/* Dates */}
      <div className="flex gap-2">
        <input
          type="date"
          placeholder="Du"
          value={filters.dateDebut}
          onChange={(e) =>
            setFilters({ ...filters, dateDebut: e.target.value })
          }
          className="w-full text-xs rounded-xl border px-2 py-1.5 bg-background"
        />
        <input
          type="date"
          placeholder="Au"
          value={filters.dateFin}
          onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })}
          className="w-full text-xs rounded-xl border px-2 py-1.5 bg-background"
        />
      </div>
    </div>
  );
}

// ── Calcul des stats d'une entité ──────────────────────────────────
function computeVersusStats(
  entity: VersusEntity,
  filters: Filters,
  data: StatsData,
  label: string,
  color: string,
): VersusStats {
  const allEquipeIds = data.equipes.map((e) => e.id);

  // Déterminer les equipeIds pertinents pour l'entité
  let entityEquipeIds: number[] = filters.equipeIds;
  let joueurId: number | null = null;

  if (entity.type === "equipe") {
    entityEquipeIds = [entity.id];
  } else if (entity.type === "joueur") {
    joueurId = entity.id;
    const j = data.joueurs.find((j) => j.id === entity.id);
    entityEquipeIds = j?.id_equipe != null ? [j.id_equipe] : allEquipeIds;
  } else if (entity.type === "club") {
    entityEquipeIds = allEquipeIds;
  } else if (entity.type === "poste") {
    // tous les joueurs de ce poste dans les équipes filtrées
  }

  // Intersection avec le filtre équipes
  const equipeIds =
    entity.type === "club" || entity.type === "poste"
      ? filters.equipeIds
      : entityEquipeIds.filter((id) => filters.equipeIds.includes(id));

  if (equipeIds.length === 0) {
    return {
      label,
      color,
      matchs: 0,
      victoires: 0,
      nuls: 0,
      defaites: 0,
      pctVictoire: 0,
      totalButs: 0,
      totalTirs: 0,
      moyButs: 0,
      moyTirs: 0,
      pctTir: 0,
      totalArrets: 0,
      moyArrets: 0,
      pctArrets: 0,
      totalExcl: 0,
      moyExcl: 0,
      total7m: 0,
      moy7m: 0,
      butsParVictoire: 0,
      butsParDefaite: 0,
      butsEncParVictoire: 0,
      butsEncParDefaite: 0,
      isGardienEntity: false,
      recordButs: 0,
      q1Buts: 0,
      medianButs: 0,
      q3Buts: 0,
      recordArrets: 0,
      q1Arrets: 0,
      medianArrets: 0,
      q3Arrets: 0,
    };
  }

  // Matchs filtrés
  const matchsFiltres = data.matchs.filter((m) =>
    applyMatchFilter(m, filters, equipeIds, data.competitions),
  );

  const matchIds = new Set(matchsFiltres.map((m) => m.id));

  // Stats joueurs filtrées selon entité
  let statsRows = data.statsJoueurs.filter(
    (s) => s.id_match != null && matchIds.has(s.id_match!) && isStatValide(s),
  );

  if (entity.type === "joueur" && joueurId != null) {
    statsRows = statsRows.filter((s) => s.id_joueur === joueurId);
  } else if (entity.type === "equipe") {
    const joueursDansEquipe = new Set(
      data.joueurs.filter((j) => j.id_equipe === entity.id).map((j) => j.id),
    );
    statsRows = statsRows.filter(
      (s) => s.id_joueur != null && joueursDansEquipe.has(s.id_joueur!),
    );
  } else if (entity.type === "poste") {
    const joueursDuPoste = new Set(
      data.joueurs
        .filter((j) => {
          const pp = (j.poste_principal ?? "").toLowerCase();
          const ps = (j.postes_secondaires ?? []).map((p) => p.toLowerCase());
          return (
            pp === entity.poste.toLowerCase() ||
            ps.includes(entity.poste.toLowerCase())
          );
        })
        .map((j) => j.id),
    );
    statsRows = statsRows.filter(
      (s) => s.id_joueur != null && joueursDuPoste.has(s.id_joueur!),
    );
  } else if (entity.type === "club") {
    const joueursDuClub = new Set(
      data.joueurs
        .filter((j) => j.id_equipe != null && equipeIds.includes(j.id_equipe))
        .map((j) => j.id),
    );
    statsRows = statsRows.filter(
      (s) => s.id_joueur != null && joueursDuClub.has(s.id_joueur!),
    );
  }

  // Résultats (par match, pour le type équipe/club/poste on compte au niveau match)
  // Pour un joueur, on se base uniquement sur les matchs où il a des stats
  const matchsEffectifs =
    entity.type === "joueur"
      ? matchsFiltres.filter((m) => statsRows.some((s) => s.id_match === m.id))
      : matchsFiltres;

  let victoires = 0,
    nuls = 0,
    defaites = 0;
  matchsEffectifs.forEach((m) => {
    const r = getResult(m, equipeIds);
    if (r === "win") victoires++;
    else if (r === "draw") nuls++;
    else if (r === "loss") defaites++;
  });
  const matchs = matchsEffectifs.length;

  const totalButs = statsRows.reduce((a, s) => a + (s.buts ?? 0), 0);
  const totalTirs = statsRows.reduce((a, s) => a + (s.tirs ?? 0), 0);
  const totalExcl = statsRows.reduce((a, s) => a + (s.exclusions_2min ?? 0), 0);
  const total7m = statsRows.reduce((a, s) => a + (s.sept_metres ?? 0), 0);

  // Arrêts gardiens uniquement
  const gardiensIds = new Set(
    data.joueurs
      .filter((j) => {
        const pp = (j.poste_principal ?? "").toLowerCase();
        const ps = (j.postes_secondaires ?? []).map((p) => p.toLowerCase());
        return (
          (pp.includes("gardien") || ps.some((p) => p.includes("gardien"))) &&
          j.id_equipe != null &&
          equipeIds.includes(j.id_equipe)
        );
      })
      .map((j) => j.id),
  );
  const gardiensStats =
    entity.type === "joueur"
      ? gardiensIds.has(joueurId!)
        ? statsRows
        : []
      : statsRows.filter(
          (s) => s.id_joueur != null && gardiensIds.has(s.id_joueur!),
        );
  const totalArrets = gardiensStats.reduce((a, s) => a + (s.arrets ?? 0), 0);

  // % arrêts = arrêts / (arrêts + buts encaissés)
  let totalButsEncaisses = 0;
  gardiensStats.forEach((s) => {
    if (!s.id_match) return;
    const match = data.matchs.find((m) => m.id === s.id_match);
    if (!match?.score_final) return;
    const [a, b] = match.score_final.split("-").map(Number);
    if (isNaN(a) || isNaN(b)) return;
    const isHome =
      match.equipe_recevant_id != null &&
      equipeIds.includes(match.equipe_recevant_id);
    totalButsEncaisses += isHome ? b : a;
  });

  const n = matchs || 1;
  const garN = gardiensStats.filter((s) => (s.arrets ?? 0) >= 2).length || 1;
  const garNReal = gardiensStats.filter((s) => (s.arrets ?? 0) >= 2).length;

  const butsVicMatchs = matchsEffectifs.filter(
    (m) => getResult(m, equipeIds) === "win",
  );
  const butsDefMatchs = matchsEffectifs.filter(
    (m) => getResult(m, equipeIds) === "loss",
  );
  const statsByMatchVic = statsRows.filter(
    (s) => s.id_match && butsVicMatchs.some((m) => m.id === s.id_match),
  );
  const statsByMatchDef = statsRows.filter(
    (s) => s.id_match && butsDefMatchs.some((m) => m.id === s.id_match),
  );

  // Buts encaissés par match (depuis score_final, côté adverse)
  const encaisseParMatch = (matchList: typeof matchsFiltres): number => {
    let total = 0;
    matchList.forEach((m) => {
      if (!m.score_final) return;
      const [a, b] = m.score_final.split("-").map(Number);
      if (isNaN(a) || isNaN(b)) return;
      const isHome =
        m.equipe_recevant_id != null &&
        equipeIds.includes(m.equipe_recevant_id);
      total += isHome ? b : a;
    });
    return total;
  };
  const butsEncVic = encaisseParMatch(butsVicMatchs);
  const butsEncDef = encaisseParMatch(butsDefMatchs);

  // Détecte si l'entité est un gardien individuel
  const isGardienEntity =
    entity.type === "joueur" ? gardiensIds.has(joueurId!) : false;

  // Distributions par match (pic & constance)
  const butsParMatch = matchsEffectifs
    .map((m) =>
      statsRows
        .filter((s) => s.id_match === m.id)
        .reduce((sum, s) => sum + (s.buts ?? 0), 0),
    )
    .sort((a, b) => a - b);
  const arretsParMatch = matchsEffectifs
    .map((m) =>
      gardiensStats
        .filter((s) => s.id_match === m.id)
        .reduce((sum, s) => sum + (s.arrets ?? 0), 0),
    )
    .sort((a, b) => a - b);

  return {
    label,
    color,
    matchs,
    victoires,
    nuls,
    defaites,
    pctVictoire: pct(victoires, matchs),
    totalButs,
    totalTirs,
    moyButs: matchs ? +(totalButs / matchs).toFixed(2) : 0,
    moyTirs: matchs ? +(totalTirs / matchs).toFixed(2) : 0,
    pctTir: pct(totalButs, totalTirs),
    totalArrets,
    moyArrets: garNReal ? +(totalArrets / garN).toFixed(2) : 0,
    pctArrets: pct(totalArrets, totalArrets + totalButsEncaisses),
    totalExcl,
    moyExcl: matchs ? +(totalExcl / matchs).toFixed(2) : 0,
    total7m,
    moy7m: matchs ? +(total7m / matchs).toFixed(2) : 0,
    butsParVictoire: butsVicMatchs.length
      ? +(
          statsByMatchVic.reduce((a, s) => a + (s.buts ?? 0), 0) /
          butsVicMatchs.length
        ).toFixed(2)
      : 0,
    butsParDefaite: butsDefMatchs.length
      ? +(
          statsByMatchDef.reduce((a, s) => a + (s.buts ?? 0), 0) /
          butsDefMatchs.length
        ).toFixed(2)
      : 0,
    butsEncParVictoire: butsVicMatchs.length
      ? +(butsEncVic / butsVicMatchs.length).toFixed(2)
      : 0,
    butsEncParDefaite: butsDefMatchs.length
      ? +(butsEncDef / butsDefMatchs.length).toFixed(2)
      : 0,
    isGardienEntity,
    recordButs: butsParMatch.length ? butsParMatch[butsParMatch.length - 1] : 0,
    q1Buts: quartile(butsParMatch, 0.25),
    medianButs: quartile(butsParMatch, 0.5),
    q3Buts: quartile(butsParMatch, 0.75),
    recordArrets: arretsParMatch.length
      ? arretsParMatch[arretsParMatch.length - 1]
      : 0,
    q1Arrets: quartile(arretsParMatch, 0.25),
    medianArrets: quartile(arretsParMatch, 0.5),
    q3Arrets: quartile(arretsParMatch, 0.75),
  };
}

// ── Ligne de comparaison ───────────────────────────────────────────
function VersusBoxPlotRow({
  label,
  aQ1,
  aMedian,
  aQ3,
  aRecord,
  bQ1,
  bMedian,
  bQ3,
  bRecord,
  colorA,
  colorB,
}: {
  label: string;
  aQ1: number;
  aMedian: number;
  aQ3: number;
  aRecord: number;
  bQ1: number;
  bMedian: number;
  bQ3: number;
  bRecord: number;
  colorA: string;
  colorB: string;
}) {
  const maxVal = Math.max(aRecord, bRecord, 0.01);
  const aWins = aMedian > bMedian;
  const tie = aMedian === bMedian;

  function boxPlot(
    q1: number,
    med: number,
    q3: number,
    rec: number,
    color: string,
  ) {
    const W = 96,
      H = 26;
    const s = (v: number) =>
      Math.max(0, Math.min(W, Math.round((v / maxVal) * W)));
    const q1x = s(q1),
      medx = s(med),
      q3x = s(q3),
      recx = s(rec);
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect
          x={0}
          y={H / 2 - 1}
          width={W}
          height={2}
          rx={1}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <rect
          x={q1x}
          y={H / 2 - 5}
          width={Math.max(q3x - q1x, 2)}
          height={10}
          rx={2}
          fill={color}
          fillOpacity={0.18}
          stroke={color}
          strokeOpacity={0.4}
          strokeWidth={1}
        />
        <rect
          x={medx - 1}
          y={H / 2 - 7}
          width={2}
          height={14}
          rx={1}
          fill={color}
        />
        {rec > q3 && (
          <line
            x1={q3x}
            y1={H / 2}
            x2={recx}
            y2={H / 2}
            stroke={color}
            strokeOpacity={0.35}
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}
        <circle cx={recx} cy={H / 2} r={3.5} fill={color} fillOpacity={0.85} />
      </svg>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-3 py-2 sm:py-3 border-b last:border-0">
      {/* Côté A */}
      <div className="flex flex-col items-end gap-1">
        {boxPlot(aQ1, aMedian, aQ3, aRecord, colorA)}
        <div className="flex gap-1.5 text-[8.5px] text-muted-foreground">
          <span>
            Q1 <b style={{ color: colorA }}>{aQ1}</b>
          </span>
          <span className="opacity-30">·</span>
          <span>
            Méd <b style={{ color: colorA }}>{aMedian}</b>
          </span>
          <span className="opacity-30">·</span>
          <span>
            Q3 <b style={{ color: colorA }}>{aQ3}</b>
          </span>
          <span className="opacity-30">·</span>
          <span className="font-black" style={{ color: colorA }}>
            ↑{aRecord}
          </span>
        </div>
      </div>
      {/* Label central */}
      <div className="text-center min-w-0 w-16 sm:w-auto sm:min-w-[90px] px-0.5 sm:px-1">
        <p className="text-[9px] font-black uppercase text-muted-foreground">
          {label}
        </p>
        {!tie ? (
          <p className="text-[9px] text-muted-foreground/60 mt-0.5">
            méd +{Math.abs(aMedian - bMedian).toFixed(2)} {aWins ? "A" : "B"}
          </p>
        ) : (
          <p className="text-[9px] text-muted-foreground/60 italic">
            Méd. égale
          </p>
        )}
      </div>
      {/* Côté B */}
      <div className="flex flex-col items-start gap-1">
        {boxPlot(bQ1, bMedian, bQ3, bRecord, colorB)}
        <div className="flex gap-1.5 text-[8.5px] text-muted-foreground">
          <span>
            Q1 <b style={{ color: colorB }}>{bQ1}</b>
          </span>
          <span className="opacity-30">·</span>
          <span>
            Méd <b style={{ color: colorB }}>{bMedian}</b>
          </span>
          <span className="opacity-30">·</span>
          <span>
            Q3 <b style={{ color: colorB }}>{bQ3}</b>
          </span>
          <span className="opacity-30">·</span>
          <span className="font-black" style={{ color: colorB }}>
            ↑{bRecord}
          </span>
        </div>
      </div>
    </div>
  );
}

function VersusRow({
  label,
  vA,
  vB,
  unit = "",
  higherIsBetter = true,
  formatVal,
}: {
  label: string;
  vA: number;
  vB: number;
  unit?: string;
  higherIsBetter?: boolean;
  formatVal?: (v: number) => string;
}) {
  const fmt = formatVal ?? ((v: number) => `${v}${unit}`);
  const delta = Math.abs(vA - vB);
  const total = vA + vB;
  const wA = total === 0 ? 50 : Math.round((vA / total) * 100);
  const wB = 100 - wA;
  const aWins = higherIsBetter ? vA > vB : vA < vB;
  const bWins = higherIsBetter ? vB > vA : vB < vA;
  const tie = vA === vB;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-2 py-1.5 sm:py-2 border-b last:border-0">
      {/* Côté A */}
      <div className="flex items-center justify-end gap-1 sm:gap-2">
        <span
          className={`font-sport italic font-black text-sm sm:text-lg transition-all ${aWins ? "text-emerald-500 scale-110" : tie ? "text-muted-foreground" : "text-muted-foreground/60"}`}
        >
          {fmt(vA)}
        </span>
        <div className="w-12 sm:w-24 h-2 rounded-full bg-muted overflow-hidden flex justify-end">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${wA}%`,
              background: aWins ? "#10b981" : tie ? "#94a3b8" : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Label + écart */}
      <div className="text-center min-w-0 w-[72px] sm:w-auto sm:min-w-[110px] px-1">
        <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground">
          {label}
        </p>
        {!tie && (
          <p className="text-[10px] font-black text-muted-foreground/60 mt-0.5">
            écart {fmt(delta)}
          </p>
        )}
        {tie && (
          <p className="text-[9px] text-muted-foreground italic">Égalité</p>
        )}
      </div>

      {/* Côté B */}
      <div className="flex items-center justify-start gap-1 sm:gap-2">
        <div className="w-12 sm:w-24 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${wB}%`,
              background: bWins ? "#10b981" : tie ? "#94a3b8" : "#ef4444",
            }}
          />
        </div>
        <span
          className={`font-sport italic font-black text-sm sm:text-lg transition-all ${bWins ? "text-emerald-500 scale-110" : tie ? "text-muted-foreground" : "text-muted-foreground/60"}`}
        >
          {fmt(vB)}
        </span>
      </div>
    </div>
  );
}

// ── Sélecteur d'entité ─────────────────────────────────────────────
function EntitySelector({
  data,
  value,
  onChange,
  label,
  color,
}: {
  data: StatsData;
  value: VersusEntity | null;
  onChange: (e: VersusEntity) => void;
  label: string;
  color: string;
}) {
  const [type, setType] = useState<VersusEntity["type"]>("joueur");
  const [joueurDropdownOpen, setJoueurDropdownOpen] = useState(false);
  const [joueurSearch, setJoueurSearch] = useState("");
  const [selectedJoueurLabel, setSelectedJoueurLabel] = useState<string | null>(
    null,
  );

  const joueurEquipeColorMap = useMemo(() => {
    const m: Record<number, string> = {};
    data.equipes.forEach((eq, i) => {
      m[eq.id] = TEAM_PALETTE[i % TEAM_PALETTE.length];
    });
    return m;
  }, [data.equipes]);

  const filteredJoueurs = useMemo(
    () =>
      joueurSearch.trim()
        ? data.joueurs.filter((j) =>
            j.nom_prenom.toLowerCase().includes(joueurSearch.toLowerCase()),
          )
        : data.joueurs,
    [data.joueurs, joueurSearch],
  );
  const allPostes = useMemo(() => {
    const s = new Set<string>();
    data.joueurs.forEach((j) => {
      if (j.poste_principal) s.add(j.poste_principal);
      (j.postes_secondaires ?? []).forEach((p) => s.add(p));
    });
    return [...s].sort();
  }, [data.joueurs]);

  function handleChange(
    newType: VersusEntity["type"],
    id?: number,
    poste?: string,
  ) {
    if (newType === "joueur" && id) onChange({ type: "joueur", id });
    else if (newType === "equipe" && id) onChange({ type: "equipe", id });
    else if (newType === "club") onChange({ type: "club" });
    else if (newType === "poste" && poste) onChange({ type: "poste", poste });
  }

  return (
    <div className="space-y-2">
      <p
        className="text-[9px] font-black uppercase tracking-widest"
        style={{ color }}
      >
        {label}
      </p>
      {/* Type */}
      <div className="flex gap-1 flex-wrap">
        {(["joueur", "equipe", "club", "poste"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t);
              handleChange(
                t,
                undefined,
                t === "poste" && allPostes[0] ? allPostes[0] : undefined,
              );
            }}
            className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border transition-colors ${type === t ? "border-current text-white" : "border-muted-foreground/30 text-muted-foreground hover:bg-muted"}`}
            style={type === t ? { background: color, borderColor: color } : {}}
          >
            {t === "club" ? "Club entier" : t}
          </button>
        ))}
      </div>
      {/* Sélecteur selon type */}
      {type === "joueur" && (
        <div className="relative">
          <button
            onClick={() => setJoueurDropdownOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 text-xs font-bold rounded-xl border px-3 py-1.5 bg-background text-left"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedJoueurLabel ? (
                <>
                  {(() => {
                    const j = data.joueurs.find(
                      (jj) => jj.nom_prenom === selectedJoueurLabel,
                    );
                    const c = j?.id_equipe
                      ? (joueurEquipeColorMap[j.id_equipe] ?? TEAM_PALETTE[0])
                      : TEAM_PALETTE[0];
                    return (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: c }}
                      />
                    );
                  })()}
                  <span className="truncate">
                    {formatNomPrenom(selectedJoueurLabel)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Choisir un joueur…
                </span>
              )}
            </div>
            <ChevronDown
              size={12}
              className={`shrink-0 transition-transform ${joueurDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {joueurDropdownOpen && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-2xl bg-background border shadow-xl overflow-hidden">
              <div className="p-2 border-b">
                <input
                  type="text"
                  placeholder="Rechercher…"
                  value={joueurSearch}
                  onChange={(e) => setJoueurSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredJoueurs.map((j) => {
                  const c = j.id_equipe
                    ? (joueurEquipeColorMap[j.id_equipe] ?? TEAM_PALETTE[0])
                    : TEAM_PALETTE[0];
                  const equipeNom =
                    data.equipes.find((e) => e.id === j.id_equipe)?.nom ?? "";
                  return (
                    <button
                      key={j.id}
                      onClick={() => {
                        handleChange("joueur", j.id);
                        setSelectedJoueurLabel(j.nom_prenom);
                        setJoueurDropdownOpen(false);
                        setJoueurSearch("");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-muted transition-colors border-b last:border-0"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: c }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="font-bold truncate block">
                          {formatNomPrenom(j.nom_prenom)}
                        </span>
                        {equipeNom && (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {equipeNom}
                            {j.poste_principal ? ` · ${j.poste_principal}` : ""}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {filteredJoueurs.length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-3 py-2">
                    Aucun joueur trouvé
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {type === "equipe" && (
        <select
          className="w-full text-xs font-bold rounded-xl border px-3 py-1.5 bg-background"
          onChange={(e) => handleChange("equipe", Number(e.target.value))}
          defaultValue=""
        >
          <option value="" disabled>
            Choisir une équipe…
          </option>
          {data.equipes.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.nom}
            </option>
          ))}
        </select>
      )}
      {type === "poste" && (
        <select
          className="w-full text-xs font-bold rounded-xl border px-3 py-1.5 bg-background"
          onChange={(e) => handleChange("poste", undefined, e.target.value)}
          defaultValue={allPostes[0] ?? ""}
        >
          {allPostes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      )}
      {type === "club" && (
        <p className="text-[10px] text-muted-foreground italic">
          Toutes les équipes du club agrégées
        </p>
      )}
    </div>
  );
}

function entityLabel(entity: VersusEntity | null, data: StatsData): string {
  if (!entity) return "—";
  if (entity.type === "club") return "Club";
  if (entity.type === "equipe")
    return data.equipes.find((e) => e.id === entity.id)?.nom ?? "Équipe";
  if (entity.type === "joueur")
    return data.joueurs.find((j) => j.id === entity.id)?.nom_prenom
      ? formatNomPrenom(
          data.joueurs.find((j) => j.id === entity.id)!.nom_prenom,
        )
      : "Joueur";
  if (entity.type === "poste") return entity.poste;
  return "—";
}

// ── Composant principal Versus ─────────────────────────────────────
function StatsVersus({ data }: { data: StatsData }) {
  const defaultFilters = (): Filters => ({
    equipeIds: data.equipes.map((e) => e.id),
    competitionIds: [],
    joueurIds: [],
    saisonFilter: "",
    dateDebut: "",
    dateFin: "",
    localisation: "tous",
    difficultes: [],
    jours: [],
    heures: [],
    postes: [],
    resultats: [],
  });

  const [entityA, setEntityA] = useState<VersusEntity | null>(null);
  const [entityB, setEntityB] = useState<VersusEntity | null>(null);
  const [filtersA, setFiltersA] = useState<Filters>(defaultFilters);
  const [filtersB, setFiltersB] = useState<Filters>(defaultFilters);
  const [showConfig, setShowConfig] = useState(true);

  const COLOR_A = "#6366f1";
  const COLOR_B = "#f59e0b";

  const statsA = useMemo(() => {
    if (!entityA) return null;
    return computeVersusStats(
      entityA,
      filtersA,
      data,
      entityLabel(entityA, data),
      COLOR_A,
    );
  }, [entityA, filtersA, data]);

  const statsB = useMemo(() => {
    if (!entityB) return null;
    return computeVersusStats(
      entityB,
      filtersB,
      data,
      entityLabel(entityB, data),
      COLOR_B,
    );
  }, [entityB, filtersB, data]);

  const ready = statsA != null && statsB != null;

  // Score de domination global (combien de catégories gagne chaque côté)
  const scoreA = useMemo(() => {
    if (!statsA || !statsB) return 0;
    const rows: [number, number, boolean][] = [
      [statsA.pctVictoire, statsB.pctVictoire, true],
      [statsA.moyButs, statsB.moyButs, true],
      [statsA.moyTirs, statsB.moyTirs, true],
      [statsA.pctTir, statsB.pctTir, true],
      [statsA.pctArrets, statsB.pctArrets, true],
      [statsA.moyExcl, statsB.moyExcl, false],
    ];
    return rows.filter(([a, b, hib]) => (hib ? a > b : a < b)).length;
  }, [statsA, statsB]);
  const scoreB = useMemo(() => {
    if (!statsA || !statsB) return 0;
    const rows: [number, number, boolean][] = [
      [statsA.pctVictoire, statsB.pctVictoire, true],
      [statsA.moyButs, statsB.moyButs, true],
      [statsA.moyTirs, statsB.moyTirs, true],
      [statsA.pctTir, statsB.pctTir, true],
      [statsA.pctArrets, statsB.pctArrets, true],
      [statsA.moyExcl, statsB.moyExcl, false],
    ];
    return rows.filter(([a, b, hib]) => (hib ? b > a : b < a)).length;
  }, [statsA, statsB]);

  return (
    <div className="space-y-6">
      {/* ── Bandeau de configuration ── */}
      <Card className="rounded-3xl border-2">
        <button
          className="w-full flex items-center justify-between px-5 py-3 bg-muted/40 border-b hover:bg-muted/60 transition-colors"
          onClick={() => setShowConfig((v) => !v)}
        >
          <span className="font-sport italic uppercase text-sm font-black flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full inline-block shrink-0"
              style={{ background: COLOR_A }}
            />
            <span
              style={{ color: entityA ? COLOR_A : undefined }}
              className={entityA ? "" : "text-muted-foreground/50"}
            >
              {entityA ? entityLabel(entityA, data) : "Entité A"}
            </span>
            <span className="mx-1 text-[9px] font-black rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
              VS
            </span>
            <span
              className="w-3 h-3 rounded-full inline-block shrink-0"
              style={{ background: COLOR_B }}
            />
            <span
              style={{ color: entityB ? COLOR_B : undefined }}
              className={entityB ? "" : "text-muted-foreground/50"}
            >
              {entityB ? entityLabel(entityB, data) : "Entité B"}
            </span>
          </span>
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform ${showConfig ? "" : "rotate-180"}`}
          />
        </button>

        {showConfig && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x">
            {/* Panel A */}
            <div
              className="p-5 space-y-4"
              style={{ borderTop: `3px solid ${COLOR_A}` }}
            >
              <EntitySelector
                data={data}
                value={entityA}
                onChange={setEntityA}
                label="Entité A"
                color={COLOR_A}
              />
              <VersusFilterPanel
                data={data}
                filters={filtersA}
                setFilters={setFiltersA}
                label="A"
                color={COLOR_A}
              />
            </div>
            {/* Panel B */}
            <div
              className="p-5 space-y-4"
              style={{ borderTop: `3px solid ${COLOR_B}` }}
            >
              <EntitySelector
                data={data}
                value={entityB}
                onChange={setEntityB}
                label="Entité B"
                color={COLOR_B}
              />
              <VersusFilterPanel
                data={data}
                filters={filtersB}
                setFilters={setFiltersB}
                label="B"
                color={COLOR_B}
              />
            </div>
          </div>
        )}
        {ready && !showConfig && (
          <div className="px-5 py-2 flex items-center justify-center gap-3 text-[10px] font-black uppercase text-muted-foreground">
            <span style={{ color: COLOR_A }}>{statsA.matchs} matchs</span>
            <span className="opacity-40">·</span>
            <span style={{ color: COLOR_B }}>{statsB.matchs} matchs</span>
          </div>
        )}
      </Card>

      {/* ── Résultat VS — seulement si les deux entités sont choisies ── */}
      {ready && (
        <>
          {/* Banner score */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Entité A */}
            <div
              className="rounded-3xl border-2 p-5 text-center space-y-1 transition-all duration-500"
              style={{
                borderColor: scoreA > scoreB ? COLOR_A : "transparent",
                background: scoreA > scoreB ? `${COLOR_A}10` : undefined,
                boxShadow:
                  scoreA > scoreB ? `0 0 30px -4px ${COLOR_A}50` : undefined,
              }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: COLOR_A }}
              >
                {statsA.label}
              </p>
              <p
                className="font-sport italic font-black text-5xl"
                style={{ color: COLOR_A }}
              >
                {statsA.matchs}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase">
                matchs analysés
              </p>
              <div className="flex justify-center gap-3 mt-2 text-xs">
                <span className="text-emerald-500 font-black">
                  {statsA.victoires}V
                </span>
                <span className="text-amber-500 font-black">
                  {statsA.nuls}N
                </span>
                <span className="text-red-500 font-black">
                  {statsA.defaites}D
                </span>
              </div>
              {scoreA > scoreB && (
                <div
                  className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase px-3 py-1 rounded-full"
                  style={{
                    background: COLOR_A,
                    color: "white",
                    boxShadow: `0 4px 14px ${COLOR_A}70`,
                  }}
                >
                  ★ Avantage
                </div>
              )}
            </div>

            {/* VS central */}
            <div className="text-center space-y-1.5">
              <div className="text-4xl font-sport italic font-black text-muted-foreground/20 tracking-tight leading-none">
                VS
              </div>
              <div className="flex gap-2 justify-center items-baseline">
                <span
                  className="font-sport italic font-black text-3xl"
                  style={{
                    color: COLOR_A,
                    filter:
                      scoreA > scoreB
                        ? `drop-shadow(0 0 8px ${COLOR_A}90)`
                        : undefined,
                  }}
                >
                  {scoreA}
                </span>
                <span className="text-muted-foreground/50 font-bold text-xl">
                  —
                </span>
                <span
                  className="font-sport italic font-black text-3xl"
                  style={{
                    color: COLOR_B,
                    filter:
                      scoreB > scoreA
                        ? `drop-shadow(0 0 8px ${COLOR_B}90)`
                        : undefined,
                  }}
                >
                  {scoreB}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest">
                critères remportés
              </p>
            </div>

            {/* Entité B */}
            <div
              className="rounded-3xl border-2 p-5 text-center space-y-1 transition-all duration-500"
              style={{
                borderColor: scoreB > scoreA ? COLOR_B : "transparent",
                background: scoreB > scoreA ? `${COLOR_B}10` : undefined,
                boxShadow:
                  scoreB > scoreA ? `0 0 30px -4px ${COLOR_B}50` : undefined,
              }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: COLOR_B }}
              >
                {statsB.label}
              </p>
              <p
                className="font-sport italic font-black text-5xl"
                style={{ color: COLOR_B }}
              >
                {statsB.matchs}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase">
                matchs analysés
              </p>
              <div className="flex justify-center gap-3 mt-2 text-xs">
                <span className="text-emerald-500 font-black">
                  {statsB.victoires}V
                </span>
                <span className="text-amber-500 font-black">
                  {statsB.nuls}N
                </span>
                <span className="text-red-500 font-black">
                  {statsB.defaites}D
                </span>
              </div>
              {scoreB > scoreA && (
                <div
                  className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase px-3 py-1 rounded-full"
                  style={{
                    background: COLOR_B,
                    color: "white",
                    boxShadow: `0 4px 14px ${COLOR_B}70`,
                  }}
                >
                  ★ Avantage
                </div>
              )}
            </div>
          </div>

          {/* ── Comparaisons détaillées ── */}
          <Card className="rounded-3xl border-2 overflow-hidden">
            <div
              className="h-0.5"
              style={{
                backgroundImage: `linear-gradient(to right, ${COLOR_A}, ${COLOR_B})`,
              }}
            />
            <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3 pt-4 px-5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                <p
                  className="text-xs font-black uppercase"
                  style={{ color: COLOR_A }}
                >
                  {statsA.label}
                </p>
                <CardTitle className="font-sport italic text-sm uppercase text-muted-foreground text-center">
                  Comparatif détaillé
                </CardTitle>
                <p
                  className="text-xs font-black uppercase text-right"
                  style={{ color: COLOR_B }}
                >
                  {statsB.label}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-0">
              {/* Résultats */}
              <div className="flex items-center gap-2 mt-1 mb-1">
                <span className="w-0.5 h-3 rounded-full bg-primary/40 inline-block" />
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                  Résultats
                </p>
              </div>
              <VersusRow
                label="% Victoire"
                vA={statsA.pctVictoire}
                vB={statsB.pctVictoire}
                unit="%"
              />
              <VersusRow
                label="Victoires"
                vA={statsA.victoires}
                vB={statsB.victoires}
              />
              <VersusRow label="Nuls" vA={statsA.nuls} vB={statsB.nuls} />
              <VersusRow
                label="Défaites"
                vA={statsA.defaites}
                vB={statsB.defaites}
                higherIsBetter={false}
              />

              {/* Attaque */}
              <div className="flex items-center gap-2 mt-4 mb-1">
                <span className="w-0.5 h-3 rounded-full bg-primary/40 inline-block" />
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                  Attaque
                </p>
              </div>
              <VersusRow
                label="Total Buts"
                vA={statsA.totalButs}
                vB={statsB.totalButs}
              />
              <VersusRow
                label="Moy. Buts/match"
                vA={statsA.moyButs}
                vB={statsB.moyButs}
                formatVal={(v) => `${v}`}
              />
              <VersusRow
                label="Total Tirs"
                vA={statsA.totalTirs}
                vB={statsB.totalTirs}
              />
              <VersusRow
                label="Moy. Tirs/match"
                vA={statsA.moyTirs}
                vB={statsB.moyTirs}
                formatVal={(v) => `${v}`}
              />
              <VersusRow
                label="% Efficacité tir"
                vA={statsA.pctTir}
                vB={statsB.pctTir}
                unit="%"
              />
              <VersusRow
                label="Buts (victoires)"
                vA={statsA.butsParVictoire}
                vB={statsB.butsParVictoire}
                formatVal={(v) => `${v}`}
              />
              <VersusRow
                label="Buts (défaites)"
                vA={statsA.butsParDefaite}
                vB={statsB.butsParDefaite}
                formatVal={(v) => `${v}`}
              />

              {/* Buts encaissés — pertinent pour équipe/club */}
              {(entityA?.type === "equipe" ||
                entityA?.type === "club" ||
                entityB?.type === "equipe" ||
                entityB?.type === "club") && (
                <>
                  <div className="flex items-center gap-2 mt-4 mb-1">
                    <span className="w-0.5 h-3 rounded-full bg-primary/40 inline-block" />
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                      Défense (buts encaissés)
                    </p>
                  </div>
                  <VersusRow
                    label="Enc./match (victoires)"
                    vA={statsA.butsEncParVictoire}
                    vB={statsB.butsEncParVictoire}
                    higherIsBetter={false}
                    formatVal={(v) => `${v}`}
                  />
                  <VersusRow
                    label="Enc./match (défaites)"
                    vA={statsA.butsEncParDefaite}
                    vB={statsB.butsEncParDefaite}
                    higherIsBetter={false}
                    formatVal={(v) => `${v}`}
                  />
                </>
              )}

              {/* 7m */}
              <div className="flex items-center gap-2 mt-4 mb-1">
                <span className="w-0.5 h-3 rounded-full bg-primary/40 inline-block" />
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                  7 mètres
                </p>
              </div>
              <VersusRow
                label="Total 7m"
                vA={statsA.total7m}
                vB={statsB.total7m}
              />
              <VersusRow
                label="Moy. 7m/match"
                vA={statsA.moy7m}
                vB={statsB.moy7m}
                formatVal={(v) => `${v}`}
              />

              {/* Gardiens */}
              {(statsA.totalArrets > 0 || statsB.totalArrets > 0) && (
                <>
                  <div className="flex items-center gap-2 mt-4 mb-1">
                    <span className="w-0.5 h-3 rounded-full bg-primary/40 inline-block" />
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                      Gardiens
                    </p>
                  </div>
                  <VersusRow
                    label="Total Arrêts"
                    vA={statsA.totalArrets}
                    vB={statsB.totalArrets}
                  />
                  <VersusRow
                    label="Moy. Arrêts"
                    vA={statsA.moyArrets}
                    vB={statsB.moyArrets}
                    formatVal={(v) => `${v}`}
                  />
                  <VersusRow
                    label="% Arrêts"
                    vA={statsA.pctArrets}
                    vB={statsB.pctArrets}
                    unit="%"
                  />
                </>
              )}

              {/* Discipline */}
              <div className="flex items-center gap-2 mt-4 mb-1">
                <span className="w-0.5 h-3 rounded-full bg-primary/40 inline-block" />
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                  Discipline
                </p>
              </div>
              <VersusRow
                label="Total Excl. 2min"
                vA={statsA.totalExcl}
                vB={statsB.totalExcl}
                higherIsBetter={false}
              />
              <VersusRow
                label="Moy. Excl./match"
                vA={statsA.moyExcl}
                vB={statsB.moyExcl}
                higherIsBetter={false}
                formatVal={(v) => `${v}`}
              />

              {/* Pic & Constance */}
              <div className="flex items-center gap-2 mt-4 mb-1">
                <span className="w-0.5 h-3 rounded-full bg-primary/40 inline-block" />
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                  Pic &amp; Constance — Buts
                </p>
              </div>
              <VersusBoxPlotRow
                label="Buts / match"
                aQ1={statsA.q1Buts}
                aMedian={statsA.medianButs}
                aQ3={statsA.q3Buts}
                aRecord={statsA.recordButs}
                bQ1={statsB.q1Buts}
                bMedian={statsB.medianButs}
                bQ3={statsB.q3Buts}
                bRecord={statsB.recordButs}
                colorA={COLOR_A}
                colorB={COLOR_B}
              />
              {(statsA.totalArrets > 0 || statsB.totalArrets > 0) && (
                <>
                  <div className="flex items-center gap-2 mt-4 mb-1">
                    <span className="w-0.5 h-3 rounded-full bg-primary/40 inline-block" />
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                      Pic &amp; Constance — Arrêts
                    </p>
                  </div>
                  <VersusBoxPlotRow
                    label="Arrêts / match"
                    aQ1={statsA.q1Arrets}
                    aMedian={statsA.medianArrets}
                    aQ3={statsA.q3Arrets}
                    aRecord={statsA.recordArrets}
                    bQ1={statsB.q1Arrets}
                    bMedian={statsB.medianArrets}
                    bQ3={statsB.q3Arrets}
                    bRecord={statsB.recordArrets}
                    colorA={COLOR_A}
                    colorB={COLOR_B}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Radar visuel ── */}
          <Card className="rounded-3xl border-2 overflow-hidden">
            <div
              className="h-0.5"
              style={{
                backgroundImage: `linear-gradient(to right, ${COLOR_B}, ${COLOR_A})`,
              }}
            />
            <CardHeader className="bg-primary/10 border-b border-primary/20 pb-3 pt-4 px-5">
              <CardTitle className="font-sport italic text-sm uppercase text-muted-foreground">
                Profil comparatif — Vue radar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {(() => {
                const bothGardiens =
                  statsA.isGardienEntity && statsB.isGardienEntity;
                const neitherGardien =
                  !statsA.isGardienEntity &&
                  !statsB.isGardienEntity &&
                  entityA?.type === "joueur" &&
                  entityB?.type === "joueur";
                type RMetric = {
                  label: string;
                  a: number;
                  b: number;
                  max: number;
                  invert?: boolean;
                };
                const exclMax =
                  Math.max(statsA.moyExcl, statsB.moyExcl, 0.5) * 1.2;
                const metrics: RMetric[] = bothGardiens
                  ? [
                      {
                        label: "% Arrêts",
                        a: statsA.pctArrets,
                        b: statsB.pctArrets,
                        max: 100,
                      },
                      {
                        label: "Moy. Arrêts",
                        a: statsA.moyArrets,
                        b: statsB.moyArrets,
                        max:
                          Math.max(statsA.moyArrets, statsB.moyArrets, 1) * 1.2,
                      },
                      {
                        label: "% Victoire",
                        a: statsA.pctVictoire,
                        b: statsB.pctVictoire,
                        max: 100,
                      },
                      {
                        label: "Matchs",
                        a: statsA.matchs,
                        b: statsB.matchs,
                        max: Math.max(statsA.matchs, statsB.matchs, 1) * 1.2,
                      },
                    ]
                  : neitherGardien
                    ? [
                        {
                          label: "% Victoire",
                          a: statsA.pctVictoire,
                          b: statsB.pctVictoire,
                          max: 100,
                        },
                        {
                          label: "Moy. Buts",
                          a: statsA.moyButs,
                          b: statsB.moyButs,
                          max:
                            Math.max(statsA.moyButs, statsB.moyButs, 1) * 1.2,
                        },
                        {
                          label: "% Tir",
                          a: statsA.pctTir,
                          b: statsB.pctTir,
                          max: 100,
                        },
                        {
                          label: "Moy. Tirs",
                          a: statsA.moyTirs,
                          b: statsB.moyTirs,
                          max:
                            Math.max(statsA.moyTirs, statsB.moyTirs, 1) * 1.2,
                        },
                        {
                          label: "Moy. 7m",
                          a: statsA.moy7m,
                          b: statsB.moy7m,
                          max: Math.max(statsA.moy7m, statsB.moy7m, 1) * 1.2,
                        },
                        {
                          label: "Excl. ↓",
                          a: statsA.moyExcl,
                          b: statsB.moyExcl,
                          max: exclMax,
                          invert: true,
                        },
                      ]
                    : [
                        {
                          label: "% Victoire",
                          a: statsA.pctVictoire,
                          b: statsB.pctVictoire,
                          max: 100,
                        },
                        {
                          label: "Moy. Buts",
                          a: statsA.moyButs,
                          b: statsB.moyButs,
                          max:
                            Math.max(statsA.moyButs, statsB.moyButs, 1) * 1.2,
                        },
                        {
                          label: "% Tir",
                          a: statsA.pctTir,
                          b: statsB.pctTir,
                          max: 100,
                        },
                        {
                          label: "% Arrêts",
                          a: statsA.pctArrets,
                          b: statsB.pctArrets,
                          max: 100,
                        },
                        {
                          label: "Moy. Tirs",
                          a: statsA.moyTirs,
                          b: statsB.moyTirs,
                          max:
                            Math.max(statsA.moyTirs, statsB.moyTirs, 1) * 1.2,
                        },
                        {
                          label: "Excl. ↓",
                          a: statsA.moyExcl,
                          b: statsB.moyExcl,
                          max: exclMax,
                          invert: true,
                        },
                      ];
                const N = metrics.length;
                const CX = 160,
                  CY = 140,
                  R = 110;
                const angles = metrics.map(
                  (_, i) => (i / N) * 2 * Math.PI - Math.PI / 2,
                );
                const radarVal = (m: RMetric, raw: number) =>
                  m.invert ? Math.max(0, m.max - Math.min(raw, m.max)) : raw;
                const pt = (m: RMetric, raw: number, idx: number) => {
                  const r = (radarVal(m, raw) / m.max) * R;
                  return [
                    CX + r * Math.cos(angles[idx]),
                    CY + r * Math.sin(angles[idx]),
                  ];
                };
                const polyA = metrics
                  .map((m, i) => pt(m, m.a, i).join(","))
                  .join(" ");
                const polyB = metrics
                  .map((m, i) => pt(m, m.b, i).join(","))
                  .join(" ");
                const gridLevels = [0.25, 0.5, 0.75, 1];

                return (
                  <svg
                    viewBox="0 0 320 280"
                    className="w-full max-w-sm mx-auto"
                  >
                    {/* Grille */}
                    {gridLevels.map((lvl) => (
                      <polygon
                        key={lvl}
                        points={angles
                          .map(
                            (a) =>
                              `${CX + R * lvl * Math.cos(a)},${CY + R * lvl * Math.sin(a)}`,
                          )
                          .join(" ")}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity={0.1}
                        strokeWidth={1}
                      />
                    ))}
                    {/* Axes */}
                    {angles.map((a, i) => (
                      <line
                        key={i}
                        x1={CX}
                        y1={CY}
                        x2={CX + R * Math.cos(a)}
                        y2={CY + R * Math.sin(a)}
                        stroke="currentColor"
                        strokeOpacity={0.15}
                        strokeWidth={1}
                      />
                    ))}
                    {/* Polygone B */}
                    <polygon
                      points={polyB}
                      fill={COLOR_B}
                      fillOpacity={0.15}
                      stroke={COLOR_B}
                      strokeWidth={2}
                      strokeOpacity={0.8}
                    />
                    {/* Polygone A */}
                    <polygon
                      points={polyA}
                      fill={COLOR_A}
                      fillOpacity={0.15}
                      stroke={COLOR_A}
                      strokeWidth={2}
                      strokeOpacity={0.8}
                    />
                    {/* Labels */}
                    {metrics.map((m, i) => {
                      const lx = CX + (R + 16) * Math.cos(angles[i]);
                      const ly = CY + (R + 16) * Math.sin(angles[i]);
                      return (
                        <text
                          key={i}
                          x={lx}
                          y={ly}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={8}
                          fontWeight={700}
                          fill="currentColor"
                          fillOpacity={0.6}
                          className="uppercase font-black"
                        >
                          {m.label}
                        </text>
                      );
                    })}
                    {/* Légende */}
                    <circle cx={10} cy={270} r={4} fill={COLOR_A} />
                    <text
                      x={17}
                      y={270}
                      dominantBaseline="middle"
                      fontSize={8}
                      fill="currentColor"
                      fillOpacity={0.7}
                    >
                      {statsA.label}
                    </text>
                    <circle cx={160} cy={270} r={4} fill={COLOR_B} />
                    <text
                      x={167}
                      y={270}
                      dominantBaseline="middle"
                      fontSize={8}
                      fill="currentColor"
                      fillOpacity={0.7}
                    >
                      {statsB.label}
                    </text>
                  </svg>
                );
              })()}
            </CardContent>
          </Card>
        </>
      )}

      {!ready && (
        <Card className="rounded-3xl border-2 overflow-hidden">
          <div
            className="h-1"
            style={{
              backgroundImage: `linear-gradient(to right, ${COLOR_A}, ${COLOR_B})`,
            }}
          />
          <div className="p-16 text-center">
            <p className="text-5xl mb-4 opacity-20">⚡</p>
            <p className="font-sport italic font-black text-xl text-muted-foreground uppercase">
              Choisissez deux entités
            </p>
            <p className="text-sm text-muted-foreground/50 mt-2 max-w-xs mx-auto leading-relaxed">
              Sélectionnez un joueur, une équipe, un poste ou le club entier de
              chaque côté pour lancer la comparaison.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  COMPOSANT PRINCIPAL                                            ║
// ╚══════════════════════════════════════════════════════════════════╝
const TAB_ITEMS = [
  { value: "club", label: "Club", icon: Users },
  { value: "individuel", label: "Joueurs", icon: Target },
  { value: "efficacite", label: "Efficacité", icon: TrendingUp },
  { value: "offensif", label: "Attaque", icon: Sword },
  { value: "defensif", label: "Défense", icon: Shield },
  { value: "top", label: "Top", icon: Trophy },
  { value: "versus", label: "Versus", icon: Swords },
];

export default function StatsRecharts({ data }: { data: StatsData | null }) {
  const [filters, setFilters] = useState<Filters>(() => ({
    equipeIds: data?.equipes.map((e) => e.id) ?? [],
    competitionIds: [],
    joueurIds: [],
    saisonFilter: "",
    dateDebut: "",
    dateFin: "",
    localisation: "tous",
    difficultes: [],
    jours: [],
    heures: [],
    postes: [],
    resultats: [],
  }));
  const [activeTab, setActiveTab] = useState("club");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!data) {
    return (
      <div className="text-center text-muted-foreground italic font-sport uppercase py-24 opacity-50">
        Aucune donnée disponible
      </div>
    );
  }

  const activeItem =
    TAB_ITEMS.find((t) => t.value === activeTab) ?? TAB_ITEMS[0];

  return (
    <div className="relative">
      {/* Stacking context for FilterBar and dropdowns */}
      <div className="relative z-30">
        <FilterBar data={data} filters={filters} setFilters={setFilters} />
      </div>

      {/* Tabs and tab menus */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setMobileMenuOpen(false);
        }}
      >
        {/* Mobile: burger menu */}
        <div className="sm:hidden mb-6 relative z-60">
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-card border-2 border-primary/20 font-sport italic uppercase text-xs shadow-sm"
          >
            <div className="flex items-center gap-2">
              <activeItem.icon size={14} className="shrink-0" />
              {activeItem.label}
            </div>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${mobileMenuOpen ? "rotate-180" : ""}`}
            />
          </button>
          {mobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-2xl bg-background border shadow-xl overflow-hidden z-60">
              {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    setActiveTab(value);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-sport italic uppercase border-b last:border-0 transition-colors text-left ${activeTab === value ? "bg-primary text-white" : "hover:bg-muted"}`}
                >
                  <Icon size={13} className="shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: tab list */}
        <TabsList className="hidden sm:flex flex-wrap justify-center h-auto rounded-2xl bg-primary/8 border-2 border-primary/20 p-1.5 gap-1 mb-8 shadow-md w-full relative z-10">
          {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-xl font-sport italic uppercase text-xs px-4 py-2.5 transition-all duration-200 text-primary/70 hover:text-primary hover:bg-primary/10 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-[0_2px_14px_rgba(99,102,241,0.45)]"
            >
              <Icon size={13} className="mr-1.5 shrink-0" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="club">
          <StatsClub data={data} filters={filters} />
        </TabsContent>
        <TabsContent value="individuel">
          <StatsIndividuelles data={data} filters={filters} />
        </TabsContent>
        <TabsContent value="efficacite">
          <Efficacite data={data} filters={filters} />
        </TabsContent>
        <TabsContent value="offensif">
          <StatsOffensives data={data} filters={filters} />
        </TabsContent>
        <TabsContent value="defensif">
          <StatsDefensives data={data} filters={filters} />
        </TabsContent>
        <TabsContent value="top">
          <StatsTop data={data} filters={filters} />
        </TabsContent>
        <TabsContent value="versus">
          <StatsVersus data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
