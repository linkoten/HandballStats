-- Ajouter la colonne equipe_ffhb au model Competition
ALTER TABLE competitions 
ADD COLUMN equipe_ffhb VARCHAR(255) NOT NULL DEFAULT 'ASC RENNAIS 1';