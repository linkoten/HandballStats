import Link from "next/link";
import {
  Activity,
  BarChart3,
  Users,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  ChevronRight,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* === HERO === */}
      <section className="relative overflow-hidden">
        {/* Fond géométrique terrain */}
        <div className="absolute inset-0 bg-primary" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 60px, white 60px, white 61px), repeating-linear-gradient(90deg, transparent, transparent 60px, white 60px, white 61px)",
          }}
        />
        {/* Demi-cercle terrain */}
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] border-4 border-white/10 rounded-t-full" />

        <div className="relative z-10 container mx-auto px-6 py-24 md:py-36 text-center text-white">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Logo size={220} />
          </div>

          <h1 className="text-4xl md:text-6xl font-sport font-black italic uppercase tracking-tighter mb-6">
            Simplifiez <span className="text-secondary">votre saison</span>
          </h1>

          <p className="text-base md:text-lg text-white/80 max-w-xl mx-auto mb-12 leading-relaxed">
            La plateforme de statistiques dédiée aux clubs de handball. Suivez
            vos compétitions, analysez vos joueurs et pilotez votre saison en
            temps réel.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white font-sport italic uppercase text-lg px-10 py-6 transition-all"
              >
                Voir les tarifs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* === FEATURES === */}
      <section className="container mx-auto px-6 py-24 space-y-20">
        <div className="text-center space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-primary">
            Fonctionnalités
          </p>
          <h2 className="text-4xl md:text-5xl font-sport font-black italic uppercase tracking-tighter">
            Tout pour piloter votre <span className="text-primary">saison</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Activity,
              title: "Scraping automatique",
              desc: "Les résultats et classements FFHB sont récupérés automatiquement après chaque journée. Plus besoin de saisir les scores manuellement.",
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              icon: BarChart3,
              title: "Statistiques joueurs",
              desc: "Buts, tirs, 7m, exclusions, arrets… Analysez la performance individuelle de chaque joueur match par match et sur toute la saison.",
              color: "text-secondary",
              bg: "bg-secondary/10",
            },
            {
              icon: TrendingUp,
              title: "Suivi de progression",
              desc: "Définissez des objectifs pour vos joueurs et suivez leur évolution dans le temps. Comparez les performances entre saisons.",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              icon: Layers,
              title: "Multi-compétitions",
              desc: "Gérez plusieurs équipes et plusieurs compétitions simultanément. Chaque équipe a son propre espace de données.",
              color: "text-violet-600",
              bg: "bg-violet-50",
            },
            {
              icon: Users,
              title: "Accès équipe",
              desc: "Partagez l'accès à vos données avec vos entraîneurs et joueurs grâce à des codes d'accès dédiés.",
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              icon: Shield,
              title: "Données sécurisées",
              desc: "Vos données sont privées et accessibles uniquement par les membres de votre club. Aucune fuite vers d'autres clubs.",
              color: "text-slate-600",
              bg: "bg-slate-100",
            },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="bg-card border-2 border-border rounded-3xl p-7 space-y-4 hover:border-primary/40 hover:shadow-lg transition-all duration-300"
            >
              <div
                className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center`}
              >
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="text-xl font-sport font-black italic uppercase">
                {title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="bg-primary text-white">
        <div className="container mx-auto px-6 py-24">
          <div className="text-center space-y-3 mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-secondary">
              Comment ça marche
            </p>
            <h2 className="text-4xl md:text-5xl font-sport font-black italic uppercase tracking-tighter">
              Opérationnel en <span className="text-secondary">3 étapes</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Shield,
                title: "Choisissez un plan",
                desc: "Sélectionnez le plan adapté à votre club. Démarrez en essai gratuit pour le plan Starter.",
              },
              {
                step: "02",
                icon: Trophy,
                title: "Créez votre club",
                desc: "Ajoutez vos équipes et importez vos compétitions FFHB. Le scraping se lance automatiquement.",
              },
              {
                step: "03",
                icon: Target,
                title: "Analysez & partagez",
                desc: "Consultez vos stats, fixez des objectifs aux joueurs et invitez vos coachs avec un code d'accès.",
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="shrink-0">
                  <span className="text-5xl font-sport font-black italic text-white/20">
                    {step}
                  </span>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-secondary" />
                    <h3 className="text-xl font-sport font-black italic uppercase">
                      {title}
                    </h3>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <Logo size={80} />
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link
              href="/pricing"
              className="hover:text-foreground transition-colors"
            >
              Tarifs
            </Link>
            <Link
              href="/sign-in"
              className="hover:text-foreground transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/sign-up"
              className="hover:text-foreground transition-colors"
            >
              Inscription
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
