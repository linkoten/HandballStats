import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer l'utilisateur via son clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Récupérer le club le plus récent de l'utilisateur
    const userClub = await prisma.userClub.findFirst({
      where: { userId: user.id },
      orderBy: { assignedAt: "desc" },
      include: {
        club: true,
      },
    });

    if (!userClub) {
      return NextResponse.json({ clubId: null });
    }

    return NextResponse.json({
      clubId: userClub.clubId,
      club: userClub.club,
    });
  } catch (error) {
    console.error("Erreur récupération club:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
