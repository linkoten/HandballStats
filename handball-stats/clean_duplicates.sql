-- Nettoyer les doublons d'équipes avant d'ajouter la contrainte unique
-- Garder seulement la première occurrence de chaque nom d'équipe

DELETE FROM equipes 
WHERE id NOT IN (
    SELECT DISTINCT ON (nom) id 
    FROM equipes 
    ORDER BY nom, id
);