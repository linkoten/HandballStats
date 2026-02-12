# database.py

import psycopg2
from typing import Dict, Any, List
import pandas as pd
from datetime import datetime
import re
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration de la base de données
DB_NAME = os.getenv("DB_NAME", "Handball")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "naruto756")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DEFAULT_TEAM_NAME = "AS Default"


def get_db_connection():
    """Crée et retourne une connexion à la base de données PostgreSQL."""
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        return conn
    except psycopg2.Error as e:
        print(f"Erreur de connexion à la base de données: {e}")
        return None


def normalize_team_name(nom: str) -> str:
    """
    Normalise un nom d'équipe pour éviter les doublons.
    - Met en title case (Première Lettre En Majuscule)
    - Enlève les espaces multiples
    - Préserve les suffixes comme F, M, 1, 2, etc.
    """
    # Remplacer les espaces multiples par un seul
    nom = ' '.join(nom.split())
    
    # Mettre en title case pour uniformiser
    # "CADETS DE BRETAGNE 1 M" devient "Cadets De Bretagne 1 M"
    # "cadets de bretagne 1 f" devient "Cadets De Bretagne 1 F"
    nom = nom.title()
    
    return nom.strip()


def update_competition_progress(conn, competition_id: int, progress: int, step: str = None, status: str = None):
    """
    Met à jour la progression, l'étape et le statut d'une compétition.
    """
    if not conn or not competition_id:
        return
    
    try:
        with conn.cursor() as cur:
            query_parts = ["scraping_progress = %s"]
            params = [progress]
            
            if step is not None:
                query_parts.append("scraping_step = %s")
                params.append(step)
                
            if status is not None:
                # Cast status to ScrapingStatus enum if necessary, or pass as string if driver handles it
                # Assuming simple string set for now, relying on Prisma/Postgres compatibility
                query_parts.append("scraping_status = %s::\"ScrapingStatus\"")
                params.append(status)
            
            # Add timestamp update
            query_parts.append("updated_at = NOW()")
            
            query = f"UPDATE competitions SET {', '.join(query_parts)} WHERE id = %s"
            params.append(competition_id)
            
            cur.execute(query, tuple(params))
            conn.commit()
    except Exception as e:
        print(f"[ERROR] Failed to update competition progress: {e}")
        conn.rollback()


def upsert_equipe(conn, nom_equipe: str, ville: str = 'Rennes', status: str = 'INACTIVE') -> int:
    """
    Insère ou récupère l'ID d'une équipe.
    Normalise le nom pour uniformiser la casse et les espaces.
    PostgreSQL gère les doublons via la contrainte UNIQUE sur le nom.
    
    Args:
        conn: Connexion PostgreSQL
        nom_equipe: Nom de l'équipe
        ville: Ville de l'équipe (défaut: 'Rennes')
        status: 'ACTIVE' (configurée par utilisateur) ou 'INACTIVE' (adversaire automatique)
    """
    # Normaliser le nom
    nom_normalized = normalize_team_name(nom_equipe)
    
    sql = """
    INSERT INTO equipes (nom, ville, status) VALUES (%s, %s, %s)
    ON CONFLICT (nom) DO UPDATE SET 
        ville = EXCLUDED.ville,
        status = CASE 
            WHEN EXCLUDED.status = 'ACTIVE' THEN 'ACTIVE'
            ELSE equipes.status
        END
    RETURNING id;
    """
    
    with conn.cursor() as cur:
        try:
            if nom_normalized == "As Default":
                cur.execute(sql, ("AS Default", 'Inconnue', status))
            else:
                cur.execute(sql, (nom_normalized, ville, status))

            equipe_id = cur.fetchone()[0]
            conn.commit()
            return equipe_id
        except Exception as e:
            print(f"Erreur upsert Equipe {nom_normalized}: {e}")
            conn.rollback()
            return None


def normalize_team_name_for_classement(team_name: str) -> str:
    """
    Normalise le nom d'une équipe pour la recherche dans le dictionnaire de classement.
    Enlève les espaces, tirets et met en majuscules.
    """
    return team_name.upper().replace(' ', '').replace('-', '').strip()


def normalize_partie_tableau(value: str | None) -> str | None:
    """
    Normalise les valeurs de partie_tableau pour respecter la contrainte check.
    Accepte: 'supérieur', 'inférieur', 'superieur', 'inferieur' (avec ou sans accent)
    Retourne: 'superieur', 'inferieur' ou None
    """
    if not value:
        return None
    
    value_clean = str(value).lower().strip()
    
    # Remplacer les caractères accentués
    value_clean = value_clean.replace('é', 'e').replace('è', 'e').replace('ê', 'e')
    
    if value_clean in ['superieur', 'supérieur']:
        return 'superieur'
    elif value_clean in ['inferieur', 'inférieur']:
        return 'inferieur'
    else:
        return None


def upsert_joueur(conn, nom_prenom: str, num_maillot: int, id_equipe: int) -> int:
    """Insère ou récupère l'ID d'un joueur."""
    sql = """
    INSERT INTO joueurs (nom_prenom, num_maillot, id_equipe) VALUES (%s, %s, %s)
    ON CONFLICT (nom_prenom, id_equipe) 
    DO UPDATE SET num_maillot = EXCLUDED.num_maillot
    RETURNING id;
    """
    with conn.cursor() as cur:
        try:
            num = int(num_maillot) if str(num_maillot).isdigit() else None
            cur.execute(sql, (nom_prenom, num, id_equipe))
            joueur_id = cur.fetchone()[0]
            conn.commit()
            return joueur_id
        except Exception as e:
            print(f"Erreur upsert Joueur {nom_prenom}: {e}")
            conn.rollback()
            return None


def parse_date_str(date_str: str) -> datetime | None:
    """Tente de parser la chaîne de date/heure fournie par le scraping."""
    date_str_clean = date_str.lower().replace('à', '').strip()
    date_str_clean = date_str_clean.replace('h', ':')

    replacements = {
        'janvier': 'January', 'février': 'February', 'mars': 'March', 'avril': 'April',
        'mai': 'May', 'juin': 'June', 'juillet': 'July', 'août': 'August',
        'septembre': 'September', 'octobre': 'October', 'novembre': 'November', 'décembre': 'December',
    }
    for fr, en in replacements.items():
        date_str_clean = date_str_clean.replace(fr.replace('h', ':'), en)

    days_to_remove = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanc:e']
    for day in days_to_remove:
        date_str_clean = date_str_clean.replace(day, ' ')

    date_str_clean = re.sub(r'\s+', ' ', date_str_clean).strip()

    formats = ["%d %B %Y %H:%M"]

    for fmt in formats:
        try:
            return datetime.strptime(date_str_clean, fmt)
        except ValueError:
            continue

    print(f"    -> ⚠️ Impossible de parser la date: {date_str}")
    return None


def insert_match_stats(conn, match_data: Dict[str, Any], equipe_cible_id: int, nom_equipe_cible: str, competition_id: int = None):
    """
    Insère les données du match et les statistiques détaillées des joueurs.
    Crée les équipes adverses avec status='INACTIVE' et l'équipe configurée avec status='ACTIVE'.
    
    Args:
        competition_id (int): ID de la comptition dans la table Competition (pour mode SaaS)
    """
    match_url = match_data['match_url']
    pdf_url = match_data['pdf_url']
    competition = match_data['competition']

    date_match = parse_date_str(match_data.get('date_match_str', ''))
    recevant_nom_scraped = match_data['equipe_recevant_nom']
    exterieur_nom_scraped = match_data['equipe_exterieur_nom']
    equipe_cible_bdd_name = match_data['equipe_cible_bdd_name']
    home_away = match_data.get('home_away', 'domicile')

    arbitre_1 = match_data.get('arbitre_1', 'Aucun/non défini')
    arbitre_2 = match_data.get('arbitre_2', 'Aucun/non défini')

    # --- Créer les deux équipes avec les bons statuts ---
    if home_away == 'domicile':
        # L'équipe configurée est recevante (ACTIVE), l'adversaire est extérieure (INACTIVE)
        recevant_id = equipe_cible_id
        exterieur_id = upsert_equipe(conn, exterieur_nom_scraped, ville='Inconnue', status='INACTIVE')
    else:
        # L'équipe configurée est extérieure (ACTIVE), l'adversaire est recevante (INACTIVE)
        recevant_id = upsert_equipe(conn, recevant_nom_scraped, ville='Inconnue', status='INACTIVE')
        exterieur_id = equipe_cible_id

    score = f"{match_data['score_recevant']} - {match_data['score_visiteur']}"

    # Extraire les sanctions adverses
    cartons_jaunes_adv = match_data.get('cartons_jaunes_adversaire', 0)
    exclusions_2min_adv = match_data.get('exclusions_2min_adversaire', 0)
    cartons_rouges_adv = match_data.get('cartons_rouges_adversaire', 0)
    sept_metres_adv = match_data.get('sept_metres_adversaire', 0)

    # Extraire les classements des équipes
    classement_recevant = match_data.get('classement_equipe_recevant')
    partie_tableau_recevant = normalize_partie_tableau(match_data.get('partie_tableau_equipe_recevant'))
    classement_exterieur = match_data.get('classement_equipe_exterieur')
    partie_tableau_exterieur = normalize_partie_tableau(match_data.get('partie_tableau_equipe_exterieur'))

    # --- Insertion dans la table matchs ---
    match_sql = """
        INSERT INTO matchs (match_url, pdf_url, competition_name, 
                           recevant_nom_display, exterieur_nom_display,
                           equipe_recevant_id, equipe_exterieur_id, 
                           score_final, date_match, arbitre_1, arbitre_2, 
                           cartons_jaunes_adversaire, exclusions_2min_adversaire, cartons_rouges_adversaire, sept_metres_adversaire,
                           classement_equipe_recevant, partie_tableau_equipe_recevant, classement_equipe_exterieur, partie_tableau_equipe_exterieur,
                           competition_id) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (match_url) DO UPDATE SET 
            recevant_nom_display = EXCLUDED.recevant_nom_display,
            exterieur_nom_display = EXCLUDED.exterieur_nom_display,
            score_final = EXCLUDED.score_final, 
            date_match = COALESCE(EXCLUDED.date_match, matchs.date_match),
            equipe_recevant_id = EXCLUDED.equipe_recevant_id,
            equipe_exterieur_id = EXCLUDED.equipe_exterieur_id,
            arbitre_1 = EXCLUDED.arbitre_1, 
            arbitre_2 = EXCLUDED.arbitre_2,
            cartons_jaunes_adversaire = EXCLUDED.cartons_jaunes_adversaire,
            exclusions_2min_adversaire = EXCLUDED.exclusions_2min_adversaire,
            cartons_rouges_adversaire = EXCLUDED.cartons_rouges_adversaire,
            sept_metres_adversaire = EXCLUDED.sept_metres_adversaire,
            classement_equipe_recevant = EXCLUDED.classement_equipe_recevant,
            partie_tableau_equipe_recevant = EXCLUDED.partie_tableau_equipe_recevant,
            classement_equipe_exterieur = EXCLUDED.classement_equipe_exterieur,
            partie_tableau_equipe_exterieur = EXCLUDED.partie_tableau_equipe_exterieur,
            competition_id = EXCLUDED.competition_id
        RETURNING id;
        """
    match_id = None
    with conn.cursor() as cur:
        try:
            cur.execute(match_sql, (match_url, pdf_url, competition, 
                                    recevant_nom_scraped, exterieur_nom_scraped,
                                    recevant_id, exterieur_id, score, date_match,
                                    arbitre_1, arbitre_2, cartons_jaunes_adv, exclusions_2min_adv, 
                                    cartons_rouges_adv, sept_metres_adv,
                                    classement_recevant, partie_tableau_recevant, classement_exterieur, partie_tableau_exterieur,
                                    competition_id))
            match_id = cur.fetchone()[0]
            conn.commit()
            print(f"    -> [OK] Match inséré/mis à jour. ID: {match_id}")

        except Exception as e:
            print(f"    -> [ERROR] Erreur insertion Match: {e}")
            conn.rollback()
            return

    df_stats: pd.DataFrame = match_data.get('stats_joueurs', pd.DataFrame())
    if not match_id or df_stats.empty:
        return

    equipe_cible_id_for_stats = equipe_cible_id
    
    # L'équipe adverse n'a pas d'ID car elle n'est pas configurée
    id_equipe_adverse = None

    # --- Insertion dans la table Statistiques_Joueur ---
    print(f"    -> Insertion des statistiques de {equipe_cible_bdd_name}...")

    stat_inserts = []

    for index, row in df_stats.iterrows():
        nom_joueur = row['Nom_Prenom']
        num_maillot = row['N']

        joueur_id = upsert_joueur(conn, nom_joueur, num_maillot, equipe_cible_id_for_stats)

        if joueur_id:
            stat_values = (
                match_id,
                joueur_id,
                row.get('Buts', 0),
                row.get('7m', 0),
                row.get('Tirs', 0),
                row.get('Arrets', 0),
                row.get('Avertissements', 0),
                row.get('Exclusions_2min', 0),
                row.get('Discipline', 0),
                id_equipe_adverse
            )
            stat_inserts.append(stat_values)

    if stat_inserts:
        stat_sql = """
            INSERT INTO statistiques_joueur (
                id_match, id_joueur, buts, sept_metres, tirs, arrets, avertissements, exclusions_2min, discipline, id_equipe_adverse
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id_match, id_joueur) 
            DO UPDATE SET 
                buts = EXCLUDED.buts, 
                sept_metres = EXCLUDED.sept_metres, 
                tirs = EXCLUDED.tirs,
                arrets = EXCLUDED.arrets,
                avertissements = EXCLUDED.avertissements,
                exclusions_2min = EXCLUDED.exclusions_2min,
                discipline = EXCLUDED.discipline,
                id_equipe_adverse = EXCLUDED.id_equipe_adverse;
            """

        with conn.cursor() as cur:
            try:
                cur.executemany(stat_sql, stat_inserts)
                conn.commit()
                print(f"    -> [OK] {len(stat_inserts)} statistiques de joueur insérées/mises à jour.")
            except Exception as e:
                print(f"    -> [ERROR] Erreur insertion Stats Joueur: {e}")
                conn.rollback()

