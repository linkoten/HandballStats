-- AlterTable
ALTER TABLE "users" ADD COLUMN "base_token_allocation" INTEGER NOT NULL DEFAULT 0;

-- Backfill : initialiser base_token_allocation = tokens_remaining pour les utilisateurs existants
-- (approximation conservatrice : on part du principe que les tokens restants = allocation de base)
UPDATE "users" SET "base_token_allocation" = "tokens_remaining" WHERE "base_token_allocation" = 0 AND "tokens_remaining" > 0;
