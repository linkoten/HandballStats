"use client";

import { useState } from "react";
import Link from "next/link";
import FreeTrialCodeForm from "./FreeTrialCodeForm";
import OnboardingClubForm from "./OnboardingClubForm";
import { ArrowRight } from "lucide-react";

export default function OnboardingWithFreeTrial() {
  const [step, setStep] = useState<"choice" | "freeTrial" | "club">("choice");

  if (step === "freeTrial") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-lg w-full">
          <FreeTrialCodeForm
            onSuccess={() => setStep("club")}
            onSkip={() => setStep("club")}
          />
        </div>
      </div>
    );
  }

  if (step === "club") {
    return <OnboardingClubForm fromCheckout={false} />;
  }

  // Étape "choice" : Free Trial ou plan payant
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="bg-primary rounded-3xl p-8 text-white space-y-2 shadow-2xl">
          <p className="text-secondary font-sport italic text-sm uppercase tracking-wider">
            Bienvenue
          </p>
          <h1 className="text-4xl font-sport font-black italic uppercase tracking-tighter">
            Comment voulez-vous <span className="text-secondary">commencer</span> ?
          </h1>
          <p className="text-white/70 text-sm">
            Essai gratuit 30 jours ou abonnement direct.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Option Free Trial */}
          <button
            onClick={() => setStep("freeTrial")}
            className="group bg-card border-2 border-secondary/40 hover:border-secondary rounded-2xl p-6 text-left transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-sport font-black italic uppercase text-lg">
                  Free Trial — 30 jours
                </p>
                <p className="text-sm text-muted-foreground">
                  1 compétition, sans carte bancaire.
                  <br />
                  <span className="text-secondary font-bold">
                    J'ai un code d'accès.
                  </span>
                </p>
              </div>
              <ArrowRight
                size={20}
                className="text-secondary mt-1 group-hover:translate-x-1 transition-transform shrink-0"
              />
            </div>
          </button>

          {/* Option abonnement payant */}
          <Link href="/pricing">
            <div className="group bg-card border-2 border-primary/30 hover:border-primary rounded-2xl p-6 cursor-pointer transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-sport font-black italic uppercase text-lg">
                    Choisir un plan
                  </p>
                  <p className="text-sm text-muted-foreground">
                    À partir de <strong>6€/mois</strong>. Accès complet, sans
                    limite de durée.
                  </p>
                </div>
                <ArrowRight
                  size={20}
                  className="text-primary mt-1 group-hover:translate-x-1 transition-transform shrink-0"
                />
              </div>
            </div>
          </Link>

          {/* Skip (si déjà abonné) */}
          <div className="text-center pt-1">
            <button
              onClick={() => setStep("club")}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              J'ai déjà un abonnement actif → créer mon club
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
