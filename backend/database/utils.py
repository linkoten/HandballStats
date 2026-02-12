# utils.py - Fonctions utilitaires pour la base de données

import psycopg2
from typing import Set
from database.database import get_db_connection


def get_existing_match_urls(conn=None) -> Set[str]:
    """
    Récupère la liste de tous les match_url déjà présents dans la base de données.
    
    Returns:
        Set[str]: Ensemble des URLs de matchs déjà enregistrés
    """
    close_conn = False
    if conn is None:
        conn = get_db_connection()
        close_conn = True
    
    if not conn:
        print("❌ Impossible de se connecter à la base de données")
        return set()
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT match_url FROM Matchs")
            existing_urls = {row[0] for row in cur.fetchall()}
            print(f"📊 {len(existing_urls)} match(s) déjà en base de données")
            return existing_urls
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des URLs existantes: {e}")
        return set()
    finally:
        if close_conn and conn:
            conn.close()


def get_matches_without_pdf(conn=None) -> Set[str]:
    """
    Récupère la liste des match_url qui n'ont pas encore de PDF associé.
    
    Returns:
        Set[str]: Ensemble des URLs de matchs sans PDF
    """
    close_conn = False
    if conn is None:
        conn = get_db_connection()
        close_conn = True
    
    if not conn:
        print("❌ Impossible de se connecter à la base de données")
        return set()
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT match_url FROM Matchs WHERE pdf_url IS NULL OR pdf_url = ''")
            urls_without_pdf = {row[0] for row in cur.fetchall()}
            if urls_without_pdf:
                print(f"⏳ {len(urls_without_pdf)} match(s) en attente de PDF")
            return urls_without_pdf
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des matchs sans PDF: {e}")
        return set()
    finally:
        if close_conn and conn:
            conn.close()


def get_matches_without_stats(conn=None) -> Set[str]:
    """
    Récupère la liste des match_url qui n'ont pas encore de statistiques joueurs.
    
    Returns:
        Set[str]: Ensemble des URLs de matchs sans statistiques
    """
    close_conn = False
    if conn is None:
        conn = get_db_connection()
        close_conn = True
    
    if not conn:
        print("❌ Impossible de se connecter à la base de données")
        return set()
    
    try:
        with conn.cursor() as cur:
            # Sélectionner les matchs qui n'ont aucune statistique associée
            cur.execute("""
                SELECT m.match_url 
                FROM Matchs m
                LEFT JOIN Statistiques_Joueur s ON m.id = s.id_match
                GROUP BY m.match_url
                HAVING COUNT(s.id) = 0
            """)
            urls_without_stats = {row[0] for row in cur.fetchall()}
            if urls_without_stats:
                print(f"📊 {len(urls_without_stats)} match(s) en attente de statistiques")
            return urls_without_stats
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des matchs sans stats: {e}")
        return set()
    finally:
        if close_conn and conn:
            conn.close()
