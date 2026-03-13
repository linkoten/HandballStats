import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/user-actions";
import { getClubSubscriptionStatus } from "@/lib/access-control";
import { SelectCompetitionsForm } from "./SelectCompetitionsForm";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, Infinity as InfinityIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ clubId: string }>;
}

export default async function ConfigureAccessPage({ params }: Props) {
  const { clubId } = await params;
  const clubIdNum = Number(clubId);

  const [currentUser, status] = await Promise.all([
    getCurrentUser(),
    getClubSubscriptionStatus(clubIdNum),
  ]);

  // Seul ADMIN_CLUB (et ADMIN_GENERAL) peut accéder
  if (
    currentUser?.role !== "ADMIN_CLUB" &&
    currentUser?.role !== "ADMIN_GENERAL"
  ) {
    redirect(`/dashboard/clubs/${clubId}/competitions`);
  }

  // Quota illimité → rien à configurer
  if (status.quota === -1) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <InfinityIcon className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-sport font-black italic uppercase">
            Accès illimité
          </h2>
          <p className="text-muted-foreground">
            Votre plan{" "}
            <span className="font-black uppercase">{status.subscription}</span>{" "}
            ne limite pas le nombre de compétitions accessibles.
          </p>
        </div>
        <Link href={`/dashboard/clubs/${clubId}/competitions`}>
          <Button variant="outline" className="font-sport italic uppercase">
            <ArrowLeft className="mr-2 w-4 h-4" /> Retour aux compétitions
          </Button>
        </Link>
      </div>
    );
  }

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
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href={`/dashboard/clubs/${clubId}/competitions`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} /> Retour aux compétitions
        </Link>
        <div className="flex items-center gap-2 text-primary font-sport italic text-sm">
          <Trophy size={16} className="fill-current" />
          GESTION DES ACCÈS
        </div>
        <h1 className="text-4xl font-sport font-black italic uppercase tracking-tighter">
          Compétitions <span className="text-primary">accessibles</span>
        </h1>
        <p className="text-muted-foreground">
          Votre quota est de{" "}
          <span className="font-black text-foreground">{status.quota}</span>{" "}
          compétition{status.quota !== 1 ? "s" : ""}. Sélectionnez celles
          visibles pour toute votre équipe (coachs et joueurs inclus).
        </p>
      </div>

      <SelectCompetitionsForm
        competitions={competitions}
        quota={status.quota}
        clubId={clubIdNum}
      />

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
  );
}
