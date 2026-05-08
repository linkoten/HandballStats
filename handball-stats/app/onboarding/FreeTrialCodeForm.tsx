"use client";

import { useState } from "react";
import { redeemFreeTrialCode } from "@/app/actions/free-trial-actions";
import { Button } from "@/components/ui/button";
import { Ticket, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  onSuccess: () => void;
  onSkip?: () => void;
}

export default function FreeTrialCodeForm({ onSuccess, onSkip }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await redeemFreeTrialCode(code);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => onSuccess(), 1200);
      } else {
        setError(result.error || "Code invalide.");
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-bounce" />
        <p className="text-xl font-sport font-black italic text-emerald-700 uppercase">
          Free Trial activé !
        </p>
        <p className="text-sm text-muted-foreground">
          Vous avez <strong>30 jours</strong> pour découvrir la plateforme.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-secondary rounded-3xl p-8 text-secondary-foreground space-y-2 shadow-2xl">
        <div className="flex items-center gap-2 font-sport italic text-sm text-secondary-foreground/70">
          <Ticket size={16} /> FREE TRIAL
        </div>
        <h2 className="text-3xl font-sport font-black italic uppercase tracking-tighter">
          Saisir votre code{" "}
          <span className="text-primary">gratuit</span>
        </h2>
        <p className="text-secondary-foreground/70 text-sm">
          Accédez à 1 compétition pendant <strong>30 jours</strong>, sans
          engagement.
        </p>
      </div>

      {/* Ce que comprend le Free Trial */}
      <div className="bg-card border-2 border-border rounded-2xl p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Inclus dans le Free Trial
        </p>
        <ul className="space-y-1.5 text-sm">
          {[
            "1 club + 1 équipe",
            "1 compétition scrapée (données officielles FFHB)",
            "Accès aux matchs, stats joueurs, classements",
            "30 jours sans carte bancaire",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-muted-foreground">
            Code d'accès *
          </label>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 border-2 rounded-xl font-mono text-lg font-bold tracking-widest text-center focus:border-secondary outline-none transition-colors bg-background uppercase"
            placeholder="XXXXXXXXXXXXXX"
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-xl px-4 py-2">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full rounded-xl font-sport italic uppercase font-black text-base h-12"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin mr-2" />
          ) : (
            <Ticket size={16} className="mr-2" />
          )}
          Activer le Free Trial
        </Button>
      </form>

      {/* Lien vers les plans payants */}
      {onSkip && (
        <div className="text-center">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            J'ai déjà un abonnement payant →
          </button>
        </div>
      )}
    </div>
  );
}
