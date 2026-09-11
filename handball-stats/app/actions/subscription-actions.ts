"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { stripe, SUBSCRIPTION_PLANS } from "@/lib/stripe";
import { syncSubscriptionFromStripe } from "@/lib/subscription-sync";

type BillingCycle = "monthly" | "yearly";
type ActionResult<T = undefined> = {
  success: boolean;
  error?: string;
  data?: T;
};

async function requireUserWithStripeSubscription() {
  const { userId } = await auth();
  if (!userId) throw new Error("Non authentifié");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, stripeSubscriptionId: true },
  });
  if (!user) throw new Error("Utilisateur introuvable");
  if (!user.stripeSubscriptionId) {
    throw new Error(
      "Aucun abonnement actif. Choisissez un plan sur la page tarifs.",
    );
  }
  return user as { id: string; stripeSubscriptionId: string };
}

function isMissingSubscriptionError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "resource_missing"
  );
}

// L'ID d'abonnement Stripe référencé en base n'existe plus (mode test réinitialisé, etc.).
// On ne touche PAS au plan/tokens de l'utilisateur : on se contente de dissocier
// le lien Stripe invalide pour éviter de redemander cet ID par la suite.
async function clearStaleSubscription(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: null,
      stripePriceId: null,
    },
  });
}

/**
 * Retourne l'état de l'abonnement Stripe de l'utilisateur connecté
 * (plan, périodicité, date de fin, résiliation programmée ou non).
 */
export async function getSubscriptionStatus(): Promise<
  ActionResult<{
    planKey: string | null;
    cycle: BillingCycle;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: number;
  } | null>
> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Non authentifié" };

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, stripeSubscriptionId: true },
    });
    if (!user?.stripeSubscriptionId) {
      return { success: true, data: null };
    }

    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId,
      );
    } catch (error) {
      if (isMissingSubscriptionError(error)) {
        await clearStaleSubscription(user.id);
        return { success: true, data: null };
      }
      throw error;
    }
    const priceId = subscription.items.data[0]?.price.id;

    let planKey: string | null = null;
    let cycle: BillingCycle = "monthly";
    for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      if (plan.priceIdMonthly === priceId) {
        planKey = key;
        cycle = "monthly";
        break;
      }
      if (plan.priceIdYearly === priceId) {
        planKey = key;
        cycle = "yearly";
        break;
      }
    }

    return {
      success: true,
      data: {
        planKey,
        cycle,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: (subscription as any).current_period_end * 1000,
      },
    };
  } catch (error) {
    console.error("Erreur récupération abonnement:", error);
    return { success: false, error: "Erreur serveur" };
  }
}

/**
 * Change directement le plan de l'utilisateur (upgrade/downgrade), avec proration,
 * sans passer par le portail Stripe.
 */
export async function changeSubscriptionPlan(
  planKey: string,
  cycle: BillingCycle,
): Promise<ActionResult> {
  try {
    const plan = SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS];
    if (!plan) return { success: false, error: "Plan invalide" };

    const user = await requireUserWithStripeSubscription();
    const priceId = cycle === "yearly" ? plan.priceIdYearly : plan.priceIdMonthly;

    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId,
      );
    } catch (error) {
      if (isMissingSubscriptionError(error)) {
        await clearStaleSubscription(user.id);
        return {
          success: false,
          error: "Votre abonnement n'existe plus. Choisissez un plan sur la page tarifs.",
        };
      }
      throw error;
    }
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) {
      return { success: false, error: "Abonnement Stripe introuvable" };
    }

    // Empêche de changer de plan pendant l'essai gratuit (ex: souscrire Starter
    // pour profiter des 14 jours d'essai puis upgrader en Premium gratuitement,
    // et répéter l'opération). Le changement de plan n'est possible qu'une fois
    // l'essai terminé et la première facture émise.
    if (subscription.status === "trialing") {
      return {
        success: false,
        error:
          "Vous êtes en période d'essai gratuit. Le changement de plan ne sera possible qu'à la fin de l'essai.",
      };
    }

    const updated = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "create_prorations",
        // Un changement de plan annule une résiliation programmée
        cancel_at_period_end: false,
      },
    );

    await syncSubscriptionFromStripe(updated);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Erreur changement de plan:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Prévisualise le montant qui sera facturé (prorata inclus) si l'utilisateur
 * change de plan maintenant, sans appliquer le changement.
 */
export async function previewSubscriptionChange(
  planKey: string,
  cycle: BillingCycle,
): Promise<
  ActionResult<{
    currency: string;
    amountDue: number;
    nextPaymentDate: number;
    lines: { description: string; amount: number }[];
  }>
> {
  try {
    const plan = SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS];
    if (!plan) return { success: false, error: "Plan invalide" };

    const user = await requireUserWithStripeSubscription();
    const priceId = cycle === "yearly" ? plan.priceIdYearly : plan.priceIdMonthly;

    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId,
      );
    } catch (error) {
      if (isMissingSubscriptionError(error)) {
        await clearStaleSubscription(user.id);
        return {
          success: false,
          error: "Votre abonnement n'existe plus. Choisissez un plan sur la page tarifs.",
        };
      }
      throw error;
    }

    if (subscription.status === "trialing") {
      return {
        success: false,
        error:
          "Vous êtes en période d'essai gratuit. Le changement de plan ne sera possible qu'à la fin de l'essai.",
      };
    }

    const itemId = subscription.items.data[0]?.id;
    if (!itemId) {
      return { success: false, error: "Abonnement Stripe introuvable" };
    }

    // createPreview n'est pas encore typé dans le SDK installé (méthode récente).
    const preview = await (stripe.invoices as any).createPreview({
      customer: subscription.customer as string,
      subscription: user.stripeSubscriptionId,
      subscription_details: {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "create_prorations",
      },
    });

    return {
      success: true,
      data: {
        currency: preview.currency,
        amountDue: preview.amount_due / 100,
        nextPaymentDate: preview.period_end * 1000,
        lines: preview.lines.data.map((line: any) => ({
          description: line.description ?? "",
          amount: line.amount / 100,
        })),
      },
    };
  } catch (error) {
    console.error("Erreur prévisualisation changement de plan:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Programme la résiliation de l'abonnement à la fin de la période en cours
 * (l'utilisateur garde l'accès jusque-là). Si l'abonnement est encore en
 * période d'essai, "fin de période" = fin de l'essai : Stripe annule
 * l'abonnement à cette date-là, AVANT que la première facture ne soit
 * générée, donc l'utilisateur n'est jamais facturé.
 */
export async function cancelSubscriptionAtPeriodEnd(): Promise<
  ActionResult<{ isTrial: boolean; periodEnd: number }>
> {
  try {
    const user = await requireUserWithStripeSubscription();
    let subscription;
    try {
      subscription = await stripe.subscriptions.update(
        user.stripeSubscriptionId,
        { cancel_at_period_end: true },
      );
    } catch (error) {
      if (isMissingSubscriptionError(error)) {
        await clearStaleSubscription(user.id);
        return {
          success: false,
          error: "Votre abonnement n'existe plus. Choisissez un plan sur la page tarifs.",
        };
      }
      throw error;
    }
    revalidatePath("/dashboard");
    return {
      success: true,
      data: {
        isTrial: subscription.status === "trialing",
        periodEnd: (subscription as any).current_period_end * 1000,
      },
    };
  } catch (error) {
    console.error("Erreur résiliation abonnement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}

/**
 * Annule une résiliation programmée (l'abonnement continue normalement).
 */
export async function resumeSubscription(): Promise<ActionResult> {
  try {
    const user = await requireUserWithStripeSubscription();
    try {
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error) {
      if (isMissingSubscriptionError(error)) {
        await clearStaleSubscription(user.id);
        return {
          success: false,
          error: "Votre abonnement n'existe plus. Choisissez un plan sur la page tarifs.",
        };
      }
      throw error;
    }
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Erreur reprise abonnement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    };
  }
}
