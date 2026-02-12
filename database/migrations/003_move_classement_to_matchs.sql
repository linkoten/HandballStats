-- Migration 003: Déplacer classement et partie_tableau de Equipes vers Matchs
-- Date: 2025-12-18
-- Description: Déplace les colonnes de classement vers la table Matchs pour avoir l'historique par match

-- Supprimer les colonnes de la table Equipes
ALTER TABLE Equipes DROP COLUMN IF EXISTS classement;
ALTER TABLE Equipes DROP COLUMN IF EXISTS partie_tableau;
ALTER TABLE Equipes DROP CONSTRAINT IF EXISTS check_partie_tableau;

-- Ajouter les colonnes dans la table Matchs pour l'équipe recevante
ALTER TABLE Matchs ADD COLUMN IF NOT EXISTS classement_equipe_recevant INTEGER;
ALTER TABLE Matchs ADD COLUMN IF NOT EXISTS partie_tableau_equipe_recevant VARCHAR(20);

-- Ajouter les colonnes dans la table Matchs pour l'équipe extérieure
ALTER TABLE Matchs ADD COLUMN IF NOT EXISTS classement_equipe_exterieur INTEGER;
ALTER TABLE Matchs ADD COLUMN IF NOT EXISTS partie_tableau_equipe_exterieur VARCHAR(20);

-- Ajouter les contraintes CHECK pour partie_tableau
ALTER TABLE Matchs ADD CONSTRAINT check_partie_tableau_recevant 
    CHECK (partie_tableau_equipe_recevant IS NULL OR partie_tableau_equipe_recevant IN ('supérieur', 'inférieur'));

ALTER TABLE Matchs ADD CONSTRAINT check_partie_tableau_exterieur 
    CHECK (partie_tableau_equipe_exterieur IS NULL OR partie_tableau_equipe_exterieur IN ('supérieur', 'inférieur'));

-- Créer des index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_matchs_classement_recevant ON Matchs(classement_equipe_recevant);
CREATE INDEX IF NOT EXISTS idx_matchs_classement_exterieur ON Matchs(classement_equipe_exterieur);
CREATE INDEX IF NOT EXISTS idx_matchs_partie_tableau_recevant ON Matchs(partie_tableau_equipe_recevant);
CREATE INDEX IF NOT EXISTS idx_matchs_partie_tableau_exterieur ON Matchs(partie_tableau_equipe_exterieur);
