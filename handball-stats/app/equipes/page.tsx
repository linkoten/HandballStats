// app/equipes/page.tsx - Page listant toutes les équipes

import Link from "next/link";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
// import { useState } from "react";
import EquipesClientWrapper from "./EquipesClientWrapper";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function EquipesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Récupérer l'utilisateur
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    redirect("/sign-in");
  }

  // Récupérer les compétitions auxquelles l'utilisateur a accès
  const competitionAccess = await prisma.competitionAccess.findMany({
    where: { userId: user.id },
    include: {
      competition: {
        include: {
          equipe: true,
        },
      },
    },
  });

  // Extraire les équipes uniques depuis les compétitions
  const uniqueEquipeIds = new Set(
    competitionAccess.map((access) => access.competition.equipeId),
  );

  // Récupérer les équipes
  const equipes = await prisma.equipes.findMany({
    where: {
      id: { in: Array.from(uniqueEquipeIds) },
    },
    orderBy: { nom: "asc" },
  });

  // ...existing code...
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10 animate-in fade-in slide-in-from-top-5 duration-500">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-sport uppercase text-sm tracking-wide mb-6 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">
              ←
            </span>
            Retour à l'accueil
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <span className="text-3xl">👥</span>
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-sport font-extrabold uppercase tracking-tighter text-foreground">
                  Mes <span className="text-primary">Équipes</span>
                </h1>
                <p className="text-muted-foreground mt-2 font-medium">
                  <span className="font-bold text-primary">
                    {equipes.length}
                  </span>{" "}
                  équipe{equipes.length > 1 ? "s" : ""} avec accès
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des équipes */}
        {equipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipes.map((equipe) => (
              <Link
                key={equipe.id}
                href={`/equipes/${equipe.id}`}
                className="group relative bg-card/60 backdrop-blur-md border border-white/20 hover:border-primary/50 text-card-foreground rounded-lg p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="text-6xl font-sport opacity-20 text-primary">
                    #{equipe.id.toString().slice(-2)}
                  </span>
                </div>
                <Badge className="absolute top-4 right-4 bg-accent/20 text-accent font-sport uppercase tracking-wider border-accent/20">
                  Active
                </Badge>
                <div className="relative z-10">
                  <div className="text-primary mb-4 group-hover:scale-110 transition-transform origin-left">
                    <span className="text-4xl">🏐</span>
                  </div>
                  <h3 className="text-2xl font-sport uppercase tracking-wide mb-3 group-hover:text-primary transition-colors">
                    {equipe.nom}
                  </h3>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>📍</span>
                    <span className="font-medium uppercase tracking-wide text-sm">
                      {equipe.ville}
                    </span>
                  </div>
                </div>
                <div className="mt-6 border-t border-border/50 pt-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                  <span className="text-sm font-sport uppercase text-primary tracking-wider">
                    Voir les détails →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card/40 backdrop-blur-sm border border-dashed border-border rounded-xl">
            <div className="text-6xl mb-4 grayscale opacity-50">🏐</div>
            <h3 className="text-2xl font-sport uppercase text-foreground mb-2">
              Aucune équipe accessible
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Vous n'avez pas encore débloqué de compétitions ou d'équipes pour
              votre compte.
            </p>
            <Link
              href="/onboarding/club"
              className="inline-block px-8 py-4 bg-primary text-primary-foreground font-sport uppercase tracking-wider rounded-sm hover:-translate-y-1 transition-all shadow-lg hover:shadow-primary/30"
            >
              🚀 Débloquer une compétition
            </Link>
          </div>
        )}
        {/* Suppression du bouton scraping, déplacé vers la page des compétitions */}
      </div>
    </div>
  );

  // (Suppression de la logique client ici)
}

// (Suppression du composant client local, il est maintenant dans ScrapeEquipesButton.tsx)
