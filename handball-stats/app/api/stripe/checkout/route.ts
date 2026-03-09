import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import {
  createStripeCustomer,
  createSubscriptionCheckoutSession,
  createTokenCheckoutSession,
  SUBSCRIPTION_PLANS,
  TOKEN_PACKS,
} from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { planType, tokenPack, interval = "monthly" } = body;

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 },
      );
    }

    // Créer un client Stripe si nécessaire
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(user.email, user.id);
      stripeCustomerId = customer.id;

      // Mettre à jour l'utilisateur
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/dashboard?checkout=success`;
    const cancelUrl = `${baseUrl}/pricing?checkout=canceled`;

    // Abonnement ou jetons ?
    if (planType) {
      // Vérifier que le plan existe
      const plan =
        SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];

      if (!plan) {
        return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
      }

      // Sélectionner le bon price ID selon l'intervalle
      const priceId =
        interval === "yearly" ? plan.priceIdYearly : plan.priceIdMonthly;

      // Créer la session de paiement pour abonnement
      const session = await createSubscriptionCheckoutSession({
        customerId: stripeCustomerId,
        priceId,
        userId: user.id,
        successUrl,
        cancelUrl,
        isStarter: planType === "STARTER",
      });

      return NextResponse.json({ sessionId: session.id, url: session.url });
    } else if (tokenPack) {
      // Vérifier que le pack existe
      const pack = TOKEN_PACKS[tokenPack as keyof typeof TOKEN_PACKS];

      if (!pack) {
        return NextResponse.json({ error: "Pack invalide" }, { status: 400 });
      }

      // Créer la session de paiement pour jetons
      const session = await createTokenCheckoutSession({
        customerId: stripeCustomerId,
        priceId: pack.priceId,
        quantity: 1,
        userId: user.id,
        successUrl,
        cancelUrl,
      });

      return NextResponse.json({ sessionId: session.id, url: session.url });
    }

    return NextResponse.json(
      { error: "Paramètres invalides" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Erreur création session Stripe:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
