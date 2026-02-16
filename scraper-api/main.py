# Ajout pour endpoint /scrape/batch

from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import sys
import os
import argparse

app = FastAPI(
    title="Handball Stats API",
    description="API pour les statistiques de handball ASCR",
    version="1.0.0"
)

class CompetitionConfig(BaseModel):
    competitionId: Optional[int] = None
    equipeId: Optional[int] = None
    url: str
    equipe: str
    equipe_bdd: str
    competition_name: str
    poule: str
    max_journees: int
    saison: str
    phase: Optional[str] = None

class ScrapeBatchRequest(BaseModel):
    competitions: list[CompetitionConfig]

def run_scraper_batch(competitions: list[dict]):
    import sys
    import json
    # Remplace BASE_URLS par la config reçue
    global BASE_URLS
    original_base_urls = BASE_URLS.copy()
    BASE_URLS = [dict(c) for c in competitions]
    try:
        main(mode='full')
    finally:
        BASE_URLS = original_base_urls




# Ajouter le répertoire parent au path pour les imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Essayer d'importer avec différentes méthodes pour compatibilité Docker/Local
try:
    # Méthode 1: Import relatif au package scraper (pour python -m scraper.main)
    from scraper.config import BASE_URLS
    from scraper.scraping import init_driver, get_match_data_from_journee_dynamic, get_pdf_url_from_match_page, get_referees_from_match_page
    from scraper.parsing import parse_pdf_data_pdfplumber
    from scraper.classement import scrape_classement_complet, build_classement_url
except ImportError:
    # Méthode 2: Import direct depuis le dossier courant
    from config import BASE_URLS
    from scraping import init_driver, get_match_data_from_journee_dynamic, get_pdf_url_from_match_page, get_referees_from_match_page
    from parsing import parse_pdf_data_pdfplumber
    from classement import scrape_classement_complet, build_classement_url

from database.database import get_db_connection, upsert_equipe, insert_match_stats, normalize_team_name_for_classement, update_competition_progress
from typing import Dict, Any, List, Set



# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# ENDPOINTS API
# ============================================

@app.get("/")
async def root():
    """Point d'entrée principal de l'API"""
    return {
        "message": "Bienvenue sur l'API Handball Stats",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Vérification de santé du service"""
    return {"status": "healthy"}

@app.post("/scrape/batch")
async def scrape_batch(request: ScrapeBatchRequest, background_tasks: BackgroundTasks):
    """Déclenche le scraping batch avec la configuration envoyée par le front"""
    import logging
    logging.basicConfig(level=logging.INFO)
    logging.info(f"[API] Reçu POST /scrape/batch avec {len(request.competitions)} compétitions")
    for idx, comp in enumerate(request.competitions, 1):
        logging.info(f"[API] Compétition {idx}: {comp}")
    background_tasks.add_task(run_scraper_batch, [c.dict() for c in request.competitions])
    logging.info("[API] Scraping lancé en tâche de fond")
    return {"status": "scraping started", "count": len(request.competitions)}

# TODO: Ajoutez vos autres endpoints ici
# @app.post("/scrape")
# async def trigger_scrape():
#     """Déclencher un scraping"""
#     # Appeler votre fonction main() de scraping
#     return {"status": "scraping started"}

# ============================================
# FONCTIONS DE SCRAPING (votre code existant)
# ============================================


# Fonctions utilitaires pour la gestion incrmentale
def get_last_match_journee_for_team(conn, competition_name: str) -> int:
    """
    Rcupre le numro de la dernire journe joue pour une comptition donne.
    Retourne 0 si aucun match n'est trouv.
    """
    if not conn:
        return 0
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT match_url 
                FROM Matchs 
                WHERE competition_name = %s
                ORDER BY id DESC
                LIMIT 1
            """, (competition_name,))
            result = cur.fetchone()
            
            if result:
                match_url = result[0]
                # Extraire le numro de journe depuis l'URL (ex: journee-5)
                import re
                journee_match = re.search(r'journee-(\d+)', match_url)
                if journee_match:
                    journee_num = int(journee_match.group(1))
                    print(f"    Dernire journe en BDD pour {competition_name}: J{journee_num}")
                    return journee_num
            return 0
    except Exception as e:
        print(f"[ERROR] Erreur lors de la rcupration de la dernire journe: {e}")
        return 0


def get_existing_match_urls(conn) -> Set[str]:
    """Rcupre la liste de tous les match_url dj prsents dans la base de donnes."""
    if not conn:
        return set()
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT match_url FROM Matchs")
            existing_urls = {row[0] for row in cur.fetchall()}
            print(f"[INFO] {len(existing_urls)} match(s) deja en base de donnees")
        return existing_urls
    except Exception as e:
        print(f"[ERROR] Erreur lors de la recuperation des URLs existantes: {e}")
        return set()


def get_matches_without_pdf(conn) -> Set[str]:
    """Rcupre la liste des match_url qui n'ont pas encore de PDF associ."""
    if not conn:
        return set()
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT match_url FROM Matchs WHERE pdf_url IS NULL OR pdf_url = ''")
            urls_without_pdf = {row[0] for row in cur.fetchall()}
            if urls_without_pdf:
                print(f" {len(urls_without_pdf)} match(s) en attente de PDF")
            return urls_without_pdf
    except Exception as e:
        print(f"[ERROR] Erreur lors de la recuperation des matchs sans PDF: {e}")
        return set()


def get_matches_without_stats(conn) -> Set[str]:
    """Rcupre la liste des match_url qui n'ont pas encore de statistiques joueurs."""
    if not conn:
        return set()
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT m.match_url 
                FROM Matchs m
                LEFT JOIN Statistiques_Joueur s ON m.id = s.id_match
                GROUP BY m.match_url
                HAVING COUNT(s.id) = 0
            """)
            urls_without_stats = {row[0] for row in cur.fetchall()}
            if urls_without_stats:
                print(f"[INFO] {len(urls_without_stats)} match(s) en attente de statistiques")
            return urls_without_stats
    except Exception as e:
        print(f"[ERROR] Erreur lors de la recuperation des matchs sans stats: {e}")
        return set()


def print_final_results(all_match_stats: list):
    """Affiche les rsultats finaux du scraping."""
    print("\n\n#####################################################")
    print(" [OK] Scraping et Parsing termines.")
    print("#####################################################")

    competitions_stats = {}
    for result in all_match_stats:
        comp_name = result.get('competition', 'Inconnue')
        if comp_name not in competitions_stats:
            competitions_stats[comp_name] = []
        competitions_stats[comp_name].append(result)

    total_buts_global = 0
    matchs_avec_stats_global = 0

    for competition, matches in competitions_stats.items():
        print(f"\n[COMP] === COMPTITION: {competition} ({len(matches)} match(s)) ===")
        total_buts_competition = 0
        total_matchs_avec_stats = 0

        for result in matches:
            equipe_nom = result.get('equipe_cible_nom', 'quipe inconnue')
            match_id = result.get('match_id', 'N/A')
            adversaire_nom = result.get('equipe_adverse_nom', 'N/A')
            date_match_str = result.get('date_match_str', 'N/A')

            print(f"\n--- Match {match_id} ({equipe_nom} vs {adversaire_nom}) ---")
            print(f"Date: {date_match_str}")
            print(f"URL PDF : {result.get('pdf_url')}")

            score_rec = result.get('score_recevant')
            score_vis = result.get('score_visiteur')
            if score_rec and score_vis:
                print(f"SCORE FINAL : {score_rec} - {score_vis}")

            df = result.get('stats_joueurs')
            if df is not None and not df.empty:
                print(f"\nSTATS DES JOUEURS ({equipe_nom}) :")
                print(df.to_string())

                if 'Buts' in df.columns:
                    total_buts = df['Buts'].sum()
                    total_buts_competition += total_buts
                    total_matchs_avec_stats += 1

                    print(f"\n[INFO] Rsum: {len(df)} joueurs, {int(total_buts)} buts au total")

                    if total_buts > 0:
                        top_buteur = df.loc[df['Buts'].idxmax()]
                        nom_buteur = top_buteur.get('Nom_Prenom', 'N/A')
                        buts_buteur = int(top_buteur.get('Buts', 0))
                        print(f"[COMP] Meilleur buteur: {nom_buteur} ({buts_buteur} buts)")
            else:
                print("Aucune statistique de joueur n'a pu tre extraite pour ce match.")

        if total_matchs_avec_stats > 0:
            print(f"\n === RSUM {competition} ===")
            print(f"[INFO] Matchs avec stats: {total_matchs_avec_stats}")
            print(f" Total buts sur la comptition: {int(total_buts_competition)}")
            print(f"[INFO] Moyenne buts/match: {total_buts_competition / total_matchs_avec_stats:.1f}")
            total_buts_global += total_buts_competition
            matchs_avec_stats_global += total_matchs_avec_stats

    print(f"\n === STATISTIQUES GLOBALES ===")
    print(f"[COMP] Comptitions analyses: {len(competitions_stats)}")
    matchs_totaux = len([r for m in competitions_stats.values() for r in m])
    print(f"[INFO] Total matchs: {matchs_totaux}")
    matchs_avec_pdf = len([r for r in all_match_stats if r.get('pdf_url')])
    print(f" Matchs avec PDF: {matchs_avec_pdf}")
    print(f"[INFO] Matchs avec stats extraites: {matchs_avec_stats_global}")

    if matchs_avec_stats_global > 0:
        print(f" Total buts toutes comptitions: {int(total_buts_global)}")
        print(f"[INFO] Moyenne buts/match global: {total_buts_global / matchs_avec_stats_global:.1f}")


def rescrape_single_match(match_url: str):
    """
    Rescrape un match spcifique par son URL et met  jour toutes ses donnes.
    
    Args:
        match_url (str): URL complte du match  rescraper
    """
    conn = get_db_connection()
    if not conn:
        print("[ERROR] Impossible de se connecter  la base de donnes")
        return
    
    driver = init_driver()
    if not driver:
        print("[ERROR] Impossible d'initialiser le driver Selenium")
        if conn:
            conn.close()
        return
    
    try:
        # Rcuprer les infos compltes du match existant
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    m.id, 
                    m.competition_name, 
                    m.score_final,
                    m.date_match,
                    er.nom as equipe_recevant_nom,
                    ev.nom as equipe_visiteur_nom
                FROM Matchs m
                JOIN Equipes er ON m.equipe_recevant_id = er.id
                JOIN Equipes ev ON m.equipe_exterieur_id = ev.id
                WHERE m.match_url = %s
            """, (match_url,))
            match_info = cur.fetchone()
        
        if not match_info:
            print(f"[ERROR] Aucun match trouv avec l'URL: {match_url}")
            return
        
        match_id, competition_name, score_final, date_match, equipe_recevant_nom, equipe_visiteur_nom = match_info
        print(f" Rescraping du match ID {match_id}")
        print(f"   Competition: {competition_name}")
        print(f"   URL: {match_url}\n")
        
        # Trouver la config de la comptition
        competition_config = None
        for config in BASE_URLS:
            if config["competition_name"] == competition_name:
                competition_config = config
                break
        
        if not competition_config:
            print(f"[ERROR] Configuration introuvable pour la comptition: {competition_name}")
            return
        
        equipe_cible_nom = competition_config["equipe"]
        equipe_cible_bdd_name = competition_config["equipe_bdd"]
        
        # Rcuprer le PDF
        print(" Rcupration du lien PDF...")
        pdf_url = get_pdf_url_from_match_page(driver, match_url)
        
        if not pdf_url:
            print("[ERROR] Impossible de rcuprer l'URL du PDF")
            return
        
        print(f"   [OK] PDF trouv: {pdf_url}")
        
        # Parser le PDF
        print("[INFO] Parsing des statistiques...")
        parsed_pdf_data = parse_pdf_data_pdfplumber(pdf_url, equipe_cible_nom)
        
        stats_df = parsed_pdf_data.get('joueurs_recevant', pd.DataFrame())
        arbitre_1 = parsed_pdf_data.get('arbitre_1', 'Aucun/non dfini')
        arbitre_2 = parsed_pdf_data.get('arbitre_2', None)
        
        if stats_df.empty:
            print("[ERROR] Aucune statistique extraite du PDF")
            return
        
        print(f"   [OK] {len(stats_df)} joueur(s) trouv(s)")
        print(f"   [OK] Arbitres: {arbitre_1}, {arbitre_2 or 'Aucun'}")
        
        # Supprimer les anciennes statistiques
        print("\n[DELETE]  Suppression des anciennes statistiques...")
        with conn.cursor() as cur:
            cur.execute("DELETE FROM Statistiques_Joueur WHERE id_match = %s", (match_id,))
            deleted_count = cur.rowcount
            conn.commit()
        print(f"   [OK] {deleted_count} ligne(s) supprime(s)")
        
        # Mettre  jour le match (PDF URL et arbitres)
        print("\n Mise  jour du match...")
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE Matchs
                SET pdf_url = %s, arbitre_1 = %s, arbitre_2 = %s
                WHERE id = %s
            """, (pdf_url, arbitre_1, arbitre_2, match_id))
            conn.commit()
        print("   [OK] Match mis  jour")
        
        # Rinsrer les nouvelles statistiques
        print("\n Insertion des nouvelles statistiques...")
        
        # Parser le score
        score_parts = score_final.split('-') if score_final else ['0', '0']
        score_recevant = score_parts[0].strip() if len(score_parts) > 0 else '0'
        score_visiteur = score_parts[1].strip() if len(score_parts) > 1 else '0'
        
        match_result = {
            'match_url': match_url,
            'pdf_url': pdf_url,
            'stats_joueurs': stats_df,
            'competition': competition_name,
            'equipe_cible_nom': equipe_cible_nom,
            'equipe_cible_bdd_name': equipe_cible_bdd_name,
            'arbitre_1': arbitre_1,
            'arbitre_2': arbitre_2,
            'equipe_recevant_nom': equipe_recevant_nom,
            'equipe_visiteur_nom': equipe_visiteur_nom,
            'equipe_exterieur_nom': equipe_visiteur_nom,  # Alias pour compatibilit
            'score_recevant': score_recevant,
            'score_visiteur': score_visiteur,
            'date_match_str': date_match.strftime('%d/%m/%Y') if date_match else '',
            'home_away': parsed_pdf_data.get('home_away', 'domicile'),
            'cartons_jaunes_adversaire': parsed_pdf_data.get('cartons_jaunes_adversaire', 0),
            'exclusions_2min_adversaire': parsed_pdf_data.get('exclusions_2min_adversaire', 0),
            'cartons_rouges_adversaire': parsed_pdf_data.get('cartons_rouges_adversaire', 0),
            'sept_metres_adversaire': parsed_pdf_data.get('sept_metres_adversaire', 0),
            # Classements: laisss  None car on n'a pas accs au classement historique lors du rescrape
            'classement_equipe_recevant': None,
            'partie_tableau_equipe_recevant': None,
            'classement_equipe_exterieur': None,
            'partie_tableau_equipe_exterieur': None
        }
        
        insert_match_stats(conn, match_result, match_id, equipe_cible_bdd_name, competition_id=None)
        
        print(f"\n[OK] Rescraping termin avec succs!")
        print(f"   - Match ID: {match_id}")
        print(f"   - {len(stats_df)} statistiques de joueurs insres")
        print(f"   - Arbitres mis  jour")
        
    except Exception as e:
        print(f"\n[ERROR] Erreur lors du rescraping: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if driver:
            driver.quit()
        if conn:
            conn.close()


def update_referees_for_all_matches():
    """
    Met  jour les arbitres pour tous les matchs existants en base de donnes
    en extrayant les informations depuis les PDFs.
    """
    conn = get_db_connection()
    if not conn:
        print("[ERROR] Impossible de se connecter  la base de donnes")
        return
    
    try:
        # Rcuprer tous les matchs avec leur URL de PDF
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, match_url, pdf_url
                FROM Matchs
                WHERE pdf_url IS NOT NULL AND pdf_url != ''
                ORDER BY id
            """)
            matches = cur.fetchall()
        
        print(f" Mise  jour des arbitres pour {len(matches)} match(s)\n")
        
        updated_count = 0
        error_count = 0
        
        for idx, (match_id, match_url, pdf_url) in enumerate(matches, 1):
            print(f"[{idx}/{len(matches)}] Match ID {match_id} - {match_url}")
            
            try:
                # Parser le PDF pour extraire les arbitres
                from scraper.parsing import parse_pdf_data_pdfplumber
                parsed_data = parse_pdf_data_pdfplumber(pdf_url, "")  # equipe_cible non ncessaire pour les arbitres
                
                arbitre_1 = parsed_data.get('arbitre_1', 'Aucun/non dfini')
                arbitre_2 = parsed_data.get('arbitre_2', None)
                
                # Mettre  jour la base de donnes
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE Matchs
                        SET arbitre_1 = %s, arbitre_2 = %s
                        WHERE id = %s
                    """, (arbitre_1, arbitre_2, match_id))
                    conn.commit()
                
                print(f"    [OK] Arbitres mis  jour: {arbitre_1}, {arbitre_2 or 'Aucun/non dfini'}")
                updated_count += 1
                
            except Exception as e:
                print(f"    [ERROR] Erreur: {e}")
                error_count += 1
                continue
        
        print(f"\n[OK] Mise  jour termine:")
        print(f"   - {updated_count} match(s) mis  jour")
        print(f"   - {error_count} erreur(s)")
        
    finally:
        if conn:
            conn.close()


def main(mode='full', competition_id=None, equipe_id=None):
    """
    Fonction principale d'excution du scraper.
    
    Args:
        mode (str): 
            - 'full': Rcupre tous les matchs (toutes les journes)
            - 'incremental': Rcupre uniquement les nouveaux matchs
            - 'update-pdf': Met  jour les PDFs manquants pour les matchs existants
            - 'update-referees': Met  jour les arbitres de tous les matchs existants
        competition_id (int): ID de la comptition dans la base de donnes (pour mode SaaS)
        equipe_id (int): ID de l'quipe dans la base de donnes (pour mode SaaS, vite les doublons)
    """
    # Mode spcial pour mettre  jour les arbitres
    if mode == 'update-referees':
        update_referees_for_all_matches()
        return
    
    driver = init_driver()
    all_match_data_initial: List[Dict[str, Any]] = []
    all_match_stats = []
    conn = get_db_connection()
    
    # Mettre à jour le statut de la compétition à IN_PROGRESS si competition_id fourni
    if competition_id and conn:
        print(f"[DEBUG] Starting competition {competition_id} with connection {conn}", flush=True)
        update_competition_progress(conn, competition_id, 0, "Initialisation du scraper...", "IN_PROGRESS")
        print(f"[SaaS] Statut de la comptition {competition_id} mis a jour: IN_PROGRESS", flush=True)
    
    # Rcuprer les URLs existantes en BDD selon le mode
    existing_urls = set()
    urls_to_retry = set()
    
    if mode == 'incremental':
        # En mode incrmental, on ne rcupre que les URLs pour vrifier les doublons
        existing_urls = get_existing_match_urls(conn)
    elif mode == 'update-pdf':
        existing_urls = get_existing_match_urls(conn)
        urls_to_retry = get_matches_without_pdf(conn) | get_matches_without_stats(conn)
        print(f" Mode mise  jour: {len(urls_to_retry)} match(s)  retraiter\n")

    try:
        if driver is not None:
            # TAPE 0 : Scraping des classements complets pour toutes les poules
            print(f"\n[INFO] ETAPE 0: Recuperation des classements complets", flush=True)
            
            if competition_id and conn:
                print(f"[DEBUG] Updating progress to 5% for competition {competition_id}", flush=True)
                update_competition_progress(conn, competition_id, 5, "Recuperation des classements...")
            
            classements_by_poule = {}  # Dict: poule -> dict des classements
            
            for competition_config in BASE_URLS:
                competition_url = competition_config['url']
                poule = competition_config['poule']
                competition_name = competition_config["competition_name"]
                
                print(f"\n--- Classement {competition_name} ---")
                classement_url = build_classement_url(competition_url, poule)
                classements = scrape_classement_complet(driver, classement_url)
                
                if classements:
                    classements_by_poule[poule] = classements
                    print(f"    -> [OK] {len(classements)} quipes au classement")
                else:
                    print(f"    -> [WARN] Aucun classement rcupr")
            
            print(f"\n[OK] Classements recuperes pour {len(classements_by_poule)} poule(s)", flush=True)

            if competition_id and conn:
                update_competition_progress(conn, competition_id, 15, f"Classements recuperes ({len(classements_by_poule)} poule(s))")
            
            # TAPE 1 : Rcupration des URLs de Matchs et des DONNES GNRALES
            print(f"\n[COMP] Mode: {mode.upper()}", flush=True)
            print(f"[COMP] Analyse de {len(BASE_URLS)} comptition(s) :", flush=True)
            
            if competition_id and conn:
                update_competition_progress(conn, competition_id, 20, "Recherche des matchs...")
            
            for url_idx, competition_config in enumerate(BASE_URLS, 1):
                competition_name = competition_config["competition_name"]
                max_journees = competition_config.get("max_journees")

                print(f"\n--- [COMP] COMPETITION {url_idx}/{len(BASE_URLS)}: {competition_name} (Max J: {max_journees}) ---", flush=True)

                # Dterminer le point de dpart selon le mode
                start_journee = 1
                if mode == 'incremental':
                    last_journee = get_last_match_journee_for_team(conn, competition_name)
                    start_journee = last_journee + 1 if last_journee > 0 else 1
                    print(f"   [FAST] Mode incrmental: Dmarrage  la journe {start_journee}")
                
                competition_match_count = 0
                new_matches_count = 0
                pdf_not_found = False  # Flag pour arrter si pas de PDF
                
                for j in range(start_journee, max_journees + 1):
                    # Update progress (20-40%)
                    if competition_id and conn:
                         total_days = max_journees - start_journee + 1
                         current_day_idx = j - start_journee + 1
                         prog = 20 + int((current_day_idx / total_days) * 20) if total_days > 0 else 40
                         print(f"[DEBUG] Analysing day {j}/{max_journees}, progress: {prog}%, matches found: {competition_match_count}", flush=True)
                         update_competition_progress(conn, competition_id, prog, f"Analyse journee {j}/{max_journees} - {competition_match_count} match(s) trouve(s)")

                    # En mode incrmental, arrter si le match prcdent n'avait pas de PDF
                    if mode == 'incremental' and pdf_not_found:
                        print(f"    [PAUSE]  Arrt: Match sans PDF dtect  la journe prcdente")
                        break
                    
                    print(f"[DEBUG] Getting match data for day {j}...", flush=True)
                    try:
                        data_cette_journee = get_match_data_from_journee_dynamic(driver, competition_config, j)
                        print(f"[DEBUG] Day {j} returned {len(data_cette_journee) if data_cette_journee else 0} matches", flush=True)
                    except Exception as e:
                        print(f"[ERROR] Failed to get match data for day {j}: {e}", flush=True)
                        data_cette_journee = []
                        continue
                    
                    for match_data in data_cette_journee:
                        match_data['competition'] = competition_name
                        match_data['equipe_cible_nom'] = competition_config["equipe"]
                        match_data['poule'] = competition_config["poule"]
                        match_data['equipe_cible_bdd_name'] = competition_config["equipe_bdd"]
                        
                        match_url = match_data['match_url']
                        
                        # Filtrage selon le mode
                        if mode == 'incremental':
                            # Mode incrmental : ne garder que les nouveaux matchs
                            if match_url not in existing_urls:
                                # Vrifier immdiatement si le PDF existe
                                temp_pdf_url = get_pdf_url_from_match_page(driver, match_url)
                                if temp_pdf_url:
                                    match_data['pdf_url_temp'] = temp_pdf_url  # Stocker temporairement
                                    all_match_data_initial.append(match_data)
                                    new_matches_count += 1
                                    print(f"       [OK] Nouveau match avec PDF trouv")
                                else:
                                    print(f"       [PAUSE]  Match sans PDF - arrt pour cette quipe")
                                    pdf_not_found = True
                                    break  # Sortir de la boucle des matchs
                        elif mode == 'update-pdf':
                            # Mode update-pdf : ne traiter que les matchs  retraiter
                            if match_url in urls_to_retry:
                                all_match_data_initial.append(match_data)
                                new_matches_count += 1
                        else:
                            # Mode full : tout traiter
                            all_match_data_initial.append(match_data)
                            new_matches_count += 1

                    if data_cette_journee:
                        if mode == 'incremental':
                            journee_nouveaux = new_matches_count - competition_match_count
                            print(f"    [OK] Journe {j}: {journee_nouveaux} nouveau(x) match(s)")
                        else:
                            print(f"    [OK] Journe {j}: {len(data_cette_journee)} match(s) trouv(s)")
                        competition_match_count = new_matches_count
                    else:
                        print(f"    [ERROR] Journe {j}: aucun match trouv")
                        if mode == 'incremental':
                            # Pas de match = on arrte pour cette quipe
                            break

                print(f"--- Total pour {competition_name}: {competition_match_count} match(s)  traiter ---", flush=True)
                print(f"[DEBUG] Competition {url_idx}/{len(BASE_URLS)} complete. Moving to next...", flush=True)

            if mode == 'incremental':
                print(f"\n[TARGET] NOUVEAUX MATCHS: {len(all_match_data_initial)} match(s)  ajouter")
            else:
                print(f"\n[TARGET] TOTAL GNRAL: {len(all_match_data_initial)} match(s)  traiter")

            # Si aucun nouveau match en mode incrmental, on s'arrte l
            if mode == 'incremental' and len(all_match_data_initial) == 0:
                print("\n[OK] Aucun nouveau match a recuperer. Base de donnees a jour !", flush=True)
                return

            # TAPE 2 & 3 : Extraction du Lien PDF et Parsing des STATS JOUEURS
            print("\n\n--- Demarrage de la recuperation des liens PDF, Parsing des Stats et Enregistrement BDD ---", flush=True)
            
            total_matches = len(all_match_data_initial)
            if competition_id and conn:
                if total_matches == 0:
                    update_competition_progress(conn, competition_id, 95, "Aucun nouveau match a traiter")
                else:
                    update_competition_progress(conn, competition_id, 45, f"Traitement des {total_matches} match(s) trouve(s)...")

            for i, match_data in enumerate(all_match_data_initial):
                # Update progress (45-95%)
                if competition_id and conn:
                    prog = 45 + int(((i) / total_matches) * 50) if total_matches > 0 else 95
                    match_info = f"{match_data.get('equipe_recevant_nom', 'N/A')} vs {match_data.get('equipe_exterieur_nom', 'N/A')}"
                    if len(match_info) > 40:
                        match_info = match_info[:37] + "..."
                    print(f"[DEBUG] Processing match {i+1}/{total_matches}, updating to {prog}%", flush=True)
                    update_competition_progress(conn, competition_id, prog, f"Match {i+1}/{total_matches}: {match_info}")

                match_url = match_data['match_url']
                match_id = match_url.split('/rencontre-')[-1].replace('/', '')
                equipe_cible_nom = match_data['equipe_cible_nom']
                equipe_cible_bdd_name = match_data['equipe_cible_bdd_name']

                print(f"\n[Match {i + 1}/{len(all_match_data_initial)}] Traitement du Match ID: {match_id} - quipe BDD: {equipe_cible_bdd_name}", flush=True)
                print(f"Date: {match_data.get('date_match_str', 'N/A')} | Score: {match_data['score_recevant']} - {match_data['score_visiteur']}", flush=True)

                # Rcupration du lien PDF (utiliser celui dj rcupr en mode incrmental)
                if 'pdf_url_temp' in match_data:
                    pdf_url = match_data['pdf_url_temp']
                    print(f"    -> PDF dj rcupr: {pdf_url}", flush=True)
                else:
                    pdf_url = get_pdf_url_from_match_page(driver, match_url)
                
                match_data['pdf_url'] = pdf_url

                match_result = {
                    **match_data,
                    'match_id': match_id,
                    'stats_joueurs': pd.DataFrame()
                }

                if pdf_url:
                    print(f"    -> PDF trouve, parsing en cours...", flush=True)
                    parsed_pdf_data = parse_pdf_data_pdfplumber(pdf_url, equipe_cible_nom)
                    match_result.update({
                        'stats_joueurs': parsed_pdf_data.get('joueurs_recevant', pd.DataFrame()),
                        'home_away': parsed_pdf_data.get('home_away', match_data['home_away']),
                        'arbitre_1': parsed_pdf_data.get('arbitre_1', 'Aucun/non dfini'),
                        'arbitre_2': parsed_pdf_data.get('arbitre_2', None),
                        'cartons_jaunes_adversaire': parsed_pdf_data.get('cartons_jaunes_adversaire', 0),
                        'exclusions_2min_adversaire': parsed_pdf_data.get('exclusions_2min_adversaire', 0),
                        'cartons_rouges_adversaire': parsed_pdf_data.get('cartons_rouges_adversaire', 0),
                        'sept_metres_adversaire': parsed_pdf_data.get('sept_metres_adversaire', 0)
                    })
                    if not parsed_pdf_data.get('joueurs_recevant', pd.DataFrame()).empty:
                        nb_joueurs = len(parsed_pdf_data.get('joueurs_recevant', pd.DataFrame()))
                        print(f"    -> [OK] {nb_joueurs} joueur(s) avec statistiques extraits", flush=True)
                else:
                    print(f"    -> [WARN] Aucun PDF disponible pour ce match", flush=True)
                    match_result.update({
                        'arbitre_1': 'Aucun/non dfini',
                        'arbitre_2': None,
                        'cartons_jaunes_adversaire': 0,
                        'exclusions_2min_adversaire': 0,
                        'cartons_rouges_adversaire': 0,
                        'sept_metres_adversaire': 0
                    })

                # Enrichir avec les classements des quipes
                poule_match = match_data.get('poule')
                if poule_match and poule_match in classements_by_poule:
                    classements_poule = classements_by_poule[poule_match]
                    
                    # Normaliser les noms d'quipes
                    recevant_normalized = normalize_team_name_for_classement(match_data['equipe_recevant_nom'])
                    exterieur_normalized = normalize_team_name_for_classement(match_data['equipe_exterieur_nom'])
                    
                    # Chercher les classements
                    if recevant_normalized in classements_poule:
                        match_result['classement_equipe_recevant'] = classements_poule[recevant_normalized]['classement']
                        match_result['partie_tableau_equipe_recevant'] = classements_poule[recevant_normalized]['partie_tableau']
                    else:
                        print(f"    -> [WARN] Classement non trouv pour {match_data['equipe_recevant_nom']} (normalis: {recevant_normalized})")
                    
                    if exterieur_normalized in classements_poule:
                        match_result['classement_equipe_exterieur'] = classements_poule[exterieur_normalized]['classement']
                        match_result['partie_tableau_equipe_exterieur'] = classements_poule[exterieur_normalized]['partie_tableau']
                    else:
                        print(f"    -> [WARN] Classement non trouv pour {match_data['equipe_exterieur_nom']} (normalis: {exterieur_normalized})")

                all_match_stats.append(match_result)

                # ENREGISTREMENT DANS LA BDD
                if conn and not match_result['stats_joueurs'].empty:
                    print("    -> [DB] Demarrage de l'enregistrement dans la BDD...", flush=True)
                    
                    # Si equipe_id est fourni (mode SaaS), l'utiliser directement
                    # Sinon créer/récupérer l'équipe via upsert (mode legacy)
                    if equipe_id:
                        equipe_cible_id = equipe_id
                        print(f"    -> [SaaS] Utilisation de l'equipe ID: {equipe_id}", flush=True)
                    else:
                        # Mode legacy : créer l'équipe avec upsert
                        equipe_cible_id = upsert_equipe(conn, equipe_cible_bdd_name, status='ACTIVE')
                    
                    if equipe_cible_id:
                        success = insert_match_stats(conn, match_result, equipe_cible_id, equipe_cible_bdd_name, competition_id=competition_id)
                        if success:
                            print("    -> [DB] Match enregistre avec succes", flush=True)
                        else:
                            print("    -> [DB][ERROR] Echec enregistrement du match", flush=True)
                    else:
                        print("    -> [ERROR] Impossible d'enregistrer l'equipe cible.", flush=True)
                elif conn:
                    print("    -> [WARN] Match ignore pour l'insertion BDD (manque de stats).", flush=True)

        # Succès fin de traitement
        if competition_id and conn:
            matches_processed = len([m for m in all_match_stats if not m.get('stats_joueurs', pd.DataFrame()).empty])
            print(f"[DEBUG] Scraping completed! {matches_processed} matches processed, updating to 100%", flush=True)
            update_competition_progress(conn, competition_id, 100, f"Scraping termine ! {matches_processed} match(s) avec statistiques", "COMPLETED")

    except Exception as e:
        print(f"[ERROR] Erreur critique pendant le scraping: {e}", flush=True)
        if competition_id and conn:
             error_msg = str(e)[:80] + "..." if len(str(e)) > 80 else str(e)
             print(f"[DEBUG] Error occurred, updating to FAILED status", flush=True)
             update_competition_progress(conn, competition_id, 0, f"Erreur: {error_msg}", "FAILED")
        raise e

    finally:
        if driver is not None:
            driver.quit()
        if conn:
            conn.close()

    print_final_results(all_match_stats)


if __name__ == "__main__":
    # Parsing des arguments de ligne de commande
    parser = argparse.ArgumentParser(description='Scraper de statistiques Handball')
    parser.add_argument(
        '--mode',
        type=str,
        choices=['full', 'incremental', 'update-pdf', 'update-referees', 'rescrape'],
        default='full',
        help="""Mode d'excution:
        - full: Rcupre tous les matchs (dfaut)
        - incremental: Rcupre uniquement les nouveaux matchs
        - update-pdf: Met  jour les PDFs manquants
        - update-referees: Met  jour les arbitres de tous les matchs existants
        - rescrape: Rescrape un match spcifique (ncessite --match-url)
        """
    )
    parser.add_argument(
        '--match-url',
        type=str,
        help='URL complte du match  rescraper (utilis avec --mode rescrape)'
    )
    parser.add_argument(
        '--config',
        type=str,
        help='Configuration JSON pour une comptition unique (utilis par l\'API SaaS)'
    )
    parser.add_argument(
        '--competition-id',
        type=int,
        help='ID de la comptition dans la base de donnes (utilis par l\'API SaaS)'
    )
    
    args = parser.parse_args()
    
    # Si --config est fourni, utiliser cette configuration unique ou multiple
    if args.config:
        import json
        import sys
        try:
            # Si config est "-", lire depuis stdin
            if args.config == "-":
                print("[DEBUG] Lecture de la configuration depuis stdin...", flush=True)
                config_text = sys.stdin.read()
                print(f"[DEBUG] Configuration lue ({len(config_text)} caracteres): {config_text[:200]}...", flush=True)
            else:
                config_text = args.config
            
            # Parser la configuration JSON
            config = json.loads(config_text)
            print("[DEBUG] Configuration JSON parsee avec succes", flush=True)
            
        except json.JSONDecodeError as e:
            print(f"[ERROR] Configuration JSON invalide: {e}", flush=True)
            print(f"[ERROR] Contenu recu: {config_text}", flush=True)
            sys.exit(1)
        except Exception as e:
            print(f"[ERROR] Erreur lors de la lecture de la configuration: {e}", flush=True)
            sys.exit(1)
        
        # Grer les configurations multiples
        if isinstance(config, list):
            configs = config
        else:
            configs = [config]
        
        print(f"[SaaS Mode] Scraping de {len(configs)} competition(s)", flush=True)
        print(f"[DEBUG] Configuration complete: {config}", flush=True)
        
        # Remplacer temporairement BASE_URLS par ces configs
        global BASE_URLS
        original_base_urls = BASE_URLS.copy()
        BASE_URLS = configs
        
        # Traiter chaque configuration
        for idx, cfg in enumerate(configs, 1):
            print(f"[DEBUG] Traitement de la config {idx}: {cfg}", flush=True)
            competition_id = cfg.get('competitionId') or args.competition_id
            equipe_id = cfg.get('equipeId')

            print(f"\n[{idx}/{len(configs)}] Competition: {cfg.get('nom') or cfg.get('competition_name')}", flush=True)
            print(f"  Equipe: {cfg.get('equipe_bdd')}", flush=True)
            print(f"  Competition ID: {competition_id}", flush=True)
            print(f"  Equipe ID: {equipe_id}", flush=True)


            # --- Vérification stricte : la poule est obligatoire ---
            print(f"[DEBUG] Verification poule: {cfg.get('poule')}", flush=True)
            if not cfg.get('poule'):
                print(f"[ERROR] La poule est obligatoire pour la compétition {cfg.get('nom') or cfg.get('competition_name')} (ID {competition_id}) ! Abandon de la config.", flush=True)
                continue

            # --- Mise à jour automatique des champs Competition si competitionId fourni ---
            print(f"[DEBUG] Debut mise a jour DB pour competition_id: {competition_id}", flush=True)
            if competition_id:
                print(f"[DEBUG] Connexion a la base de donnees...", flush=True)
                conn = get_db_connection()
                if conn:
                    print(f"[DEBUG] Connexion DB reussie", flush=True)
                    try:
                        with conn.cursor() as cur:
                            update_fields = []
                            update_values = []
                            if cfg.get('url'):
                                update_fields.append('"baseUrl" = %s')
                                update_values.append(cfg['url'])
                            # On force la mise à jour de la poule (obligatoire)
                            update_fields.append('poule = %s')
                            update_values.append(cfg['poule'])
                            if cfg.get('max_journees'):
                                update_fields.append('max_journees = %s')
                                update_values.append(int(cfg['max_journees']))
                            if cfg.get('saison'):
                                update_fields.append('saison = %s')
                                update_values.append(cfg['saison'])
                            # Mise à jour du nom d'équipe FFHB si fourni
                            if cfg.get('equipe'):
                                update_fields.append('equipe_ffhb = %s')
                                update_values.append(cfg['equipe'])
                            if update_fields:
                                sql = f"UPDATE competitions SET {', '.join(update_fields)} WHERE id = %s"
                                update_values.append(int(competition_id))
                                print(f"[DEBUG] Execution SQL: {sql} avec valeurs: {update_values}", flush=True)
                                cur.execute(sql, tuple(update_values))
                                conn.commit()
                                print(f"[DB] Compétition {competition_id} mise à jour avec les champs: {', '.join(update_fields)}", flush=True)
                            else:
                                print(f"[DB] Aucune mise à jour nécessaire pour la compétition {competition_id}", flush=True)
                    except Exception as e:
                        print(f"[DB][ERROR] Impossible de mettre à jour Competition {competition_id}: {e}", flush=True)
                        import traceback
                        traceback.print_exc()
                    # Note: On ne ferme pas conn ici car elle sera utilisée par main()
                else:
                    print(f"[DEBUG][ERROR] Impossible de se connecter a la base de donnees", flush=True)

            # Temporairement remplacer BASE_URLS par cette config seule
            # S'assurer que le nom d'équipe correspond à l'équipe FFHB mise à jour
            print(f"[DEBUG] Preparation config pour scraper...", flush=True)
            cfg_for_scraper = cfg.copy()
            
            # Le scraper doit utiliser le nom d'équipe FFHB mis à jour
            if competition_id:
                print(f"[DEBUG] Recuperation nom equipe FFHB pour competition {competition_id}...", flush=True)
                try:
                    # Créer une nouvelle connexion pour cette requête
                    temp_conn = get_db_connection()
                    if temp_conn:
                        with temp_conn.cursor() as cur:
                            cur.execute("SELECT equipe_ffhb FROM competitions WHERE id = %s", (int(competition_id),))
                            result = cur.fetchone()
                            if result:
                                cfg_for_scraper['equipe'] = result[0]  # Utiliser le nom FFHB de la DB
                                print(f"[CONFIG] Utilisation du nom d'équipe FFHB: '{result[0]}'")
                        temp_conn.close()
                except Exception as e:
                    print(f"[CONFIG][WARNING] Impossible de récupérer le nom FFHB: {e}", flush=True)
            
            print(f"[DEBUG] Configuration finale du scraper: {cfg_for_scraper}", flush=True)
            BASE_URLS = [cfg_for_scraper]
            print(f"[DEBUG] BASE_URLS mis à jour: {BASE_URLS}", flush=True)

            try:
                print(f"[DEBUG] Lancement du scraping principal...", flush=True)
                # Lancer le scraping avec la config SaaS
                main(mode=args.mode, competition_id=competition_id, equipe_id=equipe_id)
                print(f"[DEBUG] Scraping terminé avec succès pour competition {competition_id}", flush=True)
            except Exception as e:
                print(f"[ERROR] Échec du scraping pour {cfg.get('nom') or cfg.get('competition_name')}: {e}", flush=True)
                import traceback
                traceback.print_exc()
        
        print(f"[DEBUG] Fin du traitement des configurations", flush=True)
        # Restaurer BASE_URLS (pour propreté)
        BASE_URLS = original_base_urls
        print(f"[DEBUG] Script terminé avec succès", flush=True)
    
    elif args.mode == 'rescrape':
        if not args.match_url:
            print("[ERROR] --match-url est requis avec --mode rescrape")
            parser.print_help()
            sys.exit(1)
        rescrape_single_match(args.match_url)
    else:
        # Mode par dfaut: utiliser BASE_URLS du fichier config.py
        print("[Mode Normal] Scraping des competitions ASCR Handball (BASE_URLS)")
        main(mode=args.mode)