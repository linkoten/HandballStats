/*
  Warnings:

  - You are about to drop the column `is_club_principal` on the `equipes` table. All the data in the column will be lost.
  - The `status` column on the `equipes` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "idx_equipes_is_club_principal";

-- AlterTable
ALTER TABLE "competition_tokens" ADD COLUMN     "is_club_principal" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "equipes" DROP COLUMN "is_club_principal",
DROP COLUMN "status",
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'INACTIVE';

-- CreateIndex
CREATE INDEX "idx_equipes_status" ON "equipes"("status");
