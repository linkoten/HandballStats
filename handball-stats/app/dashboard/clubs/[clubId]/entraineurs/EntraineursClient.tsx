"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Loader2, UserMinus, ArrowUpRight, Users } from "lucide-react";
import Link from "next/link";
import {
  removeEntraineurRole,
  promoteToAdmin,
} from "@/app/actions/entraineur-actions";

interface Member {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  subscription: string;
  createdAt: Date;
}

interface EntraineursClientProps {
  clubId: number;
  currentUserId: string;
  currentUserRole: string;
  initialMembers: Member[];
  maxEntraineurs: number;
  planKey: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN_CLUB: "Admin Club",
  ENTRAINEUR: "Entraîneur",
  UTILISATEUR: "Utilisateur",
  JOUEUR: "Joueur",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN_CLUB: "bg-purple-100 text-purple-700 border-purple-200",
  ENTRAINEUR: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function EntraineursClient({
  clubId,
  currentUserId,
  currentUserRole,
  initialMembers,
  maxEntraineurs,
  planKey,
}: EntraineursClientProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<{
    type: "remove" | "promote";
    memberId: string;
    memberName: string;
  } | null>(null);
  const router = useRouter();

  const isUnlimited = maxEntraineurs === -1;
  const coachCount = members.length;
  const isOverLimit = !isUnlimited && coachCount > maxEntraineurs;

  const handleRemove = (memberId: string) => {
    startTransition(async () => {
      const result = await removeEntraineurRole(memberId, clubId);
      if (result.success) {
        toast.success("L'entraîneur est maintenant Utilisateur");
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        setConfirmAction(null);
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors de la suppression du rôle");
        setConfirmAction(null);
      }
    });
  };

  const handlePromote = (memberId: string) => {
    startTransition(async () => {
      const result = await promoteToAdmin(memberId, clubId);
      if (result.success) {
        toast.success("L'utilisateur a été promu Admin Club");
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, role: "ADMIN_CLUB" } : m,
          ),
        );
        setConfirmAction(null);
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors de la promotion");
        setConfirmAction(null);
      }
    });
  };

  const fullName = (m: Member) =>
    [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email;

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-sport font-black uppercase italic tracking-tighter">
            Entraîneurs
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les entraîneurs et administrateurs de votre club
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="font-sport italic">
            ← Tableau de bord
          </Button>
        </Link>
      </div>

      {/* Quota card */}
      <Card
        className={`border-2 ${isOverLimit ? "border-red-400 bg-red-50" : "border-border"}`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-sport italic uppercase text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Quota d'entraîneurs — plan {planKey}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-sport font-black italic">
              {coachCount}
            </span>
            <span className="text-muted-foreground mb-1 font-bold">
              / {isUnlimited ? "∞" : maxEntraineurs}
            </span>
          </div>
          {!isUnlimited && (
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverLimit ? "bg-red-500" : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(100, (coachCount / Math.max(1, maxEntraineurs)) * 100)}%`,
                }}
              />
            </div>
          )}
          {isOverLimit && (
            <p className="text-red-600 text-sm font-semibold mt-2">
              ⚠ Vous dépassez la limite de votre plan. Retirez{" "}
              {coachCount - maxEntraineurs} entraîneur(s) ou{" "}
              <Link href="/pricing" className="underline">
                passez à un plan supérieur
              </Link>
              .
            </p>
          )}
          {!isOverLimit &&
            maxEntraineurs !== -1 &&
            coachCount >= maxEntraineurs && (
              <p className="text-amber-600 text-sm font-semibold mt-2">
                Quota atteint —{" "}
                <Link href="/pricing" className="underline">
                  passez à un plan supérieur
                </Link>{" "}
                pour ajouter des entraîneurs.
              </p>
            )}
        </CardContent>
      </Card>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="font-sport italic uppercase">
            Membres avec accès entraîneur
          </CardTitle>
          <CardDescription>
            Les utilisateurs listés ici ont le rôle ADMIN_CLUB ou ENTRAÎNEUR
            dans votre club.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">
              Aucun entraîneur dans ce club.
            </p>
          )}
          {members.map((member) => {
            const isSelf = member.id === currentUserId;
            const canRemove =
              !isSelf &&
              (member.role === "ENTRAINEUR" ||
                (member.role === "ADMIN_CLUB" &&
                  currentUserRole === "ADMIN_GENERAL"));
            const canPromote = !isSelf && member.role === "ENTRAINEUR";

            const isConfirming = confirmAction?.memberId === member.id;
            const isConfirmingRemove =
              isConfirming && confirmAction?.type === "remove";
            const isConfirmingPromote =
              isConfirming && confirmAction?.type === "promote";

            return (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border-2 border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-sport text-sm font-bold text-primary">
                    {(member.firstName?.[0] ?? member.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-tight flex items-center gap-2">
                      {fullName(member)}
                      {isSelf && (
                        <span className="text-xs text-muted-foreground font-normal">
                          (vous)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`font-sport text-xs ${ROLE_COLORS[member.role] ?? ""}`}
                  >
                    {member.role === "ADMIN_CLUB" && (
                      <Crown className="w-3 h-3 mr-1" />
                    )}
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Badge>

                  {/* Promouvoir en admin */}
                  {canPromote && (
                    <>
                      {isConfirmingPromote ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white font-sport italic text-xs"
                            onClick={() => handlePromote(member.id)}
                            disabled={isPending}
                          >
                            {isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Confirmer"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => setConfirmAction(null)}
                            disabled={isPending}
                          >
                            Annuler
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-sport italic text-xs border-purple-300 text-purple-600 hover:bg-purple-50"
                          disabled={isPending}
                          onClick={() =>
                            setConfirmAction({
                              type: "promote",
                              memberId: member.id,
                              memberName: fullName(member),
                            })
                          }
                        >
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                          Promouvoir Admin
                        </Button>
                      )}
                    </>
                  )}

                  {/* Retirer le rôle */}
                  {canRemove && (
                    <>
                      {isConfirmingRemove ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white font-sport italic text-xs"
                            onClick={() => handleRemove(member.id)}
                            disabled={isPending}
                          >
                            {isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Confirmer"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => setConfirmAction(null)}
                            disabled={isPending}
                          >
                            Annuler
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-sport italic text-xs border-red-300 text-red-600 hover:bg-red-50"
                          disabled={isPending}
                          onClick={() =>
                            setConfirmAction({
                              type: "remove",
                              memberId: member.id,
                              memberName: fullName(member),
                            })
                          }
                        >
                          <UserMinus className="w-3 h-3 mr-1" />
                          Retirer rôle
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
