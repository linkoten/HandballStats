-- init.sql - Script d'initialisation de la base de données Handball

-- Suppression des tables existantes (dans l'ordre inverse des dépendances)
DROP TABLE IF EXISTS Statistiques_Joueur CASCADE;
DROP TABLE IF EXISTS Matchs CASCADE;
DROP TABLE IF EXISTS Joueurs CASCADE;
DROP TABLE IF EXISTS Equipes CASCADE;

-- Création de la table Equipes
CREATE TABLE Equipes (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) UNIQUE NOT NULL,
    ville VARCHAR(255)
);

-- Création de la table Joueurs
CREATE TABLE Joueurs (
    id SERIAL PRIMARY KEY,
    nom_prenom VARCHAR(255) NOT NULL,
    num_maillot INTEGER,
    id_equipe INTEGER NOT NULL,
    CONSTRAINT fk_joueur_equipe FOREIGN KEY (id_equipe) REFERENCES Equipes(id) ON DELETE CASCADE,
    CONSTRAINT unique_joueur_equipe UNIQUE (nom_prenom, id_equipe)
);

-- Création de la table Matchs
CREATE TABLE Matchs (
    id SERIAL PRIMARY KEY,
    match_url VARCHAR(500) UNIQUE NOT NULL,
    pdf_url VARCHAR(500),
    competition_name VARCHAR(255),
    equipe_recevant_id INTEGER NOT NULL,
    equipe_exterieur_id INTEGER NOT NULL,
    score_final VARCHAR(50),
    date_match TIMESTAMP,
    Arbitre_1 VARCHAR(255),
    Arbitre_2 VARCHAR(255),
    CONSTRAINT fk_match_recevant FOREIGN KEY (equipe_recevant_id) REFERENCES Equipes(id) ON DELETE CASCADE,
    CONSTRAINT fk_match_exterieur FOREIGN KEY (equipe_exterieur_id) REFERENCES Equipes(id) ON DELETE CASCADE
);

-- Création de la table Statistiques_Joueur
CREATE TABLE Statistiques_Joueur (
    id SERIAL PRIMARY KEY,
    id_match INTEGER NOT NULL,
    id_joueur INTEGER NOT NULL,
    buts INTEGER DEFAULT 0,
    sept_metres INTEGER DEFAULT 0,
    tirs INTEGER DEFAULT 0,
    arrets INTEGER DEFAULT 0,
    avertissements INTEGER DEFAULT 0,
    exclusions_2min INTEGER DEFAULT 0,
    discipline INTEGER DEFAULT 0,
    CONSTRAINT fk_stats_match FOREIGN KEY (id_match) REFERENCES Matchs(id) ON DELETE CASCADE,
    CONSTRAINT fk_stats_joueur FOREIGN KEY (id_joueur) REFERENCES Joueurs(id) ON DELETE CASCADE,
    CONSTRAINT unique_stats_match_joueur UNIQUE (id_match, id_joueur)
);

-- Création des index pour améliorer les performances
CREATE INDEX idx_joueurs_equipe ON Joueurs(id_equipe);
CREATE INDEX idx_matchs_recevant ON Matchs(equipe_recevant_id);
CREATE INDEX idx_matchs_exterieur ON Matchs(equipe_exterieur_id);
CREATE INDEX idx_matchs_date ON Matchs(date_match);
CREATE INDEX idx_matchs_competition ON Matchs(competition_name);
CREATE INDEX idx_stats_match ON Statistiques_Joueur(id_match);
CREATE INDEX idx_stats_joueur ON Statistiques_Joueur(id_joueur);

-- Insertion de données de test (optionnel)
-- Décommentez si vous souhaitez avoir des données initiales

-- INSERT INTO Equipes (nom, ville) VALUES
-- ('ASCR Handball 1 M', 'Rennes'),
-- ('ASCR Handball 2 M', 'Rennes'),
-- ('ASCR Handball 1 F', 'Rennes'),
-- ('ASCR Handball 2 F', 'Rennes');

-- Afficher les tables créées
SELECT 'Tables créées avec succès!' AS message;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
