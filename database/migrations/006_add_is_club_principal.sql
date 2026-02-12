-- Migration 006: Ajouter flag is_club_principal pour identifier dynamiquement le club analysé
-- Remplace le besoin de hardcoder les IDs dans Power Query

-- Ajouter la colonne is_club_principal
ALTER TABLE Equipes 
ADD COLUMN is_club_principal BOOLEAN DEFAULT FALSE;

-- Marquer les équipes ASCR comme club principal
UPDATE Equipes 
SET is_club_principal = TRUE 
WHERE id IN (3967, 3983, 4004, 4025);

-- Créer un index pour améliorer les performances
CREATE INDEX idx_equipes_is_club_principal ON Equipes(is_club_principal);

-- Commentaire sur la colonne
COMMENT ON COLUMN Equipes.is_club_principal IS 
'TRUE si équipe du club principal analysé, FALSE pour adversaires. Permet filtrage dynamique sans hardcoder IDs.';

-- Vérification : Afficher les équipes du club principal
SELECT id, nom, ville, is_club_principal 
FROM Equipes 
WHERE is_club_principal = TRUE 
ORDER BY nom;
