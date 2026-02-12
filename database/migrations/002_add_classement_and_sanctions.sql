-- Migration 002: Ajout classement équipes et sanctions adverses

-- Ajout des colonnes de classement dans la table Equipes
ALTER TABLE Equipes ADD COLUMN IF NOT EXISTS classement INTEGER;
ALTER TABLE Equipes ADD COLUMN IF NOT EXISTS partie_tableau VARCHAR(20);
ALTER TABLE Equipes ADD CONSTRAINT check_partie_tableau 
    CHECK (partie_tableau IS NULL OR partie_tableau IN ('supérieur', 'inférieur'));

-- Création d'index pour les recherches sur le classement
CREATE INDEX IF NOT EXISTS idx_equipes_classement ON Equipes(classement);
CREATE INDEX IF NOT EXISTS idx_equipes_partie_tableau ON Equipes(partie_tableau);

-- Ajout des colonnes de sanctions équipe adverse dans la table Matchs
ALTER TABLE Matchs ADD COLUMN IF NOT EXISTS cartons_jaunes_adversaire INTEGER DEFAULT 0;
ALTER TABLE Matchs ADD COLUMN IF NOT EXISTS exclusions_2min_adversaire INTEGER DEFAULT 0;
ALTER TABLE Matchs ADD COLUMN IF NOT EXISTS cartons_rouges_adversaire INTEGER DEFAULT 0;
ALTER TABLE Matchs ADD COLUMN IF NOT EXISTS sept_metres_adversaire INTEGER DEFAULT 0;

-- Création d'index pour les analyses statistiques
CREATE INDEX IF NOT EXISTS idx_matchs_cartons_jaunes_adv ON Matchs(cartons_jaunes_adversaire);
CREATE INDEX IF NOT EXISTS idx_matchs_exclusions_2min_adv ON Matchs(exclusions_2min_adversaire);
CREATE INDEX IF NOT EXISTS idx_matchs_cartons_rouges_adv ON Matchs(cartons_rouges_adversaire);
CREATE INDEX IF NOT EXISTS idx_matchs_sept_metres_adv ON Matchs(sept_metres_adversaire);

-- Afficher confirmation
SELECT 'Migration 002 appliquée avec succès!' AS message;
