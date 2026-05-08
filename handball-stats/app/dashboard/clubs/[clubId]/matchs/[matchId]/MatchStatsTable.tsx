"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatNomPrenom } from "@/lib/utils";
import { updateStatistiquesJoueur } from "@/app/actions/match-actions";

function calcEff(val: number | null, total: number | null): number {
  const v = val ?? 0;
  const t = total ?? 0;
  if (!t) return 0;
  return Math.round((v / t) * 100);
}

interface StatRow {
  id: number;
  buts: number | null;
  tirs: number | null;
  arrets: number | null;
  exclusions_2min: number | null;
  avertissements: number | null;
  disqualifications: number | null;
  sept_metres: number | null;
  joueurs?: {
    nom_prenom?: string | null;
    num_maillot?: string | null;
    poste_principal?: string | null;
  } | null;
}

interface EditValues {
  buts: number;
  tirs: number;
  arrets: number;
  exclusions_2min: number;
  avertissements: number;
  discipline: number;
  sept_metres: number;
}

interface Props {
  stats: StatRow[];
  canEdit: boolean;
}

export function MatchStatsTable({ stats: initialStats, canEdit }: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<StatRow[]>(initialStats);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<EditValues | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(stat: StatRow) {
    setEditingId(stat.id);
    setEditValues({
      buts: stat.buts ?? 0,
      tirs: stat.tirs ?? 0,
      arrets: stat.arrets ?? 0,
      exclusions_2min: stat.exclusions_2min ?? 0,
      avertissements: stat.avertissements ?? 0,
      discipline: stat.disqualifications ?? 0,
      sept_metres: 0,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues(null);
  }

  async function saveEdit(statId: number) {
    if (!editValues) return;
    setSaving(true);
    try {
      const result = await updateStatistiquesJoueur(statId, editValues);
      if (result.success) {
        setStats((prev) =>
          prev.map((s) => (s.id === statId ? { ...s, ...editValues } : s)),
        );
        toast.success("Statistiques mises à jour !");
        setEditingId(null);
        setEditValues(null);
        router.refresh();
      } else {
        toast.error("Erreur", { description: result.error });
      }
    } catch {
      toast.error("Erreur inattendue lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  function NumInput({
    field,
    label,
  }: {
    field: keyof EditValues;
    label: string;
  }) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[8px] font-black uppercase text-muted-foreground">
          {label}
        </span>
        <input
          type="number"
          min={0}
          value={editValues?.[field] ?? 0}
          onChange={(e) =>
            setEditValues((prev) =>
              prev ? { ...prev, [field]: parseInt(e.target.value) || 0 } : prev,
            )
          }
          className="w-14 border-2 border-primary/40 rounded-lg px-1 py-1 text-center font-sport italic text-sm font-black focus:outline-none focus:border-primary bg-background"
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {canEdit && (
        <div className="px-6 py-3 bg-secondary/10 border-b border-secondary/20 flex items-center gap-2">
          <Pencil size={12} className="text-secondary" />
          <p className="text-[10px] font-black uppercase text-secondary tracking-wider">
            Mode Entraîneur — survolez une ligne et cliquez{" "}
            <Pencil size={10} className="inline" /> pour modifier les
            statistiques
          </p>
        </div>
      )}

      <Table>
        <TableHeader className="bg-muted/50 border-b-2">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[60px] text-center font-sport italic text-[10px] uppercase">
              N°
            </TableHead>
            <TableHead className="min-w-[180px] font-sport italic text-[10px] uppercase">
              Joueur
            </TableHead>
            <TableHead className="text-center font-sport italic text-[10px] uppercase bg-primary/5">
              Buts / Tirs
            </TableHead>
            <TableHead className="text-center font-sport italic text-[10px] uppercase bg-primary/5">
              % Eff.
            </TableHead>
            <TableHead className="text-center font-sport italic text-[10px] uppercase bg-secondary/5">
              Arrêts
            </TableHead>
            <TableHead className="text-center font-sport italic text-[10px] uppercase bg-destructive/5 text-destructive">
              Excl. 2&apos;
            </TableHead>
            <TableHead className="text-center font-sport italic text-[10px] uppercase">
              Discipline
            </TableHead>
            <TableHead className="text-center font-sport italic text-[10px] uppercase bg-secondary/5">
              7m
            </TableHead>
            {canEdit && (
              <TableHead className="w-20 text-center font-sport italic text-[10px] uppercase" />
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {stats.map((stat) => {
            const isEditing = editingId === stat.id;
            const displayButs = isEditing
              ? (editValues?.buts ?? stat.buts)
              : stat.buts;
            const displayTirs = isEditing
              ? (editValues?.tirs ?? stat.tirs)
              : stat.tirs;
            const effTir = calcEff(displayButs, displayTirs);
            const isGK =
              (stat.arrets ?? 0) > 0 ||
              stat.joueurs?.poste_principal?.toLowerCase().includes("gardien");
            const hasExclusion = (stat.exclusions_2min ?? 0) > 0;

            return (
              <TableRow
                key={stat.id}
                className={cn(
                  "group transition-colors border-b",
                  isEditing
                    ? "bg-primary/5 border-x-2 border-x-primary/30"
                    : hasExclusion
                      ? "hover:bg-destructive/5"
                      : "hover:bg-muted/40",
                )}
              >
                {/* Numéro */}
                <TableCell className="text-center font-sport font-black italic text-lg text-muted-foreground/40 group-hover:text-primary transition-colors">
                  {stat.joueurs?.num_maillot || "--"}
                </TableCell>

                {/* Joueur */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-black text-sm italic group-hover:text-primary transition-colors">
                      {formatNomPrenom(stat.joueurs?.nom_prenom)}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase">
                      {stat.joueurs?.poste_principal || "Joueur"}
                    </span>
                  </div>
                </TableCell>

                {/* Buts / Tirs */}
                <TableCell className="text-center bg-primary/5">
                  {isEditing ? (
                    <div className="flex items-end justify-center gap-2">
                      <NumInput field="buts" label="Buts" />
                      <span className="text-muted-foreground/40 text-xs mb-2">
                        /
                      </span>
                      <NumInput field="tirs" label="Tirs" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-black font-sport italic text-primary leading-none">
                        {stat.buts ?? 0}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground mt-0.5">
                        sur {stat.tirs ?? 0}
                      </span>
                    </div>
                  )}
                </TableCell>

                {/* Efficacité */}
                <TableCell className="text-center bg-primary/5">
                  <span
                    className={cn(
                      "text-xs font-sport italic font-black",
                      effTir >= 70
                        ? "text-green-500"
                        : effTir >= 40
                          ? "text-amber-500"
                          : "text-muted-foreground",
                    )}
                  >
                    {effTir}%
                  </span>
                </TableCell>

                {/* Arrêts */}
                <TableCell className="text-center bg-secondary/5">
                  {isEditing ? (
                    <NumInput field="arrets" label="Arrêts" />
                  ) : isGK ? (
                    <span className="text-lg font-black font-sport italic text-secondary leading-none">
                      {stat.arrets ?? 0}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/20 text-xs">-</span>
                  )}
                </TableCell>

                {/* Exclusions 2' */}
                <TableCell className="text-center bg-destructive/5">
                  {isEditing ? (
                    <NumInput field="exclusions_2min" label="Excl." />
                  ) : hasExclusion ? (
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span className="text-lg font-black font-sport italic text-destructive leading-none">
                        {stat.exclusions_2min}
                      </span>
                      <span className="text-[8px] font-black text-destructive/60 uppercase">
                        Sanction
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/20">-</span>
                  )}
                </TableCell>

                {/* Discipline */}
                <TableCell className="text-center">
                  {isEditing ? (
                    <div className="flex items-end justify-center gap-2">
                      <NumInput field="avertissements" label="Jaune" />
                      <NumInput field="discipline" label="Rouge" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5">
                      {(stat.avertissements ?? 0) > 0 && (
                        <div
                          className="w-3 h-4 bg-yellow-400 rounded-sm shadow-sm border border-yellow-500"
                          title="Avertissement"
                        />
                      )}
                      {(stat.disqualifications ?? 0) > 0 && (
                        <div
                          className="w-3 h-4 bg-red-600 rounded-sm shadow-sm border border-red-700"
                          title="Disqualification"
                        />
                      )}
                      {!(stat.avertissements ?? 0) &&
                        !(stat.disqualifications ?? 0) && (
                          <span className="text-muted-foreground/20 text-xs">
                            -
                          </span>
                        )}
                    </div>
                  )}
                </TableCell>

                {/* 7 mètres */}
                <TableCell className="text-center bg-secondary/5">
                  {isEditing ? (
                    <NumInput field="sept_metres" label="7m" />
                  ) : (stat.sept_metres ?? 0) > 0 ? (
                    <span className="text-sm font-black font-sport italic text-secondary">
                      {stat.sept_metres}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/20 text-xs">-</span>
                  )}
                </TableCell>

                {/* Boutons d'édition */}
                {canEdit && (
                  <TableCell className="text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-500/10"
                          disabled={saving}
                          onClick={() => saveEdit(stat.id)}
                          title="Sauvegarder"
                        >
                          {saving ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                          disabled={saving}
                          onClick={cancelEdit}
                          title="Annuler"
                        >
                          <X size={13} />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 rounded-lg border-primary/30 text-primary/50 hover:text-primary hover:bg-primary/10 hover:border-primary opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => startEdit(stat)}
                        title="Modifier les statistiques"
                      >
                        <Pencil size={12} />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
