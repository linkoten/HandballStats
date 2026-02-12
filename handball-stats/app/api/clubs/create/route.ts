import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { generateTwoCodes } from "@/lib/generateTwoCodes";

export async function POST(request: Request) {
  // Utilisation de la génération sécurisée de codes (12 caractères max)
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { nom, club, ville, region, departement } = await request.json();

    // Validation
    if (!nom || !club || !ville) {
      return NextResponse.json(
        { error: "Les champs nom, club et ville sont requis" },
        { status: 400 },
      );
    }

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

    // Créer ou récupérer le club
    let clubRecord = await prisma.club.findFirst({
      where: {
        nom: club,
        ville: ville,
      },
    });

    if (!clubRecord) {
      // Créer le club s'il n'existe pas, avec codes sécurisés
      const codes = generateTwoCodes();
      clubRecord = await prisma.club.create({
        data: {
          nom: club,
          ville: ville,
          region: region || null,
          departement: departement || null,
          ...codes,
        },
      });
    }

    // Créer la nouvelle équipe liée au club
    const newEquipe = await prisma.equipes.create({
      data: {
        nom,
        clubId: clubRecord.id,
        ville,
        region: region || null,
        departement: departement || null,
        status: "ACTIVE", // L'équipe est créée comme ACTIVE car configurée par un utilisateur
      },
    });

    // Associer l'utilisateur au club
    await prisma.userClub.upsert({
      where: {
        userId_clubId: {
          userId: user.id,
          clubId: clubRecord.id,
        },
      },
      create: {
        userId: user.id,
        clubId: clubRecord.id,
      },
      update: {},
    });

    return NextResponse.json({
      success: true,
      club: clubRecord,
      equipe: newEquipe,
    });
  } catch (error: any) {
    console.error("Erreur création club:", error);

    // Gestion de l'erreur de duplication (nom unique)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Une équipe avec ce nom existe déjà" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
