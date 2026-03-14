"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckSquare, Square, Trophy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updatePinnedCompetitions } from "@/app/actions/competition-actions";

interface Competition {
  id: number;
  nom: string;
  saison: string;
  equipeNom: string;
  isPinned: boolean;
}

interface Props {
  competitions: Competition[];
  quota: number;
  clubId: number;
}

export function SelectCompetitionsForm({ competitions, quota, clubId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Init : les compétitions déjà épinglées (ou toutes si aucune sélection faite)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(competitions.filter((c) => c.isPinned).map((c) => c.id)),
  );

  // Même saison + même équipe = 1 seul slot consommé
  function getEffectiveCount(ids: Set<number>): number {
    const pairs = new Set<string>();
    for (const id of ids) {
      const comp = competitions.find((c) => c.id === id);
      if (comp) pairs.add(`${comp.saison ?? ""}|${comp.equipeNom}`);
    }
    return pairs.size;
  }

  const effectiveCount = getEffectiveCount(selectedIds);
  const remaining = quota - effectiveCount;
  const isValid = effectiveCount > 0 && effectiveCount <= quota;

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (getEffectiveCount(new Set([...prev, id])) > quota) return prev;
        next.add(id);
      }
      return next;
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updatePinnedCompetitions(clubId, [...selectedIds]);
      if (!res.success) {
        setError(res.error ?? "Erreur inconnue");
        return;
      }
      router.refresh();
    });
  }

  // Grouper par saison pour l'affichage
  const bySaison = competitions.reduce<Record<string, Competition[]>>(
    (acc, c) => {
      const key = c.saison ?? "Saison inconnue";
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    },
    {},
  );
  const saisons = Object.keys(bySaison).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {/* Compteur quota */}
      <div className="flex items-center justify-between bg-muted/50 border-2 border-border rounded-2xl px-5 py-3">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-black uppercase tracking-tight">
              {effectiveCount} / {quota} sélectionnée
              {quota !== 1 ? "s" : ""}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {remaining > 0
                ? `Vous pouvez encore sélectionner ${remaining} compétition${remaining > 1 ? "s" : ""}`
                : remaining === 0
                  ? "Quota atteint"
                  : ""}
            </p>
          </div>
        </div>
        {/* Barre de progression */}
        <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{
              width: `${Math.min((effectiveCount / quota) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-xl border border-destructive/20">
          <AlertCircle size={16} />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* Liste par saison */}
      <div className="space-y-6">
        {saisons.map((saison) => (
          <div key={saison} className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
              Saison {saison}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {bySaison[saison].map((competition) => {
                const isSelected = selectedIds.has(competition.id);
                // Désactivé seulement si l'ajout consommerait un slot supplémentaire et dépasse le quota
                const isDisabled =
                  !isSelected &&
                  getEffectiveCount(new Set([...selectedIds, competition.id])) > quota;

                return (
                  <button
                    key={competition.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => toggle(competition.id)}
                    className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl border-2 transition-all duration-150 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : isDisabled
                          ? "border-border/40 bg-muted/20 opacity-50 cursor-not-allowed"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    {/* Checkbox */}
                    <span
                      className={`shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} />
                      ) : (
                        <Square size={20} />
                      )}
                    </span>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className="font-sport font-black italic uppercase text-sm leading-tight truncate">
                        {competition.nom}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium truncate">
                        {competition.equipeNom}
                      </p>
                    </div>

                    {/* Badge état */}
                    {isSelected ? (
                      <Badge className="shrink-0 bg-primary/10 text-primary border-none text-[10px] font-black uppercase">
                        Sélectionnée
                      </Badge>
                    ) : isDisabled ? (
                      <Lock
                        size={14}
                        className="shrink-0 text-muted-foreground"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bouton save */}
      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={!isValid || isPending}
          className="font-sport italic uppercase px-8"
        >
          <Trophy className="mr-2 w-4 h-4" />
          {isPending ? "Enregistrement…" : "Confirmer la sélection"}
        </Button>
      </div>
    </div>
  );
}
