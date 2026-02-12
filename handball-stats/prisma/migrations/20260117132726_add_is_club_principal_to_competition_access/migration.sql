-- AlterTable
ALTER TABLE "competition_access" ADD COLUMN     "is_club_principal" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "competition_access_is_club_principal_idx" ON "competition_access"("is_club_principal");
