-- DropIndex
DROP INDEX "equipes_nom_key";

-- AlterTable
ALTER TABLE "competitions" ADD COLUMN     "equipe_ffhb" VARCHAR(255) NOT NULL DEFAULT 'ASC RENNAIS 1';
