import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { equipeIds } = await request.json();

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

    // Vérifier que l'équipe appartient bien à un club de l'utilisateur
    const equipe = await prisma.equipes.findFirst({
      where: {
        id: equipeIds[0],
        club: {
          userClubs: {
            some: { userId: user.id },
          },
        },
      },
    });

    if (!equipe) {
      return NextResponse.json(
        { error: "Équipe non autorisée" },
        { status: 403 }
      );
    }

    // Sauvegarder l'équipe sélectionnée dans les cookies pour l'onboarding
    const cookieStore = await cookies();
    cookieStore.set("onboarding-selected-equipe", equipeIds[0].toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 heure
    });

    return NextResponse.json({
      success: true,
      selectedEquipeId: equipeIds[0],
      message: "Équipe sélectionnée avec succès",
    });
  } catch (error) {
    console.error("Erreur sélection équipes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
