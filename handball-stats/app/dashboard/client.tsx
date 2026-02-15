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
import {
  getClubCodes,
  validateClubCode,
  addTokensToUser,
  getUserTokens,
  getUserProfile,
} from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

type ClubCode = {
  id: string;
  code: string;
  role: string;
  utilisations: number;
  maxUtilisations: number;
  club: {
    nom: string;
  };
};

interface DashboardClientProps {
  initialUserData: UserData | null;
  initialTokensData: { competitions: CompetitionAccess[] } | null;
  error?: string;
}

export default function DashboardClient({
  initialUserData,
  initialTokensData,
  error,
}: DashboardClientProps) {
  const { user } = useUser();
  const [userData, setUserData] = useState<UserData | null>(initialUserData);
  const [competitions, setCompetitions] = useState<CompetitionAccess[]>(
    initialTokensData?.competitions || [],
  );
  const [clubCodes, setClubCodes] = useState<ClubCode[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Charger les codes club si admin
  useEffect(() => {
    if (userData && ["ADMIN_CLUB", "ADMIN_GENERAL"].includes(userData.role)) {
      handleFetchClubCodes();
    }
  }, [userData?.role]);

  async function handleRefreshData() {
    startTransition(async () => {
      try {
        const [userResult, tokensResult] = await Promise.allSettled([
          getUserProfile(),
          getUserTokens(),
        ]);

        if (userResult.status === "fulfilled" && userResult.value.success) {
          setUserData(userResult.value.data);
        }

        if (tokensResult.status === "fulfilled" && tokensResult.value.success) {
          setCompetitions(tokensResult.value.data.competitions || []);
        }

        toast.success("Données actualisées");
      } catch (error) {
        console.error("Erreur refresh:", error);
        toast.error("Erreur lors de l'actualisation");
      }
    });
  }

  async function handleFetchClubCodes() {
    startTransition(async () => {
      try {
        const result = await getClubCodes();
        if (result.success) {
          setClubCodes(result.data || []);
        }
      } catch (error) {
        console.error("Erreur codes club:", error);
      }
    });
  }

  async function handleJoinClub() {
    if (!joinCode.trim() || !user?.id) return;

    startTransition(async () => {
      setJoinError(null);
      setJoinSuccess(null);

      try {
        const result = await validateClubCode(joinCode.trim());

        if (result.success) {
          setJoinSuccess(
            `Vous avez rejoint le club avec le rôle ${result.data?.newRole}. Actualisation en cours...`,
          );
          setJoinCode("");

          // Rafraîchir les données
          setTimeout(() => {
            router.refresh();
          }, 1500);
        } else {
          setJoinError(result.error || "Erreur lors de l'adhésion au club");
        }
      } catch (error) {
        console.error("Erreur rejoindre club:", error);
        setJoinError("Erreur réseau lors de l'adhésion");
      }
    });
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefreshData} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isPremium = userData.subscription === "PREMIUM";
  const tokensRemaining = userData.tokensRemaining || 0;

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
            <div className="flex gap-2">
              {userData.role && (
                <Badge className="bg-background/20 text-primary-foreground border-background/30 text-lg px-4 py-2 font-sport uppercase tracking-wide">
                  {userData.role === "UTILISATEUR" && "👤 Utilisateur"}
                  {userData.role === "ENTRAINEUR" && "🏆 Entraîneur"}
                  {userData.role === "ADMIN_CLUB" && "👑 Admin Club"}
                  {userData.role === "ADMIN_GENERAL" && "🔱 Admin Général"}
                </Badge>
              )}
              <Button
                onClick={handleRefreshData}
                disabled={isPending}
                variant="secondary"
                size="sm"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualiser
              </Button>
            </div>
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
                {userData.subscription || "GRATUIT"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {userData.stripeCurrentPeriodEnd && (
                  <>
                    Expire le{" "}
                    {new Date(
                      userData.stripeCurrentPeriodEnd,
                    ).toLocaleDateString()}
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border-l-4 border-l-primary shadow-md hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Tokens
              </CardTitle>
              <Tally5 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-sport font-black tracking-tighter text-primary">
                {tokensRemaining}
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2.5 mt-3">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((tokensRemaining / 10) * 100, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Utilisés: {userData.tokensUsed || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border-l-4 border-l-accent shadow-md hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Compétitions
              </CardTitle>
              <Trophy className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-sport font-black tracking-tighter text-accent">
                {competitions.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Accès actifs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/competitions">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40">
              <CardHeader className="text-center">
                <Trophy className="h-8 w-8 mx-auto text-primary mb-2" />
                <CardTitle className="text-primary font-sport uppercase">
                  Compétitions
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/equipes">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20 hover:border-secondary/40">
              <CardHeader className="text-center">
                <Users className="h-8 w-8 mx-auto text-secondary mb-2" />
                <CardTitle className="text-secondary font-sport uppercase">
                  Équipes
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/joueurs">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:border-accent/40">
              <CardHeader className="text-center">
                <Activity className="h-8 w-8 mx-auto text-accent mb-2" />
                <CardTitle className="text-accent font-sport uppercase">
                  Joueurs
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/matchs">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-muted-foreground/10 to-muted-foreground/5 border-muted-foreground/20 hover:border-muted-foreground/40">
              <CardHeader className="text-center">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <CardTitle className="text-muted-foreground font-sport uppercase">
                  Matchs
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Compétitions accessibles */}
        {competitions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-sport uppercase tracking-wide">
                <Trophy className="h-5 w-5 text-primary" />
                Mes Compétitions
              </CardTitle>
              <CardDescription>
                Compétitions auxquelles vous avez accès
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {competitions.map((access) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold font-sport uppercase text-sm">
                        {access.competition.nom}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {access.competition.equipe.nom}
                        {access.competition.equipe.club?.nom && (
                          <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                            {access.competition.equipe.club.nom}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Saison {access.competition.saison}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={access.tokenUsed ? "default" : "outline"}>
                        {access.tokenUsed ? "Token utilisé" : "Gratuit"}
                      </Badge>
                      <Link href={`/competitions/${access.competition.id}`}>
                        <Button size="sm" variant="outline">
                          Voir
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Code d'adhésion club (toujours visible) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sport uppercase tracking-wide">
              <Users className="h-5 w-5 text-secondary" />
              Rejoindre un Club
            </CardTitle>
            <CardDescription>
              Entrez le code fourni par votre club pour le rejoindre
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Code du club"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
                disabled={isPending}
              />
              <Button
                onClick={handleJoinClub}
                disabled={!joinCode.trim() || isPending}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Rejoindre
              </Button>
            </div>
            {joinError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {joinError}
              </p>
            )}
            {joinSuccess && (
              <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
                {joinSuccess}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Codes club (pour admins) */}
        {userData.role &&
          ["ADMIN_CLUB", "ADMIN_GENERAL"].includes(userData.role) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-sport uppercase tracking-wide">
                  <Settings className="h-5 w-5 text-primary" />
                  Gestion des Codes Club
                </CardTitle>
                <CardDescription>
                  Codes d'accès générés pour vos clubs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={handleFetchClubCodes}
                    disabled={isPending}
                    variant="outline"
                  >
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Actualiser les codes
                  </Button>

                  {clubCodes.length > 0 && (
                    <div className="grid gap-4">
                      {clubCodes.map((clubCode) => (
                        <div
                          key={clubCode.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <h3 className="font-semibold font-sport uppercase text-sm">
                              {clubCode.club.nom}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Rôle accordé: {clubCode.role}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Utilisations: {clubCode.utilisations}/
                              {clubCode.maxUtilisations}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg font-bold bg-muted px-3 py-1 rounded">
                              {clubCode.code}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Actions premium */}
        {!isPremium && (
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800 font-sport uppercase tracking-wide">
                <Trophy className="h-5 w-5" />
                Passer à Premium
              </CardTitle>
              <CardDescription className="text-amber-700">
                Débloquez toutes les fonctionnalités avancées
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-amber-800">
                  <BarChart3 className="h-4 w-4" />
                  Statistiques avancées
                </div>
                <div className="flex items-center gap-2 text-amber-800">
                  <Users className="h-4 w-4" />
                  Gestion multi-équipes
                </div>
                <div className="flex items-center gap-2 text-amber-800">
                  <Trophy className="h-4 w-4" />
                  Analyses de performance
                </div>
                <div className="flex items-center gap-2 text-amber-800">
                  <Calendar className="h-4 w-4" />
                  Planification avancée
                </div>
              </div>
              <Link href="/pricing">
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-sport uppercase tracking-wide">
                  Découvrir Premium →
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
