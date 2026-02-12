import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({
        hasAccess: false,
        reason: "not_authenticated",
      });
    }

    const { equipeId } = await request.json();

    if (!equipeId) {
      return NextResponse.json({ error: "equipeId requis" }, { status: 400 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ hasAccess: false, reason: "user_not_found" });
    }

    // Premium = accès illimité
    if (user.subscription === "PREMIUM") {
      return NextResponse.json({
        hasAccess: true,
        reason: "premium_unlimited",
        subscription: user.subscription,
      });
    }

    // Vérifier si l'utilisateur a accès à une compétition pour cette équipe
    const competitionAccess = await prisma.competitionAccess.findFirst({
      where: {
        userId: user.id,
        competition: {
          equipeId: parseInt(equipeId),
        },
      },
      include: {
        competition: true,
      },
    });

    if (competitionAccess) {
      return NextResponse.json({
        hasAccess: true,
        reason: "active_competition",
        competitionId: competitionAccess.competition.id,
      });
    }

    // Pas d'accès
    return NextResponse.json({
      hasAccess: false,
      reason: "no_access",
      tokensRemaining: user.tokensRemaining,
      subscription: user.subscription,
    });
  } catch (error) {
    console.error("Erreur vérification accès:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
