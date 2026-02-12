-- CreateEnum
CREATE TYPE "EquipeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "equipes" ADD COLUMN     "status" "EquipeStatus" NOT NULL DEFAULT 'INACTIVE';

-- CreateIndex
CREATE INDEX "idx_equipes_status" ON "equipes"("status");
