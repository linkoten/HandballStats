-- Migration 004: Ajouter club, région et département aux équipes
-- Date: 2025-12-18
-- Description: Ajoute les colonnes club, region et departement à la table Equipes

-- Ajouter les nouvelles colonnes
ALTER TABLE Equipes ADD COLUMN IF NOT EXISTS club VARCHAR(100);
ALTER TABLE Equipes ADD COLUMN IF NOT EXISTS region VARCHAR(50);
ALTER TABLE Equipes ADD COLUMN IF NOT EXISTS departement VARCHAR(3);

-- Créer des index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_equipes_region ON Equipes(region);
CREATE INDEX IF NOT EXISTS idx_equipes_departement ON Equipes(departement);
