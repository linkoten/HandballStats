/*
  Warnings:

  - The values [CLUB] on the enum `SubscriptionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `activated_at` on the `competition_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `archived_at` on the `competition_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `competition_name` on the `competition_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `competition_tokens` table. All the data in the column will be lost.
  - You are about to alter the column `saison` on the `competition_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to drop the column `exterieur_nom_display` on the `matchs` table. All the data in the column will be lost.
  - You are about to drop the column `recevant_nom_display` on the `matchs` table. All the data in the column will be lost.
  - You are about to drop the column `invited_by` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_subscription_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_end_date` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_status` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `tokens_available` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `tokens_used` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `trial_ends_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `invitation_codes` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionType_new" AS ENUM ('GRATUIT', 'STARTER', 'PRO', 'PREMIUM');
ALTER TABLE "public"."users" ALTER COLUMN "subscription" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "subscription" TYPE "SubscriptionType_new" USING ("subscription"::text::"SubscriptionType_new");
ALTER TYPE "SubscriptionType" RENAME TO "SubscriptionType_old";
ALTER TYPE "SubscriptionType_new" RENAME TO "SubscriptionType";
DROP TYPE "public"."SubscriptionType_old";
ALTER TABLE "users" ALTER COLUMN "subscription" SET DEFAULT 'GRATUIT';
COMMIT;

-- DropForeignKey
ALTER TABLE "invitation_codes" DROP CONSTRAINT "invitation_codes_created_by_fkey";

-- DropIndex
DROP INDEX "competition_tokens_user_id_status_idx";

-- DropIndex
DROP INDEX "users_stripe_customer_id_idx";

-- DropIndex
DROP INDEX "users_stripe_subscription_id_key";

-- AlterTable
ALTER TABLE "competition_tokens" DROP COLUMN "activated_at",
DROP COLUMN "archived_at",
DROP COLUMN "competition_name",
DROP COLUMN "status",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "saison" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "matchs" DROP COLUMN "exterieur_nom_display",
DROP COLUMN "recevant_nom_display";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "invited_by",
DROP COLUMN "stripe_subscription_id",
DROP COLUMN "subscription_end_date",
DROP COLUMN "subscription_status",
DROP COLUMN "tokens_available",
DROP COLUMN "tokens_used",
DROP COLUMN "trial_ends_at";

-- DropTable
DROP TABLE "invitation_codes";

-- DropEnum
DROP TYPE "EquipeStatus";

-- DropEnum
DROP TYPE "TokenStatus";

-- CreateIndex
CREATE INDEX "competition_tokens_user_id_idx" ON "competition_tokens"("user_id");

-- CreateIndex
CREATE INDEX "competition_tokens_equipe_id_idx" ON "competition_tokens"("equipe_id");

-- AddForeignKey
ALTER TABLE "competition_tokens" ADD CONSTRAINT "competition_tokens_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
