"use client";

import { useState, useTransition, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Trophy,
  Users,
  Calendar,
  Tally5,
  Activity,
  Settings,
  Zap,
  ChevronRight,
  Plus,
  UserPlus,
  Share2,
  Copy,
  Crown,
  Shield,
  CreditCard,
  ArrowUpRight,
  Sparkles,
  PersonStanding,
  KeyRound,
  BarChart3,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { getClubCodes, validateClubCode } from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AddEquipeModalButton } from "@/components/AddEquipeModalButton";
import RescrapeAllButton from "@/app/dashboard/clubs/[clubId]/competitions/RescrapeAllButton";

const PLAN_LABELS = {
  GRATUIT: "Gratuit",
  STARTER: "Starter",
  PRO: "Pro",
  CLUB: "Club",
  PREMIUM: "Premium",
} as const;

const PLAN_PRICES = {
  GRATUIT: "Gratuit",
  STARTER: "9 €/mois",
  PRO: "29 €/mois",
  CLUB: "59 €/mois",
  PREMIUM: "99 €/mois",
} as const;

const PLAN_MAX_TOKENS = {
  GRATUIT: 0,
  STARTER: 3,
  PRO: 10,
  CLUB: 25,
  PREMIUM: 999,
} as const;

const PLAN_MAX_ENTRAINEURS = {
  GRATUIT: 0,
  STARTER: 1,
  PRO: 3,
  CLUB: 10,
  PREMIUM: -1, // illimité
} as const;

export default function DashboardClient({
  initialUserData,
  initialTokensData,
  equipesData,
  coachCount,
}: any) {
  const { user } = useUser();
  const [userData, setUserData] = useState(initialUserData);
  const [competitions, setCompetitions] = useState(
    initialTokensData?.competitions || [],
  );
  const [clubCodes, setClubCodes] = useState<any>(null);
  const [joinCode, setJoinCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [portalLoading, setPortalLoading] = useState(false);
  const router = useRouter();

  const clubId = userData?.club?.id;
  const userRole = userData?.role;

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erreur portail de facturation");
      }
    } catch {
      toast.error("Erreur lors de l'ouverture du portail");
    } finally {
      setPortalLoading(false);
    }
  };

  // Récupérer les codes du club si l'utilisateur est admin_club
  useEffect(() => {
    if (userRole === "ADMIN_CLUB" && clubId) {
      loadClubCodes();
    }
  }, [userRole, clubId]);

  const loadClubCodes = async () => {
    const result = await getClubCodes();
    if (result.success && result.data?.clubs?.length > 0) {
      setClubCodes(result.data.clubs[0]); // Premier club de l'admin
    }
  };

  const handleJoinClub = async () => {
    if (!joinCode.trim()) {
      toast.error("Veuillez saisir un code");
      return;
    }

    startTransition(async () => {
      const result = await validateClubCode(joinCode);
      if (result.success) {
        toast.success("Club rejoint avec succès !");
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors de la validation du code");
      }
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`Code ${label} copié !`);
  };

  // Liens personnalisés selon le rôle
  const getDashboardLinks = () => {
    const baseLinks = [
      {
        href: clubId
          ? `/dashboard/clubs/${clubId}/equipes`
          : "/dashboard/equipes",
        icon: Users,
        color: "primary",
        label: "Équipes",
        desc: "Gérer l'effectif",
        roles: ["ADMIN_CLUB", "ADMIN_GENERAL", "ENTRAINEUR", "JOUEUR"],
      },
      {
        href: clubId
          ? `/dashboard/clubs/${clubId}/joueurs`
          : "/dashboard/joueurs",
        icon: Activity,
        color: "secondary",
        label: "Joueurs",
        desc: "Stats individuelles",
        roles: ["ADMIN_CLUB", "ADMIN_GENERAL", "ENTRAINEUR", "JOUEUR"],
      },
      {
        href: clubId
          ? `/dashboard/clubs/${clubId}/matchs`
          : "/dashboard/matchs",
        icon: Calendar,
        color: "accent",
        label: "Matchs",
        desc: "Calendrier & Scores",
        roles: ["ADMIN_CLUB", "ADMIN_GENERAL", "ENTRAINEUR", "JOUEUR"],
      },
      {
        href: clubId
          ? `/dashboard/clubs/${clubId}/competitions`
          : "/dashboard/competitions",
        icon: Trophy,
        color: "primary",
        label: "Compétitions",
        desc: "Classements officiels",
        roles: ["ADMIN_CLUB", "ADMIN_GENERAL", "ENTRAINEUR", "JOUEUR"],
      },
    ];

    // Lien gestion des joueurs pour les entraîneurs et les admins
    if (
      userRole === "ENTRAINEUR" ||
      userRole === "ADMIN_CLUB" ||
      userRole === "ADMIN_GENERAL"
    ) {
      baseLinks.splice(1, 0, {
        href: `/dashboard/clubs/${clubId}/joueurs/gestion`,
        icon: Settings,
        color: "secondary",
        label: "Gestion Joueurs",
        desc: "Gérer vos joueurs",
        roles: ["ENTRAINEUR", "ADMIN_CLUB", "ADMIN_GENERAL"],
      });
    }

    // Filtrer selon le rôle
    return baseLinks.filter((link) => link.roles.includes(userRole as string));
  };

  const DASHBOARD_LINKS = getDashboardLinks();

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-10 max-w-7xl mx-auto">
      {/* --- HERO SECTION TACTIQUE --- */}
      <section className="relative group overflow-hidden bg-primary rounded-[2rem] p-8 md:p-12 shadow-2xl border-b-8 border-secondary/50 transition-all">
        {/* Texte décoratif en arrière-plan */}
        <div className="absolute -bottom-6 -right-6 font-sport text-[10rem] md:text-[14rem] leading-none text-white/5 select-none uppercase italic font-black group-hover:text-secondary/10 transition-colors duration-700">
          Hand
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {userRole === "ADMIN_CLUB" && (
                <Badge className="bg-purple-600 text-white font-sport animate-pulse flex items-center gap-2">
                  <Crown className="w-3 h-3" /> ADMIN CLUB
                </Badge>
              )}
              {userRole === "ADMIN_GENERAL" && (
                <Badge className="bg-red-600 text-white font-sport animate-pulse flex items-center gap-2">
                  <Shield className="w-3 h-3" /> ADMIN GÉNÉRAL
                </Badge>
              )}
              {userRole === "ENTRAINEUR" && (
                <Badge className="bg-blue-600 text-white font-sport animate-pulse">
                  <Activity className="w-3 h-3 mr-1" /> ENTRAÎNEUR
                </Badge>
              )}
              {userRole === "JOUEUR" && (
                <Badge className="bg-green-600 text-white font-sport">
                  <Users className="w-3 h-3 mr-1" /> JOUEUR
                </Badge>
              )}
              {userRole === "UTILISATEUR" && (
                <Badge className="bg-gray-500 text-white font-sport">
                  <UserPlus className="w-3 h-3 mr-1" /> EN ATTENTE
                </Badge>
              )}
              <Badge className="bg-secondary text-secondary-foreground font-sport animate-bounce">
                <Zap className="w-3 h-3 mr-1 fill-current" /> ANALYSE EN DIRECT
              </Badge>
            </div>
            <h1 className="text-4xl md:text-7xl font-sport font-black uppercase italic tracking-tighter text-white leading-none">
              Hello,{" "}
              <span className="text-secondary drop-shadow-sm">
                {user?.firstName || "Coach"}
              </span>
            </h1>
            <p className="text-primary-foreground/80 font-medium text-lg max-w-xl border-l-2 border-secondary pl-4">
              {userData?.club?.nom || "Indépendant"} •{" "}
              {userData?.role?.replace("_", " ")}
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            {(userRole === "ADMIN_CLUB" || userRole === "ADMIN_GENERAL") &&
              clubId && (
                <RescrapeAllButton
                  clubId={Number(clubId)}
                  saison="2025-2026"
                  variant="outline"
                  className="w-full"
                />
              )}
          </div>
        </div>
      </section>

      {/* --- STATS GRID (Seulement pour ADMIN_CLUB et ADMIN_GENERAL) --- */}
      {(userRole === "ADMIN_CLUB" || userRole === "ADMIN_GENERAL") && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card Abonnement */}
          <div className="relative overflow-hidden bg-card border-2 border-border rounded-2xl p-6 shadow-sm hover:border-secondary transition-colors group flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <p className="font-sport italic text-muted-foreground uppercase text-sm">
                Abonnement
              </p>
              <CreditCard className="text-secondary group-hover:rotate-6 transition-transform" />
            </div>
            <div>
              <div className="text-3xl font-sport font-black uppercase italic">
                {PLAN_LABELS[
                  userData?.subscription as keyof typeof PLAN_LABELS
                ] ??
                  userData?.subscription ??
                  "GRATUIT"}
              </div>
              <div className="mt-1 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {PLAN_PRICES[
                  userData?.subscription as keyof typeof PLAN_PRICES
                ] ?? "Gratuit"}
              </div>
            </div>
            {userData?.stripeSubscriptionId ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl font-sport italic uppercase text-xs w-full"
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-3 w-3" />
                )}
                Gérer l'abonnement
              </Button>
            ) : (
              <Link href="/pricing">
                <Button
                  size="sm"
                  className="rounded-xl font-sport italic uppercase text-xs w-full"
                >
                  <ArrowUpRight className="mr-2 h-3 w-3" />
                  Choisir un plan
                </Button>
              </Link>
            )}
          </div>

          {/* Card Tokens avec Jauge de progression stylisée */}
          <div className="relative overflow-hidden bg-black text-white rounded-2xl p-6 shadow-xl group flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <p className="font-sport italic text-primary uppercase text-sm">
                Crédits Analyse
              </p>
              <Tally5 className="text-primary" />
            </div>
            <div className="text-5xl font-sport font-black italic text-primary">
              {userData?.subscription === "PREMIUM"
                ? "∞"
                : (userData?.tokensRemaining ?? 0)}
            </div>
            {userData?.subscription !== "PREMIUM" && (
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((userData?.tokensRemaining ?? 0) / Math.max(1, PLAN_MAX_TOKENS[userData?.subscription as keyof typeof PLAN_MAX_TOKENS] ?? 1)) * 100)}%`,
                  }}
                />
              </div>
            )}
            <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase">
              <span>{userData?.tokensUsed ?? 0} utilisés</span>
              {userData?.subscription !== "PREMIUM" && (
                <Link
                  href="/pricing"
                  className="hover:text-primary transition-colors"
                >
                  + Acheter des jetons
                </Link>
              )}
            </div>
          </div>

          {/* Card Compétitions */}
          <div className="relative overflow-hidden bg-secondary rounded-2xl p-6 shadow-xl text-secondary-foreground group">
            <div className="flex justify-between items-start">
              <p className="font-sport italic uppercase text-sm">Actives</p>
              <Activity className="text-black/50" />
            </div>
            <div className="mt-4 text-5xl font-sport font-black italic">
              {competitions.length}
            </div>
            <p className="text-xs font-bold uppercase mt-2">
              Ligues sous surveillance
            </p>
          </div>

          {/* Card Entraîneurs */}
          <div className="relative overflow-hidden bg-card border-2 border-border rounded-2xl p-6 shadow-sm hover:border-primary transition-colors group flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <p className="font-sport italic text-muted-foreground uppercase text-sm">
                Entraîneurs
              </p>
              <PersonStanding className="text-primary group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-3xl font-sport font-black uppercase italic">
                {coachCount ?? 0}
                <span className="text-base text-muted-foreground font-normal ml-1">
                  /
                  {PLAN_MAX_ENTRAINEURS[
                    userData?.subscription as keyof typeof PLAN_MAX_ENTRAINEURS
                  ] === -1
                    ? "∞"
                    : (PLAN_MAX_ENTRAINEURS[
                        userData?.subscription as keyof typeof PLAN_MAX_ENTRAINEURS
                      ] ?? 0)}
                </span>
              </div>
            </div>
            {clubId && (
              <Link href={`/dashboard/clubs/${clubId}/entraineurs`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl font-sport italic uppercase text-xs w-full"
                >
                  Gérer les entraîneurs
                </Button>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* --- QUICK ACTIONS (Dossiers Tactiques) --- */}
      {DASHBOARD_LINKS.length > 0 && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {DASHBOARD_LINKS.map((link) => (
            <Link href={link.href} key={link.label} className="group">
              <Card className="h-full border-2 border-transparent group-hover:border-primary group-hover:bg-primary/5 transition-all duration-300 overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 text-primary/5 group-hover:text-primary/10 transition-colors">
                  <link.icon size={100} />
                </div>
                <CardHeader className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    <link.icon size={24} />
                  </div>
                  <CardTitle className="font-sport italic uppercase text-base sm:text-xl group-hover:translate-x-1 transition-transform">
                    {link.label}
                  </CardTitle>
                  <CardDescription className="font-medium">
                    {link.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </section>
      )}

      {/* Section pour utilisateur sans club — remplacée dans MAIN CONTENT */}

      {/* --- MAIN CONTENT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Onboarding plein écran pour UTILISATEUR sans club ── */}
        {userRole === "UTILISATEUR" && !clubId && (
          <div className="lg:col-span-3 space-y-6">
            {/* Hero join */}
            <div className="relative overflow-hidden rounded-4xl border-2 border-primary/20 bg-card p-8 md:p-12 shadow-sm">
              {/* Déco fond */}
              <div className="absolute -bottom-8 -right-8 font-sport text-[12rem] leading-none text-primary/5 select-none uppercase italic font-black pointer-events-none">
                JOIN
              </div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                {/* Gauche : message + étapes */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest">
                      <KeyRound className="w-3.5 h-3.5" /> Code d'invitation requis
                    </div>
                    <h2 className="text-3xl md:text-5xl font-sport font-black uppercase italic tracking-tighter leading-none">
                      Rejoignez<br />
                      <span className="text-primary">votre club</span>
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-sm">
                      Votre président ou entraîneur dispose d'un code d'invitation. Saisissez-le pour accéder aux statistiques de votre équipe.
                    </p>
                  </div>
                  {/* Étapes */}
                  <div className="space-y-3">
                    {[
                      { num: 1, label: "Demandez le code à votre club", icon: UserPlus },
                      { num: 2, label: "Saisissez-le dans le formulaire", icon: KeyRound },
                      { num: 3, label: "Accédez à toutes les stats", icon: BarChart3 },
                    ].map(({ num, label, icon: Icon }) => (
                      <div key={num} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black shrink-0">
                          {num}
                        </div>
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Droite : formulaire */}
                <div className="bg-muted/40 border-2 border-border rounded-2xl p-6 space-y-5">
                  <div className="text-center space-y-1">
                    <p className="font-sport italic uppercase font-black text-lg">Entrez votre code</p>
                    <p className="text-xs text-muted-foreground">Format : CODE-XXXX</p>
                  </div>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-mono text-center text-xl uppercase tracking-[0.3em] font-bold focus:border-primary outline-none transition-colors"
                    placeholder="CODE-XXXX"
                    maxLength={12}
                  />
                  <Button
                    className="w-full font-sport italic uppercase text-sm h-11 rounded-xl"
                    onClick={handleJoinClub}
                    disabled={isPending || !joinCode.trim()}
                  >
                    {isPending ? (
                      <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Rejoindre le club
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Vous n'avez pas de code ?{" "}
                    <Link href="/pricing" className="text-primary font-bold hover:underline">
                      Créez votre propre club →
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Aperçu des fonctionnalités débloquées */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: BarChart3, label: "Statistiques",     desc: "Analyse complète de vos performances" },
                { icon: Users,     label: "Équipes",          desc: "Effectif, rôles et suivi" },
                { icon: Calendar,  label: "Matchs",           desc: "Résultats et feuilles de stats" },
                { icon: Trophy,    label: "Compétitions",     desc: "Classements et calendriers" },
              ].map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="rounded-2xl border-2 border-dashed border-border bg-muted/20 p-4 flex flex-col gap-2 opacity-60"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-sport italic uppercase font-black text-sm">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                  <div className="mt-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3" /> Débloqué après inscription
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Colonne Equipes */}
        {clubId && DASHBOARD_LINKS.length > 0 && (
          <div
            className={`space-y-6 ${userRole === "ENTRAINEUR" || userRole === "JOUEUR" ? "lg:col-span-3" : "lg:col-span-2"}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-3xl font-sport italic uppercase tracking-tighter flex items-center gap-3">
                <div className="w-2 h-8 bg-secondary" /> Mes Équipes
              </h2>

              {/* Boutons d'action pour admin_club seulement */}
              {(userRole === "ADMIN_CLUB" || userRole === "ADMIN_GENERAL") && (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/clubs/${clubId}/competitions/create-competition`}
                  >
                    <Button
                      variant="outline"
                      className="font-sport italic flex items-center gap-2 hover:bg-primary hover:text-white transition-colors shadow-sm border-2"
                    >
                      <Plus className="w-4 h-4" />
                      Créer Compétition
                    </Button>
                  </Link>

                  <div className="relative group">
                    <AddEquipeModalButton clubId={clubId} />
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4">
              {equipesData?.map((equipe: any) => (
                <div
                  key={equipe.id}
                  className="group flex items-center justify-between p-6 bg-card border-2 border-border rounded-2xl hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center font-sport text-2xl text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                      {equipe.nom.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold uppercase tracking-tight">
                        {equipe.nom}
                      </h3>
                      <p className="text-muted-foreground text-sm font-medium">
                        {equipe.ville} • {equipe.departement}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/clubs/${clubId}/equipes/${equipe.id}`}
                  >
                    <Button
                      variant="ghost"
                      className="group-hover:text-primary text-xs sm:text-sm px-2 sm:px-4"
                    >
                      Stats <ChevronRight className="ml-1 w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Colonne Latérale (1/3) - Seulement pour ADMIN_CLUB et UTILISATEUR avec club */}
        {(userRole === "ADMIN_CLUB" || (userRole === "UTILISATEUR" && clubId)) && (
          <div className="space-y-6">
            {/* Codes d'invitation pour admin_club */}
            {userRole === "ADMIN_CLUB" && clubCodes && (
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
                <CardHeader>
                  <CardTitle className="font-sport italic text-lg uppercase flex items-center gap-2 text-purple-700">
                    <Share2 className="w-5 h-5" />
                    Codes d'Invitation
                  </CardTitle>
                  <CardDescription>
                    Partagez ces codes pour inviter des membres à votre club
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Code Entraîneur */}
                  <div className="p-4 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-purple-600 uppercase">
                        Code Entraîneur
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(clubCodes.coachCode, "entraîneur")
                        }
                        className="text-purple-600 hover:bg-purple-100"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="font-mono text-lg font-bold bg-purple-50 p-3 rounded border-2 border-dashed border-purple-300 text-center">
                      {clubCodes.coachCode}
                    </div>
                  </div>

                  {/* Code Joueur */}
                  <div className="p-4 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-purple-600 uppercase">
                        Code Joueur
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(clubCodes.playerCode, "joueur")
                        }
                        className="text-purple-600 hover:bg-purple-100"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="font-mono text-lg font-bold bg-purple-50 p-3 rounded border-2 border-dashed border-purple-300 text-center">
                      {clubCodes.playerCode}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interface de rejoindre un club pour utilisateurs sans club */}
            {userRole === "UTILISATEUR" && (
              <Card className="bg-muted/50 border-dashed border-2">
                <CardHeader>
                  <CardTitle className="font-sport italic text-lg uppercase">
                    Rejoindre un club
                  </CardTitle>
                  <CardDescription>
                    Saisissez le code d'invitation que vous a donné votre club
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(e.target.value.toUpperCase())
                      }
                      className="bg-background border-2 border-border rounded-lg px-4 py-2 flex-1 font-mono text-center uppercase tracking-wider focus:border-primary outline-none transition-colors"
                      placeholder="CODE-XXXX"
                      maxLength={12}
                    />
                    <Button
                      className="font-sport italic min-w-[80px]"
                      onClick={handleJoinClub}
                      disabled={isPending || !joinCode.trim()}
                    >
                      {isPending ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        "VALIDER"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    💡 Demandez le code d'accès à votre président ou entraîneur
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Upgrade Banner - seulement pour ADMIN_CLUB sans PREMIUM */}
            {userRole === "ADMIN_CLUB" &&
              userData?.subscription !== "PREMIUM" && (
                <div className="bg-linear-to-br from-secondary to-orange-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                  <Sparkles className="absolute -right-2 -top-2 w-24 h-24 text-white/20 rotate-12" />
                  <h3 className="font-sport italic text-2xl uppercase leading-none">
                    {userData?.subscription === "GRATUIT" ? (
                      <>
                        Commencez
                        <br />
                        l'analyse
                      </>
                    ) : (
                      <>
                        Passez en
                        <br />
                        mode Pro
                      </>
                    )}
                  </h3>
                  <p className="mt-4 text-sm font-medium text-white/90 mb-6">
                    {userData?.subscription === "GRATUIT"
                      ? "Souscrivez à un plan pour débloquer le scraping et les statistiques avancées."
                      : "Analyses illimitées, export PDF et comparaisons de joueurs."}
                  </p>
                  {userData?.stripeSubscriptionId ? (
                    <Button
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className="w-full bg-white text-secondary hover:bg-black hover:text-white font-sport uppercase italic"
                    >
                      {portalLoading ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        "Gérer / Changer de plan"
                      )}
                    </Button>
                  ) : (
                    <Link href="/pricing" className="block w-full">
                      <Button className="w-full bg-white text-secondary hover:bg-black hover:text-white font-sport uppercase italic">
                        Découvrir l'offre
                      </Button>
                    </Link>
                  )}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
