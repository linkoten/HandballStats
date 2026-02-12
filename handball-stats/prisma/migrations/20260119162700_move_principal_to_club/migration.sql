-- Migration manuelle : déplacer is_club_principal de competition_access vers user_clubs

-- 1. Ajouter la nouvelle colonne is_principal dans user_clubs
ALTER TABLE "user_clubs" ADD COLUMN "is_principal" BOOLEAN NOT NULL DEFAULT false;

-- 2. Migrer les données : marquer comme principal le club de la première compétition principale
UPDATE "user_clubs" 
SET "is_principal" = true 
WHERE "id" IN (
  SELECT DISTINCT ON (ca.user_id) uc.id
  FROM "competition_access" ca
  JOIN "competitions" c ON ca.competition_id = c.id
  JOIN "equipes" e ON c.equipe_id = e.id
  JOIN "user_clubs" uc ON (uc.user_id = ca.user_id AND uc.club_id = e.club_id)
  WHERE ca.is_club_principal = true
  ORDER BY ca.user_id, ca.created_at ASC
);

-- 3. Supprimer la colonne is_club_principal de competition_access
ALTER TABLE "competition_access" DROP COLUMN "is_club_principal";

-- 4. Supprimer l'index correspondant (déjà supprimé dans le schéma)