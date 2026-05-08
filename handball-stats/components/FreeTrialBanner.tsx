"use client";

import Link from "next/link";
import { Clock, ArrowUpRight, X } from "lucide-react";
import { useState } from "react";

interface Props {
  daysRemaining: number;
  expiresAt: Date | null;
}

export function FreeTrialBanner({ daysRemaining, expiresAt }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const isUrgent = daysRemaining <= 7;
  const isExpired = daysRemaining <= 0;

  if (isExpired) return null;

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <div
      className={`relative flex items-center justify-between gap-4 rounded-2xl px-5 py-3 border-2 text-sm font-medium ${
        isUrgent
          ? "bg-destructive/10 border-destructive/40 text-destructive"
          : "bg-secondary/10 border-secondary/40 text-secondary-foreground"
      }`}
    >
      <div className="flex items-center gap-3">
        <Clock
          size={16}
          className={isUrgent ? "text-destructive shrink-0" : "text-secondary shrink-0"}
        />
        <span>
          {isUrgent ? (
            <>
              <strong>Plus que {daysRemaining} jour{daysRemaining > 1 ? "s" : ""}</strong> sur votre Free Trial
              {expiryLabel && (
                <span className="text-xs ml-1 opacity-70">
                  (expire le {expiryLabel})
                </span>
              )}
              &nbsp;— après expiration, votre compétition sera supprimée.
            </>
          ) : (
            <>
              Free Trial actif —{" "}
              <strong>
                {daysRemaining} jours restants
              </strong>
              {expiryLabel && (
                <span className="text-xs ml-1 opacity-70">
                  (jusqu'au {expiryLabel})
                </span>
              )}
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/pricing"
          className={`flex items-center gap-1 font-sport italic uppercase text-xs font-black px-3 py-1.5 rounded-xl transition-colors ${
            isUrgent
              ? "bg-destructive text-white hover:bg-destructive/90"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
          }`}
        >
          Passer à un plan
          <ArrowUpRight size={12} />
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg"
          title="Masquer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
