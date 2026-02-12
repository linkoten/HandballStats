import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        competitionAccess: {
          include: {
            competition: {
              include: {
                equipe: {
                  include: {
                    club: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tokensRemaining: user.tokensRemaining,
      tokensUsed: user.tokensUsed,
      competitions: user.competitionAccess,
    });
  } catch (error) {
    console.error("Erreur récupération tokens:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
