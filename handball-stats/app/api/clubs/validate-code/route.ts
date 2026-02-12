import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Body attendu :
 * {
 *   code: string, // code entré par l'utilisateur
 *   userId: string // id Clerk de l'utilisateur connecté
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { code, userId } = await req.json();
    if (!code || !userId) {
      return NextResponse.json(
        { error: "Code et userId requis" },
        { status: 400 },
      );
    }

    // Recherche du club par code (coach ou player)
    const club = await prisma.club.findFirst({
      where: {
        OR: [{ coachCode: code }, { playerCode: code }],
      },
    });
    if (!club) {
      return NextResponse.json({ error: "Code invalide" }, { status: 404 });
    }

    // Détermination du rôle
    let newRole: UserRole | null = null;
    if (club.coachCode === code) newRole = "ENTRAINEUR";
    if (club.playerCode === code) newRole = "JOUEUR";
    if (!newRole) {
      return NextResponse.json({ error: "Code non reconnu" }, { status: 400 });
    }

    // Vérifier/créer l'utilisateur si besoin
    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      // Création minimaliste, à adapter selon tes besoins
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@placeholder.com`, // à remplacer par un vrai email si possible
        },
      });
    }

    // Associer le club à l'utilisateur (UserClub)
    await prisma.userClub.upsert({
      where: {
        userId_clubId: {
          userId: user.id, // Correction : utiliser l'id interne User
          clubId: club.id,
        },
      },
      update: {},
      create: {
        userId: user.id, // Correction : utiliser l'id interne User
        clubId: club.id,
        isPrincipal: false,
      },
    });

    // Mettre à jour le rôle de l'utilisateur
    await prisma.user.update({
      where: { clerkId: userId },
      data: { role: newRole },
    });

    // Récupérer l'admin du club (ADMIN_CLUB ou ENTRAINEUR principal)
    const adminUserClub = await prisma.userClub.findFirst({
      where: {
        clubId: club.id,
        user: {
          OR: [{ role: "ADMIN_CLUB" }, { role: "ENTRAINEUR" }],
        },
        isPrincipal: true,
      },
      include: { user: true },
    });

    if (adminUserClub) {
      // Récupérer toutes les équipes du club
      const equipes = await prisma.equipes.findMany({
        where: { clubId: club.id },
      });
      // Récupérer tous les CompetitionAccess de l'admin
      const adminCompetitionAccess = await prisma.competitionAccess.findMany({
        where: { userId: adminUserClub.userId },
      });
      // Donner accès à toutes les équipes et compétitions à l'utilisateur
      for (const equipe of equipes) {
        // Ici, tu pourrais créer un UserEquipeMetadata si besoin
      }
      for (const access of adminCompetitionAccess) {
        await prisma.competitionAccess.upsert({
          where: {
            userId_competitionId: {
              userId: user.id,
              competitionId: access.competitionId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            competitionId: access.competitionId,
            tokenUsed: access.tokenUsed,
            expiresAt: access.expiresAt,
          },
        });
      }
    }

    return NextResponse.json({ success: true, clubId: club.id, newRole });
  } catch (error) {
    console.error("Erreur validation code:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
