-- Script pour supprimer la contrainte check_partie_tableau_exterieur qui bloque l'insertion des matchs

-- Vérifier les contraintes existantes
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'matchs'::regclass;

-- Supprimer la contrainte si elle existe
ALTER TABLE matchs DROP CONSTRAINT IF EXISTS check_partie_tableau_exterieur;
ALTER TABLE matchs DROP CONSTRAINT IF EXISTS check_partie_tableau_recevant;

-- Afficher un message de confirmation
SELECT 'Contraintes supprimées avec succès' AS status;
