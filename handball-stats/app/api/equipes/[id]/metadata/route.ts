import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const equipeId = parseInt(id);

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Récupérer les métadonnées personnalisées
    const metadata = await prisma.userEquipeMetadata.findUnique({
      where: {
        userId_equipeId: {
          userId: user.id,
          equipeId: equipeId,
        },
      },
    });

    // Récupérer l'équipe de base
    const equipe = await prisma.equipes.findUnique({
      where: { id: equipeId },
      include: {
        club: true,
      },
    });

    if (!equipe) {
      return NextResponse.json(
        { error: "Équipe introuvable" },
        { status: 404 }
      );
    }

    // Merger les données : priorité aux métadonnées personnalisées
    const mergedData = {
      id: equipe.id,
      nom: equipe.nom,
      ville: metadata?.ville || equipe.ville,
      region: metadata?.region || equipe.region,
      departement: metadata?.departement || equipe.departement,
      notes: metadata?.notes || null,
      club: equipe.club,
      status: equipe.status,
      hasCustomData: !!metadata,
    };

    return NextResponse.json(mergedData);
  } catch (error) {
    console.error("Erreur récupération métadonnées équipe:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const equipeId = parseInt(id);
    const body = await request.json();
    const { ville, region, departement, notes } = body;

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur a accès à cette équipe via CompetitionAccess
    const hasAccess = await prisma.competitionAccess.findFirst({
      where: {
        userId: user.id,
        competition: {
          OR: [
            { equipeId: equipeId },
            {
              matchs: {
                some: {
                  OR: [
                    { equipe_recevant_id: equipeId },
                    { equipe_exterieur_id: equipeId },
                  ],
                },
              },
            },
          ],
        },
      },
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Accès non autorisé à cette équipe" },
        { status: 403 }
      );
    }

    // Upsert les métadonnées
    const metadata = await prisma.userEquipeMetadata.upsert({
      where: {
        userId_equipeId: {
          userId: user.id,
          equipeId: equipeId,
        },
      },
      create: {
        userId: user.id,
        equipeId: equipeId,
        ville,
        region,
        departement,
        notes,
      },
      update: {
        ville,
        region,
        departement,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      metadata,
    });
  } catch (error) {
    console.error("Erreur mise à jour métadonnées équipe:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
