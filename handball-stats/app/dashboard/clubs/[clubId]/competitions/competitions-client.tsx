"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  ChevronRight,
  Activity,
  AlertCircle,
  Layers,
  Search,
  X,
  Filter,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Competition {
  id: number;
  nom: string;
  saison: string | null;
  phase: string | null;
  niveau: string | null;
  max_journees: number | null;
  scrapingProgress: number | null;
  scrapingError: string | null;
  scrapingStatus: string | null;
  lastScrapedAt: Date | null;
  equipeNom: string;
  equipeId: number;
}

interface Props {
  clubId: string;
  competitions: Competition[];
  lockedIds: number[];
  subscription: string;
  quota: number; // -1 = illimité
}

export function CompetitionsClient({
  clubId,
  competitions,
  lockedIds,
  subscription,
  quota,
}: Props) {
  const [search, setSearch] = useState("");
  const [equipeFilter, setEquipeFilter] = useState<string>("all");
  const [saisonFilter, setSaisonFilter] = useState<string>("all");

  const equipes = useMemo(
    () => Array.from(new Set(competitions.map((c) => c.equipeNom))).sort(),
    [competitions],
  );

  const saisons = useMemo(() => {
    const unique = Array.from(
      new Set(competitions.map((c) => c.saison).filter(Boolean)),
    );
    return unique.sort((a, b) => (b ?? "").localeCompare(a ?? ""));
  }, [competitions]);

  const filtered = useMemo(() => {
    return competitions.filter((c) => {
      const matchesSearch =
        search === "" || c.nom.toLowerCase().includes(search.toLowerCase());
      const matchesEquipe =
        equipeFilter === "all" || c.equipeNom === equipeFilter;
      const matchesSaison = saisonFilter === "all" || c.saison === saisonFilter;
      return matchesSearch && matchesEquipe && matchesSaison;
    });
  }, [competitions, search, equipeFilter, saisonFilter]);

  const hasFilters =
    search !== "" || equipeFilter !== "all" || saisonFilter !== "all";

  function resetFilters() {
    setSearch("");
    setEquipeFilter("all");
    setSaisonFilter("all");
  }

  return (
    <div className="space-y-6">
      {/* Barre de filtres */}
      <div className="bg-card border-2 border-border rounded-3xl p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground tracking-widest">
          <Filter size={13} /> Filtres
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          {/* Recherche par nom */}
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Rechercher une compétition…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-2 font-medium"
            />
          </div>

          {/* Filtre équipe */}
          <Select value={equipeFilter} onValueChange={setEquipeFilter}>
            <SelectTrigger className="w-full md:w-52 rounded-xl border-2 font-bold uppercase text-xs">
              <SelectValue placeholder="Toutes les équipes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les équipes</SelectItem>
              {equipes.map((eq) => (
                <SelectItem key={eq} value={eq}>
                  {eq}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtre saison */}
          <Select value={saisonFilter} onValueChange={setSaisonFilter}>
            <SelectTrigger className="w-full md:w-44 rounded-xl border-2 font-bold uppercase text-xs">
              <SelectValue placeholder="Toutes les saisons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les saisons</SelectItem>
              {saisons.map((s) => (
                <SelectItem key={s!} value={s!}>
                  Saison {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="rounded-xl font-bold uppercase text-xs text-muted-foreground hover:text-destructive shrink-0"
            >
              <X size={13} className="mr-1" /> Réinitialiser
            </Button>
          )}
        </div>

        {/* Badges filtres actifs */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 pt-1">
            {search && (
              <Badge
                variant="outline"
                className="gap-1 cursor-pointer pr-1.5 hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                onClick={() => setSearch("")}
              >
                &ldquo;{search}&rdquo; <X size={10} />
              </Badge>
            )}
            {equipeFilter !== "all" && (
              <Badge
                variant="outline"
                className="gap-1 cursor-pointer pr-1.5 hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                onClick={() => setEquipeFilter("all")}
              >
                {equipeFilter} <X size={10} />
              </Badge>
            )}
            {saisonFilter !== "all" && (
              <Badge
                variant="outline"
                className="gap-1 cursor-pointer pr-1.5 hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                onClick={() => setSaisonFilter("all")}
              >
                Saison {saisonFilter} <X size={10} />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Compteur résultats */}
      <div className="px-1">
        <p className="text-xs font-bold uppercase text-muted-foreground">
          {filtered.length} compétition{filtered.length !== 1 ? "s" : ""}
          {hasFilters && (
            <span className="text-muted-foreground/60">
              {" "}
              sur {competitions.length}
            </span>
          )}
        </p>
      </div>

      {/* Bannière quota limité */}
      {quota !== -1 && lockedIds.length > 0 && (
        <div className="flex items-center justify-between gap-4 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm font-bold text-amber-800">
              Votre quota est de <span className="font-black">{quota}</span>{" "}
              compétition{quota !== 1 ? "s" : ""}. {lockedIds.length}{" "}
              compétition
              {lockedIds.length !== 1 ? "s sont" : " est"} verrouillée
              {lockedIds.length !== 1 ? "s" : ""}.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="configure-access"
              className="text-xs font-black uppercase bg-amber-600 text-white px-3 py-1.5 rounded-xl hover:bg-amber-700 transition-colors flex items-center gap-1"
            >
              Modifier <ArrowUpRight size={12} />
            </a>
            <a
              href="/pricing"
              className="text-xs font-black uppercase bg-primary text-white px-3 py-1.5 rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1"
            >
              Upgrader <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Grille de cartes */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card/40 rounded-4xl border-2 border-dashed">
          <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-xl font-sport italic uppercase text-muted-foreground">
            Aucune compétition trouvée
          </p>
          {hasFilters && (
            <Button
              variant="ghost"
              onClick={resetFilters}
              className="mt-4 font-bold uppercase text-xs"
            >
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((competition) => {
            const isLocked = lockedIds.includes(competition.id);

            if (isLocked) {
              return (
                <div
                  key={competition.id}
                  className="relative flex flex-col bg-card border-2 border-border/50 rounded-3xl overflow-hidden opacity-60 select-none"
                >
                  {/* Overlay cadenas */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-[2px] rounded-3xl">
                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center shadow-lg">
                      <Lock className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-sport font-black italic uppercase text-foreground">
                      Compétition verrouillée
                    </p>
                    <p className="text-[11px] font-bold text-muted-foreground text-center px-6">
                      Plan supérieur requis
                    </p>
                    <a
                      href="/pricing"
                      className="mt-1 text-xs font-black uppercase bg-primary text-white px-4 py-1.5 rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                    >
                      Upgrader <ArrowUpRight size={12} />
                    </a>
                  </div>

                  {/* Contenu flou derrière le cadenas */}
                  <div className="p-6 space-y-4 blur-[2px]">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-sport font-black italic uppercase leading-none">
                          {competition.nom}
                        </h2>
                      </div>
                      <div className="bg-muted p-2 rounded-xl">
                        <Activity size={20} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase">
                        {competition.equipeNom}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold uppercase italic"
                      >
                        Saison {competition.saison}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={competition.id}
                className="group relative flex flex-col bg-card border-2 border-border rounded-3xl shadow-sm hover:shadow-2xl hover:border-primary/50 transition-all duration-300 overflow-hidden"
              >
                {/* Barre de progression scraping */}
                <div className="absolute top-0 left-0 w-full h-1 bg-muted">
                  <div
                    className="h-full bg-secondary transition-all duration-500"
                    style={{ width: `${competition.scrapingProgress ?? 0}%` }}
                  />
                </div>

                <div className="p-6 space-y-4">
                  {/* Entête */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-black uppercase tracking-tighter border-secondary text-secondary-foreground bg-secondary/10"
                      >
                        ID: {competition.id}
                      </Badge>
                      <h2 className="text-2xl font-sport font-black italic uppercase leading-none group-hover:text-primary transition-colors">
                        {competition.nom}
                      </h2>
                    </div>
                    <div className="bg-muted p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                      <Activity size={20} />
                    </div>
                  </div>

                  {/* Badges équipe / niveau / saison */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase">
                      {competition.equipeNom}
                    </Badge>
                    {competition.niveau && (
                      <Badge className="bg-accent/10 text-accent-foreground border-none text-[10px] font-bold uppercase">
                        {competition.niveau}
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-bold uppercase italic"
                    >
                      Saison {competition.saison}
                    </Badge>
                  </div>

                  {/* Phase & Journées */}
                  <div className="grid grid-cols-2 gap-3 py-4 border-y border-dashed">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                        <Layers size={10} /> Phase
                      </p>
                      <p className="text-sm font-bold uppercase italic">
                        {competition.phase || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold flex items-center justify-end gap-1">
                        <Calendar size={10} /> Journées
                      </p>
                      <p className="text-sm font-bold uppercase italic">
                        {competition.max_journees ?? "0"}
                      </p>
                    </div>
                  </div>

                  {/* Erreur scraping */}
                  {competition.scrapingError && (
                    <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 animate-pulse">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-bold uppercase">
                        Erreur de mise à jour détectée
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link
                      href={`/dashboard/clubs/${clubId}/competitions/${competition.id}`}
                      className="flex-1 bg-primary text-white text-center py-3 rounded-xl font-sport italic uppercase text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      Détails <ChevronRight size={16} />
                    </Link>
                    <Link
                      href={`/dashboard/clubs/${clubId}/equipes/${competition.equipeId}`}
                      className="w-12 bg-muted hover:bg-secondary text-muted-foreground hover:text-secondary-foreground rounded-xl flex items-center justify-center transition-all"
                      title="Voir l'équipe"
                    >
                      <Search size={18} />
                    </Link>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-muted/30 border-t flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground italic">
                    MAJ :{" "}
                    {competition.lastScrapedAt
                      ? new Date(competition.lastScrapedAt).toLocaleDateString(
                          "fr-FR",
                        )
                      : "Jamais"}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />{" "}
                    {competition.scrapingStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
