"use client";

import Link from "next/link";
import { Activity, BarChart3, Gauge, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in zoom-in duration-500">
          <div className="inline-flex items-center justify-center p-3 mb-6 rounded-full bg-primary/10 mb-6">
            <Trophy className="w-12 h-12 text-primary animate-bounce-slow" />
          </div>
          <h1 className="text-6xl md:text-8xl font-sport font-extrabold text-primary mb-4 tracking-tighter uppercase drop-shadow-sm">
            Handball Stats
          </h1>
          <p className="text-2xl font-sport uppercase text-muted-foreground tracking-wide">
            ASC Rennais - <span className="text-secondary">CourtSide Analytics</span>
          </p>
          <div className="mt-8 flex justify-center gap-6 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" /> Données Live
            </span>
            <span className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-secondary" /> Performance
            </span>
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Analytics
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center mt-12">
          <Link href="/dashboard">
            <Button size="lg" className="text-xl px-12 py-8 bg-primary text-primary-foreground hover:bg-primary/90 font-sport uppercase tracking-widest shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              Accéder au Dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
