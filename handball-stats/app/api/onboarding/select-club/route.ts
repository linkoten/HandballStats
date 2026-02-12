import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { clubId } = await request.json();

    // Vérifier que le club existe
    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }

    // Récupérer l'utilisateur depuis la DB
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Créer ou mettre à jour l'association UserClub
    await prisma.userClub.upsert({
      where: {
        userId_clubId: {
          userId: user.id,
          clubId,
        },
      },
      create: {
        userId: user.id,
        clubId,
      },
      update: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur sélection club:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        clubs: {
          take: 1,
          orderBy: { assignedAt: "desc" },
        },
      },
    });

    if (!user || user.clubs.length === 0) {
      return NextResponse.json({ clubId: null });
    }

    return NextResponse.json({ clubId: user.clubs[0].clubId });
  } catch (error) {
    console.error("Erreur récupération club:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
