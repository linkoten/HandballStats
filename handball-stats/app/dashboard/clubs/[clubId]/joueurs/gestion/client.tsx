"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Shield,
  Users,
  Search,
  Check,
  X,
  ChevronRight,
  UserCircle2,
  ShieldCheck,
  ShieldHalf,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getJoueurs, updateJoueursPostes } from "@/app/actions";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// POSTE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const COURT_POSITIONS = [
  {
    id: "Gardien",
    short: "GB",
    x: 50,
    y: 12,
    principal: "Gardien",
    secondaire: "Gardien",
  },
  {
    id: "AilierG",
    short: "ALG",
    x: 10,
    y: 32,
    principal: "Ailier",
    secondaire: "Ailier G",
  },
  {
    id: "ArriereG",
    short: "ARG",
    x: 28,
    y: 66,
    principal: "Arrière",
    secondaire: "Arrière G",
  },
  {
    id: "DemiCentre",
    short: "DC",
    x: 50,
    y: 76,
    principal: "Demi-Centre",
    secondaire: "Demi-Centre",
  },
  {
    id: "ArriereD",
    short: "ARD",
    x: 72,
    y: 66,
    principal: "Arrière",
    secondaire: "Arrière D",
  },
  {
    id: "AilierD",
    short: "ALD",
    x: 90,
    y: 32,
    principal: "Ailier",
    secondaire: "Ailier D",
  },
  {
    id: "Pivot",
    short: "PIV",
    x: 50,
    y: 38,
    principal: "Pivot",
    secondaire: "Pivot",
  },
];

const POSTE_COLORS: Record<string, string> = {
  Gardien: "#f59e0b",
  Ailier: "#10b981",
  "Ailier G": "#10b981",
  "Ailier D": "#10b981",
  Arrière: "#6366f1",
  "Arrière G": "#6366f1",
  "Arrière D": "#6366f1",
  "Demi-Centre": "#ec4899",
  Pivot: "#f97316",
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDBALL COURT
// ─────────────────────────────────────────────────────────────────────────────
function HandballCourt({
  joueurs,
  isPostePrincipal,
  selectedPoste,
  onPosteSelect,
}: {
  joueurs: any[];
  isPostePrincipal: boolean;
  selectedPoste: string;
  onPosteSelect: (p: string) => void;
}) {
  const getJoueursByPosition = (pos: (typeof COURT_POSITIONS)[0]) => {
    const field = isPostePrincipal ? "postePrincipal" : "posteSecondaire";
    const match = isPostePrincipal ? pos.principal : pos.secondaire;
    return joueurs.filter((j) => j[field] === match);
  };

  return (
    <div className="relative w-full aspect-4/5 bg-linear-to-b from-[#0f4c2a] via-[#0d5c32] to-[#0f4c2a] rounded-3xl border-4 border-[#1a3a25]/80 shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden select-none">
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        viewBox="0 0 100 120"
        preserveAspectRatio="none"
      >
        <rect
          x="3"
          y="2"
          width="94"
          height="116"
          fill="none"
          stroke="white"
          strokeWidth="0.8"
          rx="1"
        />
        <path
          d="M 22 2 Q 22 42 50 42 Q 78 42 78 2"
          fill="none"
          stroke="white"
          strokeWidth="1"
        />
        <path
          d="M 10 2 Q 10 58 50 58 Q 90 58 90 2"
          fill="none"
          stroke="white"
          strokeWidth="0.7"
          strokeDasharray="2.5,2"
        />
        <line
          x1="44"
          y1="28"
          x2="56"
          y2="28"
          stroke="white"
          strokeWidth="1.2"
        />
        <line
          x1="3"
          y1="102"
          x2="97"
          y2="102"
          stroke="white"
          strokeWidth="0.8"
        />
        <ellipse
          cx="50"
          cy="108"
          rx="12"
          ry="6"
          fill="none"
          stroke="white"
          strokeWidth="0.6"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="font-sport text-[clamp(3rem,14vw,8rem)] font-black italic text-white/3 uppercase tracking-widest select-none">
          TERRAIN
        </span>
      </div>
      {COURT_POSITIONS.map((pos) => {
        const current = isPostePrincipal ? pos.principal : pos.secondaire;
        const active = selectedPoste === current;
        const assigned = getJoueursByPosition(pos);
        const color = POSTE_COLORS[current] ?? "#6366f1";
        return (
          <div
            key={pos.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => onPosteSelect(active ? "" : current)}
                className={cn(
                  "w-12 h-12 rounded-full border-2 flex items-center justify-center font-sport italic text-[11px] font-black transition-all duration-200 shadow-lg",
                  active
                    ? "scale-125 shadow-[0_0_24px_rgba(255,255,255,0.35)] border-white text-black"
                    : "bg-black/40 border-white/20 text-white hover:scale-110 hover:border-white/60 backdrop-blur-sm",
                )}
                style={
                  active ? { backgroundColor: color, borderColor: "white" } : {}
                }
                title={current}
              >
                {pos.short}
              </button>
              <div className="flex flex-col gap-0.5 items-center">
                {assigned.slice(0, 3).map((j: any) => (
                  <div
                    key={j.id}
                    className="text-[8px] font-black text-white px-1.5 py-0.5 rounded-full whitespace-nowrap shadow"
                    style={{ backgroundColor: `${color}cc` }}
                  >
                    {j.nom_prenom.split(" ").pop()}
                  </div>
                ))}
                {assigned.length > 3 && (
                  <div className="text-[8px] font-black text-white/70">
                    +{assigned.length - 3}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER CARD
// ─────────────────────────────────────────────────────────────────────────────
function JoueurCard({
  joueur,
  selected,
  onToggle,
}: {
  joueur: any;
  selected: boolean;
  onToggle: () => void;
}) {
  const initials = joueur.nom_prenom
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const pColor = POSTE_COLORS[joueur.postePrincipal] ?? null;
  return (
    <div
      onClick={onToggle}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150 border-2",
        selected
          ? "bg-primary/10 border-primary shadow-lg shadow-primary/10"
          : "bg-slate-900/60 border-transparent hover:bg-slate-800/80 hover:border-slate-700",
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all",
          selected ? "text-white scale-105" : "bg-slate-800 text-slate-400",
        )}
        style={selected ? { backgroundColor: pColor ?? "#6366f1" } : {}}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-slate-100 uppercase tracking-tight truncate">
          {joueur.nom_prenom}
        </p>
        <div className="flex gap-2 mt-0.5 flex-wrap">
          {joueur.postePrincipal ? (
            <span
              className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${pColor ?? "#6366f1"}22`,
                color: pColor ?? "#818cf8",
              }}
            >
              ▲ {joueur.postePrincipal}
            </span>
          ) : (
            <span className="text-[9px] text-slate-600 italic">
              Pas de poste principal
            </span>
          )}
          {joueur.posteSecondaire && (
            <span className="text-[9px] text-slate-500 uppercase font-bold">
              ◆ {joueur.posteSecondaire}
            </span>
          )}
        </div>
      </div>
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
          selected
            ? "bg-primary border-primary"
            : "border-slate-700 group-hover:border-slate-500",
        )}
      >
        {selected && <Check size={11} className="text-white" strokeWidth={3} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function JoueursClient({ initialEquipes }: any) {
  const [joueurs, setJoueurs] = useState<any[]>([]);
  const [selectedEquipe, setSelectedEquipe] = useState<number | null>(null);
  const [selectedPoste, setSelectedPoste] = useState("");
  const [isPostePrincipal, setIsPostePrincipal] = useState(true);
  const [selectedJoueurs, setSelectedJoueurs] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredJoueurs = useMemo(
    () =>
      joueurs.filter((j) =>
        j.nom_prenom.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [joueurs, searchTerm],
  );
  const sansPrincipal = useMemo(
    () => joueurs.filter((j) => !j.postePrincipal).length,
    [joueurs],
  );

  useEffect(() => {
    if (initialEquipes?.length > 0) setSelectedEquipe(initialEquipes[0].id);
  }, [initialEquipes]);

  useEffect(() => {
    if (selectedEquipe) refreshJoueurs();
  }, [selectedEquipe]);

  const refreshJoueurs = () => {
    startTransition(async () => {
      const res = await getJoueurs(selectedEquipe!.toString());
      if (res.success) setJoueurs(res.data);
    });
  };

  const handleAssign = () => {
    startTransition(async () => {
      const updates = selectedJoueurs.map((id) => ({
        joueurId: id,
        [isPostePrincipal ? "postePrincipal" : "posteSecondaire"]:
          selectedPoste,
      }));
      const res = await updateJoueursPostes(updates);
      if (res.success) {
        toast.success(
          `Poste ${isPostePrincipal ? "principal" : "secondaire"} mis à jour`,
          {
            description: `${selectedJoueurs.length} joueur(s) assigné(s) au poste "${selectedPoste}"`,
          },
        );
        setSelectedJoueurs([]);
        refreshJoueurs();
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    });
  };

  const toggleAll = () => {
    setSelectedJoueurs(
      selectedJoueurs.length === filteredJoueurs.length &&
        filteredJoueurs.length > 0
        ? []
        : filteredJoueurs.map((j) => j.id),
    );
  };

  const canAssign = !!selectedPoste && selectedJoueurs.length > 0 && !isPending;

  return (
    <div className="min-h-screen bg-[#080f1a] text-slate-100 font-sans">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Shield size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Gestion des effectifs
              </p>
              <h1 className="font-sport italic font-black text-2xl uppercase tracking-tight leading-none">
                Éditeur de <span className="text-primary">Postes</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {joueurs.length > 0 && (
              <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 font-bold">
                <span className="flex items-center gap-1.5">
                  <Users size={13} />
                  {joueurs.length} joueurs
                </span>
                {sansPrincipal > 0 && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <AlertCircle size={12} />
                    {sansPrincipal} sans poste
                  </span>
                )}
              </div>
            )}
            <Select
              value={selectedEquipe?.toString()}
              onValueChange={(v) => {
                setSelectedEquipe(Number(v));
                setSelectedJoueurs([]);
                setSelectedPoste("");
              }}
            >
              <SelectTrigger className="w-56 bg-slate-800/80 border-slate-700 h-10 font-bold rounded-xl text-sm">
                <SelectValue placeholder="Sélectionner une équipe..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                {initialEquipes?.map((e: any) => (
                  <SelectItem
                    key={e.id}
                    value={e.id.toString()}
                    className="font-medium"
                  >
                    {e.club?.nom && (
                      <span className="text-slate-400 text-xs mr-1">
                        {e.club.nom} /
                      </span>
                    )}
                    {e.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 lg:gap-8">
          {/* LEFT: Court */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                Mode :
              </span>
              <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 gap-1">
                <button
                  onClick={() => {
                    setIsPostePrincipal(true);
                    setSelectedPoste("");
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all",
                    isPostePrincipal
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-slate-500 hover:text-slate-300",
                  )}
                >
                  <ShieldCheck size={14} />
                  Poste Principal
                </button>
                <button
                  onClick={() => {
                    setIsPostePrincipal(false);
                    setSelectedPoste("");
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all",
                    !isPostePrincipal
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                      : "text-slate-500 hover:text-slate-300",
                  )}
                >
                  <ShieldHalf size={14} />
                  Poste Secondaire
                </button>
              </div>
              {selectedPoste && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-slate-500 font-bold">
                    Sélectionné :
                  </span>
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs text-black"
                    style={{
                      backgroundColor: POSTE_COLORS[selectedPoste] ?? "#6366f1",
                    }}
                  >
                    {selectedPoste}
                    <button
                      onClick={() => setSelectedPoste("")}
                      className="opacity-60 hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              {isPending && (
                <div className="absolute inset-0 z-10 bg-black/40 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="animate-spin text-white" size={32} />
                </div>
              )}
              <HandballCourt
                joueurs={joueurs}
                isPostePrincipal={isPostePrincipal}
                selectedPoste={selectedPoste}
                onPosteSelect={setSelectedPoste}
              />
              {!selectedPoste && (
                <div className="mt-3 text-center text-xs text-slate-600 font-bold uppercase tracking-widest">
                  Cliquez sur un poste pour le sélectionner
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Players + action */}
          <div className="flex flex-col gap-4">
            <div
              className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden flex flex-col"
              style={{ maxHeight: "70vh" }}
            >
              <div className="p-5 border-b border-slate-800 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCircle2 size={18} className="text-slate-400" />
                    <span className="font-sport italic font-black text-xl uppercase text-slate-100">
                      Effectif
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedJoueurs.length > 0 && (
                      <Badge className="bg-primary/20 text-primary border-primary/30 font-black text-xs">
                        {selectedJoueurs.length} sélectionné
                        {selectedJoueurs.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-slate-400 border-slate-700 text-xs font-bold"
                    >
                      {filteredJoueurs.length} joueur
                      {filteredJoueurs.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:border-primary outline-none transition-all placeholder:text-slate-600"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {filteredJoueurs.length > 0 && (
                  <button
                    onClick={toggleAll}
                    className="w-full text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors py-1.5 flex items-center justify-center gap-1.5 border border-slate-800 rounded-xl hover:border-slate-700"
                  >
                    {selectedJoueurs.length === filteredJoueurs.length &&
                    filteredJoueurs.length > 0 ? (
                      <>
                        <X size={11} />
                        Tout désélectionner
                      </>
                    ) : (
                      <>
                        <Check size={11} />
                        Tout sélectionner ({filteredJoueurs.length})
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {isPending && joueurs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                    <Loader2 className="animate-spin mb-3" size={24} />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Chargement...
                    </span>
                  </div>
                ) : filteredJoueurs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                    <Users size={28} className="mb-3 opacity-40" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {searchTerm ? "Aucun résultat" : "Aucun joueur"}
                    </span>
                  </div>
                ) : (
                  filteredJoueurs.map((j) => (
                    <JoueurCard
                      key={j.id}
                      joueur={j}
                      selected={selectedJoueurs.includes(j.id)}
                      onToggle={() =>
                        setSelectedJoueurs((prev) =>
                          prev.includes(j.id)
                            ? prev.filter((id) => id !== j.id)
                            : [...prev, j.id],
                        )
                      }
                    />
                  ))
                )}
              </div>
            </div>

            {/* Action panel */}
            <div
              className={cn(
                "rounded-3xl border p-5 space-y-4 transition-all duration-300",
                canAssign
                  ? "bg-slate-900 border-primary/30 shadow-lg shadow-primary/5"
                  : "bg-slate-900/40 border-slate-800/50",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-bold flex-wrap">
                <span
                  className={cn(
                    "font-black",
                    canAssign ? "text-slate-200" : "text-slate-600",
                  )}
                >
                  {selectedJoueurs.length} joueur
                  {selectedJoueurs.length > 1 ? "s" : ""}
                </span>
                <ChevronRight size={14} className="text-slate-600" />
                {selectedPoste ? (
                  <span
                    className="px-2 py-0.5 rounded-lg font-black text-black text-xs"
                    style={{
                      backgroundColor: POSTE_COLORS[selectedPoste] ?? "#6366f1",
                    }}
                  >
                    {selectedPoste}
                  </span>
                ) : (
                  <span className="text-slate-600 italic text-xs">
                    Aucun poste sélectionné
                  </span>
                )}
                <span
                  className={cn(
                    "ml-auto text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                    isPostePrincipal
                      ? "bg-primary/20 text-primary"
                      : "bg-amber-500/20 text-amber-400",
                  )}
                >
                  {isPostePrincipal ? "Principal" : "Secondaire"}
                </span>
              </div>

              <Button
                disabled={!canAssign}
                onClick={handleAssign}
                className={cn(
                  "w-full h-14 font-sport italic text-lg uppercase tracking-wide transition-all active:scale-[0.98]",
                  !canAssign && "opacity-40",
                )}
              >
                {isPending ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <Shield size={18} className="mr-2" />
                    Assigner{selectedPoste ? ` — ${selectedPoste}` : ""}
                  </>
                )}
              </Button>

              {!canAssign && (
                <p className="text-center text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                  {!selectedPoste && !selectedJoueurs.length
                    ? "Sélectionnez un poste et des joueurs"
                    : !selectedPoste
                      ? "Sélectionnez un poste sur le terrain"
                      : "Sélectionnez au moins un joueur"}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
