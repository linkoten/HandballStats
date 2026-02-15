-- Nettoyer les doublons avant d'ajouter la contrainte unique
WITH numbered_equipes AS (
    SELECT id, nom, 
           ROW_NUMBER() OVER (PARTITION BY nom ORDER BY id ASC) as rn
    FROM equipes
)
DELETE FROM equipes 
WHERE id IN (
    SELECT id FROM numbered_equipes WHERE rn > 1
);

-- Ajouter la contrainte unique sur nom
CREATE UNIQUE INDEX "equipes_nom_key" ON "equipes"("nom");