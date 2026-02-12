/*
  Warnings:

  - A unique constraint covering the columns `[equipe_id,saison,nom,phase]` on the table `competitions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "competitions_equipe_id_saison_nom_key";

-- AlterTable
ALTER TABLE "competitions" ADD COLUMN     "scraping_progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scraping_step" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "competitions_equipe_id_saison_nom_phase_key" ON "competitions"("equipe_id", "saison", "nom", "phase");
