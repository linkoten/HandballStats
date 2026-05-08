import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Cron job quotidien : supprime les compétitions des Free Trials expirés.
 * Réinitialise le compte utilisateur en GRATUIT.
 * Schedule : "0 0 * * *" (minuit UTC chaque jour)
 */
export async function GET(req: NextRequest) {
  // Sécurité : vérifier le header Authorization avec le CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    // Trouver tous les users FREE_TRIAL expirés
    const expiredUsers = await prisma.user.findMany({
      where: {
        subscription: "FREE_TRIAL",
        freeTrialExpiresAt: { lte: now },
      },
      include: {
        clubs: {
          include: {
            club: {
              include: {
                equipes: {
                  include: {
                    competitions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    let deletedCompetitions = 0;
    let resetUsers = 0;

    for (const user of expiredUsers) {
      // Collecter tous les IDs de compétitions liées aux équipes du club de cet user
      const competitionIds: number[] = [];
      for (const userClub of user.clubs) {
        for (const equipe of userClub.club.equipes) {
          for (const comp of equipe.competitions) {
            competitionIds.push(comp.id);
          }
        }
      }

      // Supprimer les compétitions (cascade vers matchs, statistiques_joueur, classement, etc.)
      if (competitionIds.length > 0) {
        const deleted = await prisma.competition.deleteMany({
          where: { id: { in: competitionIds } },
        });
        deletedCompetitions += deleted.count;
      }

      // Réinitialiser l'utilisateur
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscription: "GRATUIT",
          freeTrialStartedAt: null,
          freeTrialExpiresAt: null,
        },
      });
      resetUsers++;
    }

    console.log(
      `[cleanup-free-trials] ${resetUsers} users réinitialisés, ${deletedCompetitions} compétitions supprimées.`,
    );

    return NextResponse.json({
      success: true,
      resetUsers,
      deletedCompetitions,
    });
  } catch (error) {
    console.error("[cleanup-free-trials] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
