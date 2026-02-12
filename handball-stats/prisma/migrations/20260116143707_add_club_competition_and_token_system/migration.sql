/*
  Warnings:

  - You are about to drop the column `club` on the `equipes` table. All the data in the column will be lost.
  - You are about to drop the `competition_tokens` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripe_subscription_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ScrapingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TokenAction" AS ENUM ('SCRAPE', 'REFUND', 'PURCHASE', 'SUBSCRIPTION', 'ADMIN');

-- DropForeignKey
ALTER TABLE "competition_tokens" DROP CONSTRAINT "competition_tokens_equipe_id_fkey";

-- DropForeignKey
ALTER TABLE "competition_tokens" DROP CONSTRAINT "competition_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_clubs" DROP CONSTRAINT "user_clubs_club_id_fkey";

-- AlterTable
ALTER TABLE "equipes" DROP COLUMN "club",
ADD COLUMN     "club_id" INTEGER;

-- AlterTable
ALTER TABLE "matchs" ADD COLUMN     "competition_id" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_current_period_end" TIMESTAMP(3),
ADD COLUMN     "stripe_price_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "tokens_remaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tokens_used" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "competition_tokens";

-- CreateTable
CREATE TABLE "clubs" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "ville" VARCHAR(255),
    "region" VARCHAR(50),
    "departement" VARCHAR(3),
    "codeFfhb" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "saison" VARCHAR(20) NOT NULL,
    "equipe_id" INTEGER NOT NULL,
    "baseUrl" TEXT,
    "niveau" VARCHAR(100),
    "phase" VARCHAR(50),
    "scraping_status" "ScrapingStatus" NOT NULL DEFAULT 'PENDING',
    "last_scraped_at" TIMESTAMP(3),
    "scrapingError" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "competition_id" INTEGER NOT NULL,
    "token_used" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_usage_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "competition_id" INTEGER,
    "action" "TokenAction" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_usage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_limits" (
    "id" SERIAL NOT NULL,
    "subscription_type" "SubscriptionType" NOT NULL,
    "max_tokens" INTEGER NOT NULL,
    "max_clubs" INTEGER NOT NULL,
    "max_equipes" INTEGER NOT NULL,
    "max_competitions" INTEGER NOT NULL,
    "advanced_stats" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "subscription_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clubs_codeFfhb_key" ON "clubs"("codeFfhb");

-- CreateIndex
CREATE INDEX "clubs_departement_idx" ON "clubs"("departement");

-- CreateIndex
CREATE INDEX "clubs_region_idx" ON "clubs"("region");

-- CreateIndex
CREATE INDEX "competitions_equipe_id_idx" ON "competitions"("equipe_id");

-- CreateIndex
CREATE INDEX "competitions_saison_idx" ON "competitions"("saison");

-- CreateIndex
CREATE INDEX "competitions_scraping_status_idx" ON "competitions"("scraping_status");

-- CreateIndex
CREATE UNIQUE INDEX "competitions_equipe_id_saison_nom_key" ON "competitions"("equipe_id", "saison", "nom");

-- CreateIndex
CREATE INDEX "competition_access_user_id_idx" ON "competition_access"("user_id");

-- CreateIndex
CREATE INDEX "competition_access_competition_id_idx" ON "competition_access"("competition_id");

-- CreateIndex
CREATE INDEX "competition_access_expires_at_idx" ON "competition_access"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "competition_access_user_id_competition_id_key" ON "competition_access"("user_id", "competition_id");

-- CreateIndex
CREATE INDEX "token_usage_history_user_id_idx" ON "token_usage_history"("user_id");

-- CreateIndex
CREATE INDEX "token_usage_history_created_at_idx" ON "token_usage_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_limits_subscription_type_key" ON "subscription_limits"("subscription_type");

-- CreateIndex
CREATE INDEX "equipes_club_id_idx" ON "equipes"("club_id");

-- CreateIndex
CREATE INDEX "matchs_competition_id_idx" ON "matchs"("competition_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "users_subscription_idx" ON "users"("subscription");

-- AddForeignKey
ALTER TABLE "user_clubs" ADD CONSTRAINT "user_clubs_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_access" ADD CONSTRAINT "competition_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_access" ADD CONSTRAINT "competition_access_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage_history" ADD CONSTRAINT "token_usage_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchs" ADD CONSTRAINT "matchs_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
