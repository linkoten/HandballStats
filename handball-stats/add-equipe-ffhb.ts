import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addEquipeFFHBColumn() {
  try {
    // Ajouter la colonne equipe_ffhb
    await prisma.$executeRaw`ALTER TABLE competitions ADD COLUMN equipe_ffhb VARCHAR(255) NOT NULL DEFAULT 'ASC RENNAIS 1'`;
    console.log("✅ Colonne equipe_ffhb ajoutée avec succès");

    // Mettre à jour la compétition existante avec le bon nom
    await prisma.$executeRaw`UPDATE competitions SET equipe_ffhb = 'ASC RENNAIS 1' WHERE id = 3`;
    console.log("✅ Compétition ID 3 mise à jour avec le nom FFHB correct");
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addEquipeFFHBColumn();
