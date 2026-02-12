-- Étape 1: Ajouter la colonne is_principal dans user_clubs
ALTER TABLE "user_clubs" ADD COLUMN IF NOT EXISTS "is_principal" BOOLEAN NOT NULL DEFAULT false;

-- Étape 2: Migrer les données des clubs principaux
UPDATE "user_clubs" 
SET "is_principal" = true 
WHERE "id" IN (
  SELECT DISTINCT ON (ca."user_id") uc."id"
  FROM "competition_access" ca
  JOIN "competitions" c ON ca."competition_id" = c."id"
  JOIN "equipes" e ON c."equipe_id" = e."id"
  JOIN "user_clubs" uc ON (uc."user_id" = ca."user_id" AND uc."club_id" = e."club_id")
  WHERE ca."is_club_principal" = true
  ORDER BY ca."user_id", ca."created_at" ASC
);

-- Étape 3: Vérification
SELECT uc."user_id", cl."nom" as club, uc."is_principal"
FROM "user_clubs" uc
JOIN "clubs" cl ON uc."club_id" = cl."id"
WHERE uc."is_principal" = true;