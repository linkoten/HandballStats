import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixSequences() {
  try {
    console.log("🔧 Correction des séquences auto-increment...");

    // Corriger la séquence des équipes
    const maxEquipeId = await prisma.equipes.aggregate({
      _max: { id: true },
    });

    if (maxEquipeId._max.id) {
      await prisma.$executeRaw`
        SELECT setval(pg_get_serial_sequence('equipes', 'id'), ${maxEquipeId._max.id + 1}, false);
      `;
      console.log(
        `✅ Séquence équipes corrigée (max ID: ${maxEquipeId._max.id})`,
      );
    }

    // Corriger la séquence des joueurs
    const maxJoueurId = await prisma.joueurs.aggregate({
      _max: { id: true },
    });

    if (maxJoueurId._max.id) {
      await prisma.$executeRaw`
        SELECT setval(pg_get_serial_sequence('joueurs', 'id'), ${maxJoueurId._max.id + 1}, false);
      `;
      console.log(
        `✅ Séquence joueurs corrigée (max ID: ${maxJoueurId._max.id})`,
      );
    }

    // Corriger la séquence des clubs
    const maxClubId = await prisma.club.aggregate({
      _max: { id: true },
    });

    if (maxClubId._max.id) {
      await prisma.$executeRaw`
        SELECT setval(pg_get_serial_sequence('clubs', 'id'), ${maxClubId._max.id + 1}, false);
      `;
      console.log(`✅ Séquence clubs corrigée (max ID: ${maxClubId._max.id})`);
    }

    // Corriger la séquence des compétitions
    const maxCompetitionId = await prisma.competition.aggregate({
      _max: { id: true },
    });

    if (maxCompetitionId._max.id) {
      await prisma.$executeRaw`
        SELECT setval(pg_get_serial_sequence('competitions', 'id'), ${maxCompetitionId._max.id + 1}, false);
      `;
      console.log(
        `✅ Séquence competitions corrigée (max ID: ${maxCompetitionId._max.id})`,
      );
    }

    console.log("🎉 Toutes les séquences sont corrigées !");
  } catch (error) {
    console.error("❌ Erreur lors de la correction des séquences:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exporter pour utilisation en script ou seed
export { fixSequences };

// Permettre l'exécution directe
if (require.main === module) {
  fixSequences();
}
