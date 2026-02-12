-- Migration: Ajout des colonnes poste_principal et postes_secondaires à la table Joueurs
-- Date: 2025-12-16

-- Ajout de la colonne poste_principal
ALTER TABLE Joueurs 
ADD COLUMN poste_principal VARCHAR(50);

-- Ajout d'une contrainte CHECK pour valider les valeurs du poste principal
ALTER TABLE Joueurs
ADD CONSTRAINT check_poste_principal 
CHECK (poste_principal IS NULL OR poste_principal IN ('Gardien', 'Ailier', 'Arrière', 'Demi-Centre', 'Pivot'));

-- Ajout de la colonne postes_secondaires (array de VARCHAR)
ALTER TABLE Joueurs 
ADD COLUMN postes_secondaires VARCHAR(50)[];

-- Création d'index pour améliorer les performances des requêtes
CREATE INDEX idx_joueurs_poste_principal ON Joueurs(poste_principal);
CREATE INDEX idx_joueurs_postes_secondaires ON Joueurs USING GIN(postes_secondaires);

-- Message de confirmation
SELECT 'Migration 001 appliquée avec succès: colonnes postes ajoutées à la table Joueurs' AS message;
