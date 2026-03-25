"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";

const PLANS = [
  {
    id: "STARTER",
    name: "Starter",
    price: 9,
    priceAnnual: 90,
    tokens: 3,
    trial: true,
    features: [
      "3 jetons (= 3 compétitions scrapées)",
      "1 entraîneur dans le club",
      "Essai gratuit 14 jours",
      "Réallocation de jetons en août",
    ],
    popular: false,
  },
  {
    id: "PRO",
    name: "Pro",
    price: 29,
    priceAnnual: 290,
    tokens: 10,
    features: [
      "10 jetons (= 10 compétitions scrapées)",
      "3 entraîneurs dans le club",
      "Réallocation de jetons en août",
    ],
    popular: true,
  },
  {
    id: "CLUB",
    name: "Club",
    price: 59,
    priceAnnual: 590,
    tokens: 25,
    features: [
      "25 jetons (= 25 compétitions scrapées)",
      "10 entraîneurs dans le club",
      "Réallocation de jetons en août",
    ],
    popular: false,
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: 99,
    priceAnnual: 990,
    tokens: null,
    features: [
      "Jetons illimités",
      "Entraîneurs illimités",
      "Réallocation de jetons en août",
    ],
    popular: false,
  },
];

const TOKEN_PACKS = [
  {
    id: "SINGLE",
    name: "1 Jeton",
    price: 5,
    tokens: 1,
    savings: null,
  },
  {
    id: "PACK_3",
    name: "3 Jetons",
    price: 13,
    tokens: 3,
    savings: "13%",
    popular: true,
  },
  {
    id: "PACK_5",
    name: "5 Jetons",
    price: 20,
    tokens: 5,
    savings: "20%",
  },
];

export default function PricingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly",
  );

  const handleSubscribe = async (planId: string) => {
    if (!isLoaded || !user) {
      router.push("/sign-in?redirect_url=/pricing");
      return;
    }

    setLoading(planId);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: planId,
          interval: billingInterval === "yearly" ? "yearly" : "monthly",
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Pas d'URL de checkout");
      }
    } catch (error) {
      console.error("Erreur création checkout:", error);
      alert("Erreur lors de la création de la session de paiement");
      setLoading(null);
    }
  };

  const handleBuyTokens = async (packId: string) => {
    if (!isLoaded || !user) {
      router.push("/sign-in?redirect_url=/pricing");
      return;
    }

    setLoading(packId);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenPack: packId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Pas d'URL de checkout");
      }
    } catch (error) {
      console.error("Erreur création checkout:", error);
      alert("Erreur lors de la création de la session de paiement");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header avec gradient */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-5 duration-500 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-sport uppercase text-sm tracking-wide mb-8 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">
              ←
            </span>
            Retour à l'accueil
          </Link>

          <div className="flex flex-col items-center">
            <h1 className="text-4xl md:text-6xl font-sport font-extrabold uppercase tracking-tighter text-foreground mb-4">
              Choisissez votre <span className="text-secondary">plan</span>
            </h1>
            <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
              Gérez les statistiques de votre club de handball avec nos outils
              professionnels
            </p>
          </div>

          {/* Toggle mensuel/annuel amélioré */}
          <div className="flex items-center justify-center gap-3 mt-8 bg-card/60 backdrop-blur-md p-1.5 rounded-full border border-border/50 max-w-fit mx-auto">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-6 py-3 rounded-xl font-sport uppercase font-semibold text-sm tracking-wide transition-all duration-300 ${
                billingInterval === "monthly"
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-transparent text-muted-foreground hover:bg-muted/50"
              }`}
            >
              💳 Mensuel
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={`px-6 py-3 rounded-xl font-sport uppercase font-semibold text-sm tracking-wide transition-all duration-300 flex items-center gap-2 ${
                billingInterval === "yearly"
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-transparent text-muted-foreground hover:bg-muted/50"
              }`}
            >
              🎁 Annuel
              <span className="bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0.5 rounded-sm">
                -17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans d'abonnement avec nouveau design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-card/40 backdrop-blur-md overflow-hidden ${
                plan.popular
                  ? "border-2 border-secondary shadow-lg shadow-secondary/20"
                  : "border border-border/50 hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-secondary text-secondary-foreground text-xs font-sport uppercase tracking-wider font-bold px-3 py-1 rounded-bl-xl">
                    ⭐ Populaire
                  </div>
                </div>
              )}
              <CardHeader className="pb-4 relative z-10">
                <CardTitle className="text-3xl font-sport uppercase italic tracking-wide text-foreground">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-base font-medium">
                  {plan.tokens ? (
                    <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wide">
                      🎫 {plan.tokens} jetons
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-secondary/10 text-secondary px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wide">
                      ∞ Jetons illimités
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="mb-6 pb-6 border-b border-border/50">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-mono font-black tracking-tighter text-foreground">
                      {billingInterval === "monthly"
                        ? plan.price
                        : Math.round(plan.priceAnnual / 12)}
                    </span>
                    <span className="text-xl font-bold text-muted-foreground">
                      €
                    </span>
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      /mois
                    </span>
                  </div>
                  {billingInterval === "yearly" && (
                    <div className="text-xs font-bold uppercase tracking-wide text-secondary mt-2">
                      💰 {plan.priceAnnual}€ facturé annuellement
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <span className="text-primary mt-0.5">✓</span>
                      <span className="text-muted-foreground font-medium">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="relative z-10">
                <Button
                  className={`w-full font-sport uppercase tracking-wide text-sm py-6 transition-all duration-300 ${
                    plan.popular
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    <>🚀 Choisir ce plan</>
                  )}
                </Button>
              </CardFooter>
              <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent pointer-events-none" />
            </Card>
          ))}
        </div>

        {/* Jetons à la carte avec nouveau design */}
        <div id="jetons" className="border-t border-border/50 pt-16">
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="text-xs font-sport uppercase tracking-widest font-bold px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
                🎯 Achat à l'unité
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-sport uppercase italic tracking-wide text-foreground mb-4">
              Jetons à la <span className="text-primary">carte</span>
            </h2>
            <p className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto">
              Besoin de compétitions supplémentaires ? Achetez des jetons
              individuellement
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TOKEN_PACKS.map((pack) => (
              <Card
                key={pack.id}
                className={`relative transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-card/40 backdrop-blur-md overflow-hidden ${
                  pack.popular
                    ? "border-2 border-primary shadow-lg shadow-primary/20"
                    : "border border-border/50 hover:border-primary/50"
                }`}
              >
                {pack.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground text-xs font-sport uppercase tracking-wider font-bold px-3 py-1 rounded-bl-xl">
                      ⭐ Recommandé
                    </div>
                  </div>
                )}
                <CardHeader className="relative z-10">
                  <CardTitle className="text-2xl font-sport uppercase italic tracking-wide text-foreground">
                    {pack.name}
                  </CardTitle>
                  <CardDescription className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    📅 Valable jusqu'à fin de saison
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-mono font-black tracking-tighter text-foreground">
                        {pack.price}
                      </span>
                      <span className="text-xl font-bold text-muted-foreground">
                        €
                      </span>
                      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        /mois
                      </span>
                    </div>
                    {pack.savings && (
                      <span className="inline-block mt-2 text-xs font-bold uppercase tracking-wide bg-secondary/10 text-secondary px-2 py-1 rounded-sm">
                        💰 Économisez {pack.savings}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground font-medium">
                    🎫 {pack.tokens} compétition{pack.tokens > 1 ? "s" : ""}{" "}
                    supplémentaire{pack.tokens > 1 ? "s" : ""}
                  </p>
                </CardContent>
                <CardFooter className="relative z-10">
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-sport uppercase tracking-wide py-6 shadow-md transition-all duration-300"
                    onClick={() => handleBuyTokens(pack.id)}
                    disabled={loading === pack.id}
                  >
                    {loading === pack.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>🛒 Acheter maintenant</>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
