-- Migration 005: Ajouter id_equipe_adverse à Statistiques_Joueur
-- Cette colonne identifie l'équipe adverse pour chaque statistique de joueur

-- Ajouter la colonne id_equipe_adverse
ALTER TABLE Statistiques_Joueur 
ADD COLUMN id_equipe_adverse INTEGER;

-- Ajouter la contrainte de clé étrangère
ALTER TABLE Statistiques_Joueur
ADD CONSTRAINT fk_stats_equipe_adverse 
FOREIGN KEY (id_equipe_adverse) REFERENCES Equipes(id) ON DELETE SET NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX idx_stats_equipe_adverse ON Statistiques_Joueur(id_equipe_adverse);

-- Remplir la colonne pour les données existantes
-- L'équipe adverse est l'équipe extérieure si le joueur est de l'équipe domicile, et vice-versa
UPDATE Statistiques_Joueur s
SET id_equipe_adverse = (
    SELECT CASE 
        WHEN j.id_equipe = m.equipe_recevant_id THEN m.equipe_exterieur_id
        WHEN j.id_equipe = m.equipe_exterieur_id THEN m.equipe_recevant_id
        ELSE NULL
    END
    FROM Joueurs j
    JOIN Matchs m ON s.id_match = m.id
    WHERE s.id_joueur = j.id
);

-- Commentaire sur la colonne
COMMENT ON COLUMN Statistiques_Joueur.id_equipe_adverse IS 
'ID de l''équipe adverse pour ce match';
