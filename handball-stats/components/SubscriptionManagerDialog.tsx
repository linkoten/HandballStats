"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  cancelSubscriptionAtPeriodEnd,
  changeSubscriptionPlan,
  getSubscriptionStatus,
  previewSubscriptionChange,
  resumeSubscription,
} from "@/app/actions/subscription-actions";

type BillingCycle = "monthly" | "yearly";

const PLAN_CATALOG = [
  {
    key: "STARTER",
    name: "Starter",
    priceMonthly: 9,
    priceYearly: 90,
    tokens: 3,
    features: ["3 jetons", "1 entraîneur", "Essai gratuit 14 jours"],
  },
  {
    key: "PRO",
    name: "Pro",
    priceMonthly: 29,
    priceYearly: 290,
    tokens: 10,
    features: ["10 jetons", "3 entraîneurs", "Support prioritaire"],
  },
  {
    key: "CLUB",
    name: "Club",
    priceMonthly: 59,
    priceYearly: 590,
    tokens: 25,
    features: ["25 jetons", "10 entraîneurs", "Support prioritaire"],
  },
  {
    key: "PREMIUM",
    name: "Premium",
    priceMonthly: 99,
    priceYearly: 990,
    tokens: -1,
    features: ["Jetons illimités", "Entraîneurs illimités", "Support dédié"],
  },
] as const;

interface SubscriptionStatus {
  planKey: string | null;
  cycle: BillingCycle;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number;
}

interface PreviewData {
  currency: string;
  amountDue: number;
  nextPaymentDate: number;
  lines: { description: string; amount: number }[];
}

export function SubscriptionManagerDialog({
  open,
  onOpenChange,
  onChanged,
  onOpenBillingPortal,
  billingPortalLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onOpenBillingPortal: () => void;
  billingPortalLoading: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [previewPlanKey, setPreviewPlanKey] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirmCancel(false);
      return;
    }
    setLoading(true);
    getSubscriptionStatus().then((res) => {
      if (res.success) {
        setStatus(res.data ?? null);
        if (res.data?.cycle) setCycle(res.data.cycle);
      } else {
        toast.error(res.error || "Erreur de chargement de l'abonnement");
      }
      setLoading(false);
    });
  }, [open]);

  const handleSelectPlan = (planKey: string) => {
    setPreviewPlanKey(planKey);
    setPreview(null);
    setPreviewLoading(true);
    previewSubscriptionChange(planKey, cycle).then((res) => {
      setPreviewLoading(false);
      if (res.success && res.data) {
        setPreview(res.data);
      } else {
        toast.error(res.error || "Erreur lors du calcul de la prévisualisation");
        setPreviewPlanKey(null);
      }
    });
  };

  const handleChangePlan = (planKey: string) => {
    setPendingAction(planKey);
    startTransition(async () => {
      const res = await changeSubscriptionPlan(planKey, cycle);
      if (res.success) {
        toast.success(`Abonnement passé au plan ${planKey}`);
        onChanged();
        onOpenChange(false);
      } else {
        toast.error(res.error || "Erreur lors du changement de plan");
      }
      setPendingAction(null);
      setPreviewPlanKey(null);
      setPreview(null);
    });
  };

  const handleCancel = () => {
    setPendingAction("cancel");
    startTransition(async () => {
      const res = await cancelSubscriptionAtPeriodEnd();
      if (res.success) {
        toast.success(
          res.data?.isTrial
            ? "Résiliation confirmée : vous ne serez pas facturé. Votre accès se termine à la fin de l'essai."
            : "Résiliation programmée en fin de période",
        );
        onChanged();
        setConfirmCancel(false);
        onOpenChange(false);
      } else {
        toast.error(res.error || "Erreur lors de la résiliation");
      }
      setPendingAction(null);
    });
  };

  const handleResume = () => {
    setPendingAction("resume");
    startTransition(async () => {
      const res = await resumeSubscription();
      if (res.success) {
        toast.success("Résiliation annulée, votre abonnement continue");
        onChanged();
        onOpenChange(false);
      } else {
        toast.error(res.error || "Erreur lors de l'annulation");
      }
      setPendingAction(null);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-sport italic uppercase">
            Gérer mon abonnement
          </DialogTitle>
          <DialogDescription>
            Changez de plan ou résiliez votre abonnement directement, sans
            quitter l'application.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : !status ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucun abonnement actif. Choisissez un plan depuis la page tarifs.
          </p>
        ) : (
          <div className="space-y-6">
            {status.cancelAtPeriodEnd && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3">
                <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <ShieldAlert size={16} className="shrink-0" />
                  {status.status === "trialing" ? (
                    <>
                      Résiliation confirmée, essai gratuit jusqu'au{" "}
                      {new Date(status.currentPeriodEnd).toLocaleDateString(
                        "fr-FR",
                      )}
                      . Vous ne serez pas facturé.
                    </>
                  ) : (
                    <>
                      Résiliation prévue le{" "}
                      {new Date(status.currentPeriodEnd).toLocaleDateString(
                        "fr-FR",
                      )}
                      . Vous gardez l'accès jusqu'à cette date.
                    </>
                  )}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResume}
                  disabled={isPending}
                  className="rounded-xl font-bold uppercase text-xs shrink-0"
                >
                  {pendingAction === "resume" && (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  )}
                  Annuler la résiliation
                </Button>
              </div>
            )}

            {/* Toggle mensuel / annuel */}
            <div className="flex items-center justify-center gap-2 bg-muted/50 p-1 rounded-full max-w-fit mx-auto">
              {(["monthly", "yearly"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={cn(
                    "px-4 py-1.5 rounded-full font-sport uppercase text-xs tracking-wide transition-all",
                    cycle === c
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {c === "monthly" ? "Mensuel" : "Annuel (-17%)"}
                </button>
              ))}
            </div>

            {/* Confirmation avec prévisualisation du montant facturé */}
            {previewPlanKey && preview && (
              <div className="border-2 border-primary rounded-2xl p-4 space-y-3 bg-primary/5">
                <p className="text-sm font-bold">
                  Passage au plan{" "}
                  {
                    PLAN_CATALOG.find((p) => p.key === previewPlanKey)?.name
                  }{" "}
                  :
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {preview.lines.map((line, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>{line.description}</span>
                      <span className="shrink-0 font-medium">
                        {line.amount >= 0 ? "" : "-"}
                        {Math.abs(line.amount).toFixed(2)}
                        {preview.currency.toUpperCase() === "EUR" ? "€" : ` ${preview.currency.toUpperCase()}`}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between items-center border-t border-primary/20 pt-2">
                  <span className="text-sm font-bold">
                    Total à payer le{" "}
                    {new Date(preview.nextPaymentDate).toLocaleDateString(
                      "fr-FR",
                    )}
                  </span>
                  <span className="text-lg font-sport font-black">
                    {preview.amountDue.toFixed(2)}
                    {preview.currency.toUpperCase() === "EUR" ? "€" : ` ${preview.currency.toUpperCase()}`}
                  </span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setPreviewPlanKey(null);
                      setPreview(null);
                    }}
                    disabled={isPending}
                    className="rounded-xl font-bold uppercase text-xs"
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleChangePlan(previewPlanKey)}
                    disabled={isPending}
                    className="rounded-xl font-bold uppercase text-xs"
                  >
                    {pendingAction === previewPlanKey && (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    )}
                    Confirmer le changement
                  </Button>
                </div>
              </div>
            )}

            {/* Plans */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLAN_CATALOG.map((plan) => {
                const isCurrent =
                  plan.key === status.planKey && cycle === status.cycle;
                const price =
                  cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
                return (
                  <div
                    key={plan.key}
                    className={cn(
                      "rounded-2xl border-2 p-4 flex flex-col gap-2",
                      isCurrent
                        ? "border-primary bg-primary/5"
                        : "border-border",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-sport italic uppercase font-black">
                        {plan.name}
                      </span>
                      {isCurrent && (
                        <Badge className="bg-primary text-primary-foreground text-[10px]">
                          Plan actuel
                        </Badge>
                      )}
                    </div>
                    <div className="text-2xl font-sport font-black">
                      {price}€
                      <span className="text-xs font-medium text-muted-foreground">
                        /{cycle === "yearly" ? "an" : "mois"}
                      </span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5">
                          <Check size={12} className="text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || isPending || previewLoading || !!previewPlanKey}
                      onClick={() => handleSelectPlan(plan.key)}
                      className="rounded-xl font-sport italic uppercase text-xs mt-1"
                    >
                      {previewPlanKey === plan.key && previewLoading ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : isCurrent ? (
                        "Plan actuel"
                      ) : (
                        <>
                          <Sparkles className="mr-1.5 h-3 w-3" />
                          Passer à ce plan
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Zone de résiliation */}
            {!status.cancelAtPeriodEnd && (
              <div className="border-t border-border pt-4 flex flex-col gap-3">
                {status.status === "trialing" && (
                  <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    Vous êtes en période d'essai jusqu'au{" "}
                    {new Date(status.currentPeriodEnd).toLocaleDateString(
                      "fr-FR",
                    )}
                    . Si vous résiliez maintenant, aucune carte ne sera
                    débitée : l'abonnement s'arrête à la fin de l'essai.
                  </p>
                )}
                <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Accès jusqu'au{" "}
                  {new Date(status.currentPeriodEnd).toLocaleDateString(
                    "fr-FR",
                  )}
                  .
                </p>
                {confirmCancel ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-destructive">
                      {status.status === "trialing"
                        ? "Confirmer : vous ne serez pas facturé ?"
                        : "Confirmer la résiliation ?"}
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleCancel}
                      disabled={isPending}
                      className="rounded-xl font-bold uppercase text-xs"
                    >
                      {pendingAction === "cancel" && (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      )}
                      Oui, résilier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmCancel(false)}
                      disabled={isPending}
                      className="rounded-xl font-bold uppercase text-xs"
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmCancel(true)}
                    className="rounded-xl font-bold uppercase text-xs text-destructive hover:text-destructive"
                  >
                    Résilier mon abonnement
                  </Button>
                )}
                </div>
              </div>
            )}
          </div>
        )}

        {status && (
          <div className="border-t border-border pt-3 flex justify-center">
            <Button
              size="sm"
              variant="link"
              onClick={onOpenBillingPortal}
              disabled={billingPortalLoading}
              className="text-xs text-muted-foreground"
            >
              {billingPortalLoading && (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              )}
              Factures & moyen de paiement (portail Stripe)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
