import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { createCustomerPortalSession } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        {
          error:
            "Aucun compte de facturation trouvé. Souscrivez d'abord à un abonnement.",
        },
        { status: 400 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await createCustomerPortalSession(
      user.stripeCustomerId,
      `${baseUrl}/dashboard`,
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Erreur portail Stripe:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ouverture du portail" },
      { status: 500 },
    );
  }
}
