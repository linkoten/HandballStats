"use client";

import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Trophy,
  Users,
  Calendar,
  Plus,
  Tally5,
  Activity,
  BarChart3,
  Settings,
} from "lucide-react";
import Link from "next/link";

type UserData = {
  subscription: string;
  role: string;
  tokensRemaining: number;
  tokensUsed: number;
  stripeCurrentPeriodEnd?: string | null;
};

type CompetitionAccess = {
  id: string;
  competitionId: number;
  tokenUsed: boolean;
  createdAt: string;
  competition: {
    id: number;
    nom: string;
    saison: string;
    equipe: {
      id: number;
      nom: string;
      club?: {
        nom: string;
      };
    };
  };
};

export default function DashboardPage() {
  const { user } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [competitions, setCompetitions] = useState<CompetitionAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubCodes, setClubCodes] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (userData && ["ADMIN_CLUB", "ADMIN_GENERAL"].includes(userData.role)) {
      fetchClubCodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.role]);

  async function fetchDashboardData() {
    try {
      const [userResponse, tokensResponse] = await Promise.all([
        fetch("/api/user/me"),
        fetch("/api/user/tokens"),
      ]);

      if (!userResponse.ok) {
        console.error("Erreur user API:", userResponse.status);
        return;
      }

      if (!tokensResponse.ok) {
        console.error("Erreur tokens API:", tokensResponse.status);
        return;
      }

      const userData = await userResponse.json();
      const tokensData = await tokensResponse.json();

      setUserData(userData);
      setCompetitions(tokensData.competitions || []);
    } catch (error) {
      console.error("Erreur chargement dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClubCodes() {
    try {
      const res = await fetch("/api/clubs/codes");
      if (!res.ok) return;
      const data = await res.json();
      setClubCodes(data.clubs || []);
    } catch {}
  }

  async function handleJoinClub() {
    setJoinLoading(true);
    setJoinError(null);
    setJoinSuccess(null);
    try {
      const res = await fetch("/api/clubs/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode, userId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || "Erreur inconnue");
      } else {
        setJoinSuccess(
          `Vous avez rejoint le club avec le rôle ${data.newRole}. Rafraîchissez la page.`,
        );
      }
    } catch (e) {
      setJoinError("Erreur réseau");
    } finally {
      setJoinLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isPremium = userData?.subscription === "PREMIUM";
  const tokensRemaining = userData?.tokensRemaining || 0;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-linear-to-r from-primary/90 to-secondary/90 text-primary-foreground p-8 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 font-sport text-9xl">
            🏆
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <h1 className="text-4xl font-sport font-extrabold uppercase tracking-tight">
                Bonjour, {user?.firstName || "Utilisateur"} 👋
              </h1>
              <p className="text-primary-foreground/80 mt-2 text-lg font-medium">
                Bienvenue sur votre tableau de bord
              </p>
            </div>
            {userData?.role && (
              <Badge className="bg-background/20 text-primary-foreground border-background/30 text-lg px-4 py-2 font-sport uppercase tracking-wide">
                {userData.role === "UTILISATEUR" && "👤 Utilisateur"}
                {userData.role === "ENTRAINEUR" && "🏆 Entraîneur"}
                {userData.role === "ADMIN_CLUB" && "👑 Admin Club"}
                {userData.role === "ADMIN_GENERAL" && "🔱 Admin Général"}
              </Badge>
            )}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/40 backdrop-blur-md border-l-4 border-l-secondary shadow-md hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Abonnement
              </CardTitle>
              <Trophy className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-sport font-black uppercase tracking-tighter text-secondary">
                {userData?.subscription || "GRATUIT"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {userData?.stripeCurrentPeriodEnd && (
                  <>
                    Expire le{" "}
                    {new Date(
                      userData.stripeCurrentPeriodEnd,
                    ).toLocaleDateString()}
                  </>
                )}
              </p>
              <Link href="/pricing" className="block mt-4">
                <Button
                  size="sm"
                  className="w-full font-sport uppercase tracking-wide bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  💎 Améliorer
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border-l-4 border-l-primary shadow-md hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Tokens disponibles
              </CardTitle>
              <Calendar className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-sport font-black uppercase tracking-tighter text-primary">
                {isPremium ? "∞" : tokensRemaining}
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-2 font-medium">
                {userData?.tokensUsed || 0} utilisés
              </p>
              {!isPremium && (
                <>
                  <Progress
                    value={
                      (tokensRemaining /
                        ((userData?.tokensUsed || 0) + tokensRemaining)) *
                      100
                    }
                    className="h-2 mb-2 bg-muted/50"
                  />
                  <Link href="/pricing#jetons" className="block mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs font-bold uppercase tracking-wide border-primary/20 hover:bg-primary/5 text-primary"
                    >
                      🪙 Acheter des tokens
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border-l-4 border-l-foreground shadow-md hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Compétitions suivies
              </CardTitle>
              <Users className="h-5 w-5 text-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-sport font-black uppercase tracking-tighter text-foreground">
                {competitions.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-2 font-medium">
                {isPremium
                  ? "Illimité"
                  : `sur ${tokensRemaining + competitions.length} disponibles`}
              </p>
              {!isPremium && (
                <Progress
                  value={
                    (competitions.length /
                      (tokensRemaining + competitions.length)) *
                    100
                  }
                  className="h-2 bg-muted/50"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation Rapide */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Équipes Card */}
          <Link
            href="/equipes"
            className="group relative flex flex-col justify-between bg-card/40 backdrop-blur-md rounded-lg border border-white/20 shadow-sm p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:bg-card/60 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-24 h-24 rotate-12" />
            </div>
            <div>
              <div className="text-primary mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-sport uppercase tracking-wide text-foreground mb-2 group-hover:text-primary transition-colors">
                Équipes
              </h2>
              <p className="text-muted-foreground text-sm font-medium">
                Consultez les effectifs et stats des joueurs.
              </p>
            </div>
            <div className="mt-4">
              <span className="inline-block text-xs font-sport uppercase tracking-wider text-primary border-b border-primary/20 group-hover:border-primary transition-all">
                Voir l'effectif →
              </span>
            </div>
          </Link>

          {/* Matchs Card */}
          <Link
            href="/matchs"
            className="group relative flex flex-col justify-between bg-card/40 backdrop-blur-md rounded-lg border border-white/20 shadow-sm p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:bg-card/60 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Tally5 className="w-24 h-24 rotate-12" />
            </div>
            <div>
              <div className="text-secondary mb-4">
                <Tally5 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-sport uppercase tracking-wide text-foreground mb-2 group-hover:text-secondary transition-colors">
                Matchs
              </h2>
              <p className="text-muted-foreground text-sm font-medium">
                Calendrier et résultats en direct.
              </p>
            </div>
            <div className="mt-4">
              <span className="inline-block text-xs font-sport uppercase tracking-wider text-secondary border-b border-secondary/20 group-hover:border-secondary transition-all">
                Voir les matchs →
              </span>
            </div>
          </Link>

          {/* Admin Card - Gestion des Joueurs */}
          {userData &&
            ["ENTRAINEUR", "ADMIN_CLUB", "ADMIN_GENERAL"].includes(
              userData.role,
            ) && (
              <Link
                href="/joueurs"
                className="group relative flex flex-col justify-between bg-card/40 backdrop-blur-md rounded-lg border border-white/20 shadow-sm p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:bg-card/60 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Settings className="w-24 h-24 rotate-12" />
                </div>
                <div>
                  <div className="text-purple-500 mb-4">
                    <Settings className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-sport uppercase tracking-wide text-foreground mb-2 group-hover:text-purple-500 transition-colors">
                    Gestion Joueurs
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium">
                    Gérer les postes et le statut des joueurs.
                  </p>
                </div>
                <div className="mt-4">
                  <span className="inline-block text-xs font-sport uppercase tracking-wider text-purple-500 border-b border-purple-500/20 group-hover:border-purple-500 transition-all">
                    Gérer l'effectif →
                  </span>
                </div>
              </Link>
            )}
        </div>

        {/* Équipes suivies */}
        <Card className="bg-card/40 backdrop-blur-md shadow-lg border border-border/50">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-sport uppercase tracking-wide text-foreground">
                  🏆 Mes compétitions
                </CardTitle>
                <CardDescription className="text-base mt-1 font-medium">
                  Équipes que vous suivez pour la saison 2024/2025
                </CardDescription>
              </div>
              {tokensRemaining > 0 && (
                <Link href="/onboarding/teams">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-sport uppercase tracking-wide">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une équipe
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {competitions.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed border-border/50">
                <Users className="mx-auto h-16 w-16 text-muted-foreground/50" />
                <h3 className="mt-4 text-xl font-bold font-sport uppercase tracking-wide text-foreground">
                  Aucune compétition suivie
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Commencez par ajouter des compétitions à suivre
                </p>
                <Link href="/onboarding/club">
                  <Button className="mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-sport uppercase tracking-wide">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter ma première compétition
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {competitions.map((access) => (
                    <Card
                      key={access.id}
                      className="hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/50 bg-card/40 backdrop-blur-md overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Trophy className="w-24 h-24 rotate-12" />
                      </div>
                      <CardContent className="p-6 relative z-10">
                        <div className="flex justify-between items-start mb-3">
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary font-bold border-primary/20 text-xs"
                          >
                            {access.competition.saison}
                          </Badge>
                          <Badge
                            variant={access.tokenUsed ? "default" : "outline"}
                            className={
                              access.tokenUsed
                                ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                                : "border-muted-foreground text-muted-foreground"
                            }
                          >
                            {access.tokenUsed ? "✓ Actif" : "Gratuit"}
                          </Badge>
                        </div>
                        <h3 className="font-sport font-extrabold text-xl mb-1 text-foreground uppercase tracking-wide leading-tight">
                          {access.competition.equipe.nom}
                        </h3>
                        <p className="text-sm text-foreground/80 mb-2 font-medium">
                          {access.competition.nom}
                        </p>
                        {access.competition.equipe.club && (
                          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wide">
                            📍 {access.competition.equipe.club.nom}
                          </p>
                        )}
                        <Link href={`/equipes/${access.competition.equipe.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full font-sport uppercase tracking-wide text-xs border-primary/20 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            Voir les statistiques →
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions rapides */}
        {tokensRemaining === 0 && !isPremium && (
          <Card className="border-2 border-orange-500/50 bg-orange-500/5 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-stripped-pattern opacity-5 pointer-events-none"></div>
            <CardHeader>
              <CardTitle className="text-orange-600 dark:text-orange-400 text-xl flex items-center gap-2 font-sport uppercase tracking-wide">
                ⚠️ Tokens épuisés
              </CardTitle>
              <CardDescription className="text-foreground/80 text-base font-medium">
                Vous avez utilisé tous vos tokens. Achetez des tokens
                supplémentaires pour suivre plus d'équipes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/pricing">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white font-sport uppercase tracking-wide">
                  💎 Acheter des tokens
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Affichage des codes clubs pour les admins */}
        {userData &&
          ["ADMIN_CLUB", "ADMIN_GENERAL"].includes(userData.role) && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl font-bold">
                  Codes d'accès clubs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left p-2">Club</th>
                        <th className="text-left p-2">Code Entraîneur</th>
                        <th className="text-left p-2">Code Joueur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clubCodes.map((club) => (
                        <tr key={club.id}>
                          <td className="p-2 font-bold">{club.nom}</td>
                          <td className="p-2 font-mono bg-primary/10 rounded">
                            {club.coachCode}
                          </td>
                          <td className="p-2 font-mono bg-secondary/10 rounded">
                            {club.playerCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Bloc rejoindre un club pour les utilisateurs */}
        {userData?.role === "UTILISATEUR" && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Rejoindre un club</CardTitle>
              <CardDescription>
                Entrez le code fourni par votre entraîneur ou club pour
                rejoindre et accéder aux statistiques.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleJoinClub();
                }}
                className="flex flex-col gap-4 max-w-md"
              >
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Code d'accès club"
                  className="border rounded px-3 py-2 text-lg"
                  required
                />
                <Button type="submit" disabled={joinLoading || !joinCode}>
                  {joinLoading ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    "Rejoindre"
                  )}
                </Button>
                {joinError && (
                  <div className="text-red-600 text-sm">{joinError}</div>
                )}
                {joinSuccess && (
                  <div className="text-green-600 text-sm">{joinSuccess}</div>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
