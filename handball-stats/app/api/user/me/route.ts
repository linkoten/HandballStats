import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { syncUser } from "@/app/actions/user-actions";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Tenter de récupérer l'utilisateur existant
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        email: true,
        subscription: true,
        role: true,
        tokensRemaining: true,
        tokensUsed: true,
        stripeCurrentPeriodEnd: true,
        clubs: {
          select: {
            clubId: true,
          },
          take: 1, // On prend le premier club
        },
      },
    });

    // Si l'utilisateur n'existe pas, le synchroniser depuis Clerk
    if (!user) {
      console.log("Utilisateur introuvable, synchronisation depuis Clerk...");
      const syncedUser = await syncUser();

      // Re-récupérer avec la même structure
      user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: {
          id: true,
          email: true,
          subscription: true,
          role: true,
          tokensRemaining: true,
          tokensUsed: true,
          stripeCurrentPeriodEnd: true,
          clubs: {
            select: {
              clubId: true,
            },
            take: 1,
          },
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Impossible de récupérer ou créer l'utilisateur" },
        { status: 500 }
      );
    }

    // Ajouter le clubId au niveau supérieur pour faciliter l'accès
    const clubId = user.clubs[0]?.clubId || null;

    return NextResponse.json({ ...user, clubId });
  } catch (error) {
    console.error("Erreur récupération utilisateur:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
