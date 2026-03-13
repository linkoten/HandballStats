import { getCurrentUser } from "@/app/actions/user-actions";
import { getClubSubscriptionStatus } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { SelectCompetitionsForm } from "./configure-access/SelectCompetitionsForm";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, Calendar, Settings2, Trophy } from "lucide-react";
import Link from "next/link";

interface Props {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}

export default async function ClubLayout({ children, params }: Props) {
  const { clubId } = await params;
  const clubIdNum = Number(clubId);

  const currentUser = await getCurrentUser();

  // ADMIN_GENERAL : accès total sans vérification d'abonnement
  if (currentUser?.role === "ADMIN_GENERAL") {
    return <>{children}</>;
  }

  const status = await getClubSubscriptionStatus(clubIdNum);

  // ── 1. ABONNEMENT EXPIRÉ ────────────────────────────────────────────
  if (!status.isActive) {
    const expiredDate = status.periodEnd
      ? status.periodEnd.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-12 h-12 text-red-500" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-sport font-black italic uppercase tracking-tighter">
              Accès suspendu
            </h1>
            <p className="text-muted-foreground text-lg">
              L'abonnement de ce club a expiré
              {expiredDate ? (
                <>
                  {" "}
                  le{" "}
                  <span className="font-semibold text-foreground">
                    {expiredDate}
                  </span>
                </>
              ) : null}
              .
            </p>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Toutes vos données (matchs, joueurs, statistiques) sont
              conservées. Réabonnez-vous pour y accéder à nouveau.
            </p>
          </div>
          {expiredDate && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-2xl px-4 py-3 mx-auto w-fit">
              <Calendar className="w-4 h-4" />
              <span>Accès expiré le {expiredDate}</span>
            </div>
          )}
          {currentUser?.role === "ADMIN_CLUB" && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/pricing">
                <Button className="font-sport italic uppercase px-8">
                  <CreditCard className="mr-2 w-4 h-4" />
                  Choisir un plan
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="font-sport italic uppercase"
                >
                  Tableau de bord
                </Button>
              </Link>
            </div>
          )}
          {currentUser?.role !== "ADMIN_CLUB" && (
            <p className="text-sm text-muted-foreground">
              Contactez l'administrateur de votre club pour renouveler
              l'abonnement.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── 2. SÉLECTION MANUELLE REQUISE (downgrade) ───────────────────────
  if (status.selectionPending) {
    // Membres (coach/joueur) : attente de configuration
    if (currentUser?.role !== "ADMIN_CLUB") {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Settings2 className="w-10 h-10 text-muted-foreground animate-spin-slow" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-sport font-black italic uppercase tracking-tighter">
                Configuration en cours
              </h2>
              <p className="text-muted-foreground">
                L'administrateur du club finalise la configuration des accès
                suite à un changement d'abonnement.
              </p>
              <p className="text-sm text-muted-foreground">
                Revenez dans quelques instants.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // ADMIN_CLUB : affiche le formulaire de sélection
    const competitionsData = await prisma.competition.findMany({
      where: { equipe: { clubId: clubIdNum } },
      select: {
        id: true,
        nom: true,
        saison: true,
        isPinned: true,
        equipe: { select: { nom: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const competitions = competitionsData.map((c) => ({
      id: c.id,
      nom: c.nom,
      saison: c.saison,
      equipeNom: c.equipe.nom,
      isPinned: c.isPinned,
    }));

    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary font-sport italic text-sm">
              <Trophy size={16} className="fill-current" />
              CONFIGURATION REQUISE
            </div>
            <h1 className="text-4xl font-sport font-black italic uppercase tracking-tighter">
              Choisissez vos <span className="text-primary">compétitions</span>
            </h1>
            <p className="text-muted-foreground">
              Suite à votre changement de plan, votre quota est désormais de{" "}
              <span className="font-black text-foreground">{status.quota}</span>{" "}
              compétition{status.quota !== 1 ? "s" : ""}. Sélectionnez celles
              que vous souhaitez conserver accessibles pour votre équipe.
            </p>
            <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">
              Les membres du club (coachs, joueurs) n'ont accès à aucune donnée
              tant que cette configuration n'est pas terminée.
            </p>
          </div>

          {/* Formulaire */}
          <SelectCompetitionsForm
            competitions={competitions}
            quota={status.quota}
            clubId={clubIdNum}
          />

          {/* Lien upgrade */}
          <p className="text-sm text-muted-foreground text-center">
            Besoin de plus de compétitions ?{" "}
            <Link
              href="/pricing"
              className="text-primary font-bold hover:underline"
            >
              Passez à un plan supérieur
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── 3. ACCÈS NORMAL ─────────────────────────────────────────────────
  return <>{children}</>;
}
