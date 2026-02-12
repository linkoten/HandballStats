/*
  Warnings:

  - A unique constraint covering the columns `[coachCode]` on the table `clubs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[playerCode]` on the table `clubs` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'JOUEUR';

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "coachCode" VARCHAR(12) NOT NULL DEFAULT 'TEMP',
ADD COLUMN     "playerCode" VARCHAR(12) NOT NULL DEFAULT 'TEMP';

-- CreateIndex
CREATE UNIQUE INDEX "clubs_coachCode_key" ON "clubs"("coachCode");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_playerCode_key" ON "clubs"("playerCode");
