# main.py - API FastAPI

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import subprocess
import sys
from datetime import datetime
from dotenv import load_dotenv


from models.models import (
    Equipe, EquipeCreate,
    Joueur, JoueurCreate,
    Match, MatchCreate, MatchDetailed,
    StatistiqueJoueur, StatistiqueJoueurCreate,
    UpdatePostesRequest
)

# Ajout import du router Metabase
from .metabase_embed import router as metabase_router

load_dotenv()

app = FastAPI(
    title="Handball Stats API",
    description="API pour les statistiques de handball ASC Rennais",
    version="1.0.0"
)

# Inclusion du router Metabase
app.include_router(metabase_router, prefix="/api")

# Configuration CORS pour permettre les requêtes depuis le frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Connexion à la base de données
def get_db():
    """Crée une connexion à la base de données."""
    conn = psycopg2.connect(
        dbname=os.getenv("DB_NAME", "Handball"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "naruto756"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        cursor_factory=RealDictCursor
    )
    try:
        yield conn
    finally:
        conn.close()


# ==================== ROUTES ÉQUIPES ====================

@app.get("/api/equipes", response_model=List[Equipe])
def get_equipes(conn=Depends(get_db)):
    """Récupère toutes les équipes."""
    with conn.cursor() as cur:
        cur.execute("SELECT id, nom, ville, club, region, departement FROM Equipes ORDER BY nom")
        equipes = cur.fetchall()
    return equipes


@app.get("/api/equipes/{equipe_id}", response_model=Equipe)
def get_equipe(equipe_id: int, conn=Depends(get_db)):
    """Récupère une équipe par son ID."""
    with conn.cursor() as cur:
        cur.execute("SELECT id, nom, ville, club, region, departement FROM Equipes WHERE id = %s", (equipe_id,))
        equipe = cur.fetchone()
    if not equipe:
        raise HTTPException(status_code=404, detail="Équipe non trouvée")
    return equipe


@app.post("/api/equipes", response_model=Equipe)
def create_equipe(equipe: EquipeCreate, conn=Depends(get_db)):
    """Crée une nouvelle équipe."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO Equipes (nom, ville) VALUES (%s, %s) RETURNING id, nom, ville, club, region, departement",
            (equipe.nom, equipe.ville)
        )
        new_equipe = cur.fetchone()
        conn.commit()
    return new_equipe


@app.patch("/api/equipes/bulk-update")
def bulk_update_equipes(
    equipe_ids: List[int] = Query(...),
    ville: Optional[str] = None,
    club: Optional[str] = None,
    region: Optional[str] = None,
    departement: Optional[str] = None,
    conn=Depends(get_db)
):
    """Met à jour plusieurs équipes en une seule fois."""
    if not equipe_ids:
        raise HTTPException(status_code=400, detail="Aucune équipe sélectionnée")
    
    # Construire la requête dynamiquement selon les champs fournis
    updates = []
    params = []
    
    if ville is not None:
        updates.append("ville = %s")
        params.append(ville)
    if club is not None:
        updates.append("club = %s")
        params.append(club)
    if region is not None:
        updates.append("region = %s")
        params.append(region)
    if departement is not None:
        updates.append("departement = %s")
        params.append(departement)
    
    if not updates:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")
    
    # Ajouter les IDs à la fin des paramètres
    params.append(equipe_ids)
    
    query = f"UPDATE Equipes SET {', '.join(updates)} WHERE id = ANY(%s)"
    
    with conn.cursor() as cur:
        cur.execute(query, params)
        updated_count = cur.rowcount
        conn.commit()
    
    return {"updated": updated_count, "equipe_ids": equipe_ids}


# ==================== ROUTES JOUEURS ====================

@app.get("/api/joueurs", response_model=List[Joueur])
def get_joueurs(equipe_id: Optional[int] = None, conn=Depends(get_db)):
    """Récupère tous les joueurs, optionnellement filtrés par équipe."""
    with conn.cursor() as cur:
        if equipe_id:
            cur.execute(
                "SELECT id, nom_prenom, num_maillot, id_equipe, poste_principal, postes_secondaires FROM Joueurs WHERE id_equipe = %s ORDER BY num_maillot",
                (equipe_id,)
            )
        else:
            cur.execute("SELECT id, nom_prenom, num_maillot, id_equipe, poste_principal, postes_secondaires FROM Joueurs ORDER BY nom_prenom")
        joueurs = cur.fetchall()
    return joueurs


@app.get("/api/joueurs/{joueur_id}", response_model=Joueur)
def get_joueur(joueur_id: int, conn=Depends(get_db)):
    """Récupère un joueur par son ID."""
    with conn.cursor() as cur:
        cur.execute("SELECT id, nom_prenom, num_maillot, id_equipe, poste_principal, postes_secondaires FROM Joueurs WHERE id = %s", (joueur_id,))
        joueur = cur.fetchone()
    if not joueur:
        raise HTTPException(status_code=404, detail="Joueur non trouvé")
    return joueur


@app.put("/api/joueurs/postes/batch")
def update_joueurs_postes_batch(request: UpdatePostesRequest, conn=Depends(get_db)):
    """Met à jour les postes de plusieurs joueurs en une seule requête."""
    
    # Validation des valeurs
    postes_principaux_valides = ['Gardien', 'Ailier', 'Arrière', 'Demi-Centre', 'Pivot']
    postes_secondaires_valides = ['Gardien', 'Ailier G', 'Arrière G', 'Demi-Centre', 'Arrière D', 'Ailier D', 'Pivot']
    
    if request.poste_principal and request.poste_principal not in postes_principaux_valides:
        raise HTTPException(status_code=400, detail=f"Poste principal invalide. Valeurs autorisées: {postes_principaux_valides}")
    
    if request.postes_secondaires:
        for poste in request.postes_secondaires:
            if poste not in postes_secondaires_valides:
                raise HTTPException(status_code=400, detail=f"Poste secondaire invalide: {poste}. Valeurs autorisées: {postes_secondaires_valides}")
    
    if not request.joueur_ids:
        raise HTTPException(status_code=400, detail="La liste joueur_ids ne peut pas être vide")
    
    try:
        with conn.cursor() as cur:
            updated_count = 0
            
            for joueur_id in request.joueur_ids:
                # Construire la requête de mise à jour
                if request.operation == "set":
                    # Mode 'set': remplace complètement les postes
                    if request.poste_principal is not None and request.postes_secondaires is not None:
                        cur.execute(
                            "UPDATE Joueurs SET poste_principal = %s, postes_secondaires = %s WHERE id = %s",
                            (request.poste_principal, request.postes_secondaires, joueur_id)
                        )
                    elif request.poste_principal is not None:
                        cur.execute(
                            "UPDATE Joueurs SET poste_principal = %s WHERE id = %s",
                            (request.poste_principal, joueur_id)
                        )
                    elif request.postes_secondaires is not None:
                        cur.execute(
                            "UPDATE Joueurs SET postes_secondaires = %s WHERE id = %s",
                            (request.postes_secondaires, joueur_id)
                        )
                    updated_count += cur.rowcount
                    
                elif request.operation == "add":
                    # Mode 'add': ajoute aux postes secondaires existants
                    if request.postes_secondaires:
                        # Récupérer les postes secondaires actuels
                        cur.execute("SELECT postes_secondaires FROM Joueurs WHERE id = %s", (joueur_id,))
                        result = cur.fetchone()
                        if result:
                            current_postes = result['postes_secondaires'] or []
                            # Fusionner sans doublons
                            new_postes = list(set(current_postes + request.postes_secondaires))
                            cur.execute(
                                "UPDATE Joueurs SET postes_secondaires = %s WHERE id = %s",
                                (new_postes, joueur_id)
                            )
                            updated_count += cur.rowcount
                    
                    if request.poste_principal is not None:
                        cur.execute(
                            "UPDATE Joueurs SET poste_principal = %s WHERE id = %s",
                            (request.poste_principal, joueur_id)
                        )
                        updated_count += cur.rowcount
            
            conn.commit()
            
            # Récupérer les joueurs mis à jour
            cur.execute(
                "SELECT id, nom_prenom, num_maillot, id_equipe, poste_principal, postes_secondaires FROM Joueurs WHERE id = ANY(%s)",
                (request.joueur_ids,)
            )
            updated_joueurs = cur.fetchall()
        
        return {
            "message": f"{len(request.joueur_ids)} joueur(s) mis à jour",
            "updated_count": len(updated_joueurs),
            "joueurs": updated_joueurs
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")


# ==================== ROUTES MATCHS ====================

@app.get("/api/matchs", response_model=List[Match])
def get_matchs(
    equipe_id: Optional[int] = None,
    competition: Optional[str] = None,
    limit: int = 100,
    conn=Depends(get_db)
):
    """Récupère les matchs avec filtres optionnels."""
    query = """
        SELECT id, match_url, pdf_url, competition_name, 
               equipe_recevant_id, equipe_exterieur_id, 
               score_final, date_match, arbitre_1, arbitre_2,
               cartons_jaunes_adversaire, exclusions_2min_adversaire,
               cartons_rouges_adversaire, sept_metres_adversaire,
               classement_equipe_recevant, partie_tableau_equipe_recevant,
               classement_equipe_exterieur, partie_tableau_equipe_exterieur
        FROM Matchs
        WHERE 1=1
    """
    params = []
    
    if equipe_id:
        query += " AND (equipe_recevant_id = %s OR equipe_exterieur_id = %s)"
        params.extend([equipe_id, equipe_id])
    
    if competition:
        query += " AND competition_name LIKE %s"
        params.append(f"%{competition}%")
    
    query += " ORDER BY date_match DESC LIMIT %s"
    params.append(limit)
    
    with conn.cursor() as cur:
        cur.execute(query, params)
        matchs = cur.fetchall()
    return matchs


@app.get("/api/matchs/{match_id}", response_model=MatchDetailed)
def get_match_detailed(match_id: int, conn=Depends(get_db)):
    """Récupère les détails complets d'un match avec statistiques."""
    with conn.cursor() as cur:
        # Récupérer le match
        cur.execute("""
            SELECT m.id, m.match_url, m.pdf_url, m.competition_name,
                   m.equipe_recevant_id, m.equipe_exterieur_id,
                   m.score_final, m.date_match, m.arbitre_1, m.arbitre_2,
                   m.cartons_jaunes_adversaire, m.exclusions_2min_adversaire,
                   m.cartons_rouges_adversaire, m.sept_metres_adversaire,
                   m.classement_equipe_recevant, m.partie_tableau_equipe_recevant,
                   m.classement_equipe_exterieur, m.partie_tableau_equipe_exterieur,
                   er.id as er_id, er.nom as er_nom, er.ville as er_ville,
                   ee.id as ee_id, ee.nom as ee_nom, ee.ville as ee_ville
            FROM Matchs m
            JOIN Equipes er ON m.equipe_recevant_id = er.id
            JOIN Equipes ee ON m.equipe_exterieur_id = ee.id
            WHERE m.id = %s
        """, (match_id,))
        match = cur.fetchone()
        
        if not match:
            raise HTTPException(status_code=404, detail="Match non trouvé")
        
        # Récupérer les statistiques
        cur.execute("""
            SELECT s.id, s.id_match, s.id_joueur, s.buts, s.sept_metres,
                   s.tirs, s.arrets, s.avertissements, s.exclusions_2min, s.discipline,
                   j.id as j_id, j.nom_prenom as j_nom_prenom, 
                   j.num_maillot as j_num_maillot, j.id_equipe as j_id_equipe
            FROM Statistiques_Joueur s
            JOIN Joueurs j ON s.id_joueur = j.id
            WHERE s.id_match = %s
        """, (match_id,))
        stats = cur.fetchall()
    
    # Construire la réponse
    result = {
        "id": match["id"],
        "match_url": match["match_url"],
        "pdf_url": match["pdf_url"],
        "competition_name": match["competition_name"],
        "equipe_recevant_id": match["equipe_recevant_id"],
        "equipe_exterieur_id": match["equipe_exterieur_id"],
        "score_final": match["score_final"],
        "date_match": match["date_match"],
        "arbitre_1": match["arbitre_1"],
        "arbitre_2": match["arbitre_2"],
        "cartons_jaunes_adversaire": match["cartons_jaunes_adversaire"],
        "exclusions_2min_adversaire": match["exclusions_2min_adversaire"],
        "cartons_rouges_adversaire": match["cartons_rouges_adversaire"],
        "sept_metres_adversaire": match["sept_metres_adversaire"],
        "classement_equipe_recevant": match["classement_equipe_recevant"],
        "partie_tableau_equipe_recevant": match["partie_tableau_equipe_recevant"],
        "classement_equipe_exterieur": match["classement_equipe_exterieur"],
        "partie_tableau_equipe_exterieur": match["partie_tableau_equipe_exterieur"],
        "equipe_recevant": {
            "id": match["er_id"],
            "nom": match["er_nom"],
            "ville": match["er_ville"]
        },
        "equipe_exterieur": {
            "id": match["ee_id"],
            "nom": match["ee_nom"],
            "ville": match["ee_ville"]
        },
        "statistiques": [
            {
                "id": s["id"],
                "id_match": s["id_match"],
                "id_joueur": s["id_joueur"],
                "buts": s["buts"],
                "sept_metres": s["sept_metres"],
                "tirs": s["tirs"],
                "arrets": s["arrets"],
                "avertissements": s["avertissements"],
                "exclusions_2min": s["exclusions_2min"],
                "discipline": s["discipline"],
                "joueur": {
                    "id": s["j_id"],
                    "nom_prenom": s["j_nom_prenom"],
                    "num_maillot": s["j_num_maillot"],
                    "id_equipe": s["j_id_equipe"]
                }
            }
            for s in stats
        ]
    }
    return result


# ==================== ROUTES STATISTIQUES ====================

@app.get("/api/statistiques/joueur/{joueur_id}")
def get_statistiques_joueur(joueur_id: int, conn=Depends(get_db)):
    """Récupère toutes les statistiques d'un joueur avec agrégation."""
    with conn.cursor() as cur:
        # Stats par match
        cur.execute("""
            SELECT s.*, m.date_match, m.competition_name, m.score_final
            FROM Statistiques_Joueur s
            JOIN Matchs m ON s.id_match = m.id
            WHERE s.id_joueur = %s
            ORDER BY m.date_match DESC
        """, (joueur_id,))
        stats_matches = cur.fetchall()
        
        # Stats agrégées
        cur.execute("""
            SELECT 
                COUNT(*) as nb_matchs,
                SUM(buts) as total_buts,
                SUM(sept_metres) as total_7m,
                SUM(tirs) as total_tirs,
                SUM(arrets) as total_arrets,
                SUM(avertissements) as total_avertissements,
                SUM(exclusions_2min) as total_exclusions,
                AVG(buts) as moyenne_buts
            FROM Statistiques_Joueur
            WHERE id_joueur = %s
        """, (joueur_id,))
        stats_agregees = cur.fetchone()
    
    return {
        "matchs": stats_matches,
        "agregation": stats_agregees
    }


@app.get("/api/statistiques/equipe/{equipe_id}")
def get_statistiques_equipe(equipe_id: int, saison: Optional[str] = None, conn=Depends(get_db)):
    """Récupère les statistiques agrégées d'une équipe."""
    with conn.cursor() as cur:
        query = """
            SELECT 
                j.nom_prenom,
                j.num_maillot,
                COUNT(DISTINCT s.id_match) as nb_matchs,
                SUM(s.buts) as total_buts,
                SUM(s.sept_metres) as total_7m,
                SUM(s.tirs) as total_tirs,
                SUM(s.arrets) as total_arrets,
                AVG(s.buts) as moyenne_buts
            FROM Statistiques_Joueur s
            JOIN Joueurs j ON s.id_joueur = j.id
            JOIN Matchs m ON s.id_match = m.id
            WHERE j.id_equipe = %s
        """
        params = [equipe_id]
        
        if saison:
            query += " AND m.competition_name LIKE %s"
            params.append(f"%{saison}%")
        
        query += " GROUP BY j.id, j.nom_prenom, j.num_maillot ORDER BY total_buts DESC"
        
        cur.execute(query, params)
        stats = cur.fetchall()
    
    return stats


# ==================== ROUTE DE SANTÉ ====================

@app.get("/")
def root():
    """Route de santé de l'API."""
    return {
        "message": "API Handball Stats - ASC Rennais",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
def health_check():
    """Vérification de l'état de l'API et de la base de données."""
    try:
        conn = next(get_db())
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")


# ==================== ROUTE DE SCRAPING ====================

# Variable globale pour suivre l'état du scraping
scraping_status = {
    "is_running": False,
    "last_run": None,
    "last_result": None,
    "message": None
}


def run_scraper_task(mode: str = "incremental"):
    """Tâche en arrière-plan pour exécuter le scraper."""
    global scraping_status
    
    try:
        scraping_status["is_running"] = True
        scraping_status["message"] = f"Scraping en cours (mode: {mode})..."
        
        # Chemin vers le script scraper
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        scraper_dir = os.path.join(backend_dir, "scraper")
        
        # Détecter si on est dans Docker ou en local
        is_docker = os.path.exists("/.dockerenv")
        
        if is_docker:
            # En Docker, utiliser le chemin absolu
            python_cmd = "python"
            cmd = [python_cmd, "-m", "scraper.main", "--mode", mode]
        else:
            # En local, utiliser l'exécutable Python de l'environnement virtuel
            python_cmd = sys.executable
            cmd = [python_cmd, "-m", "scraper.main", "--mode", mode]
        
        # Exécuter le scraper en sous-processus
        result = subprocess.run(
            cmd,
            cwd=backend_dir,
            capture_output=True,
            text=True,
            timeout=1800,  # 30 minutes max (au lieu de 10)
            env={**os.environ, "PYTHONPATH": backend_dir}  # Ajouter backend_dir au PYTHONPATH
        )
        
        scraping_status["is_running"] = False
        scraping_status["last_run"] = datetime.now().isoformat()
        
        if result.returncode == 0:
            scraping_status["last_result"] = "success"
            scraping_status["message"] = "Scraping terminé avec succès"
        else:
            scraping_status["last_result"] = "error"
            error_msg = result.stderr if result.stderr else result.stdout
            scraping_status["message"] = f"Erreur lors du scraping: {error_msg[:300]}"
            
    except subprocess.TimeoutExpired:
        scraping_status["is_running"] = False
        scraping_status["last_result"] = "error"
        scraping_status["message"] = "Le scraping a expiré (timeout)"
        
    except Exception as e:
        scraping_status["is_running"] = False
        scraping_status["last_result"] = "error"
        scraping_status["message"] = f"Erreur inattendue: {str(e)}"


@app.post("/scraper/run")
async def run_scraper(background_tasks: BackgroundTasks, mode: str = "incremental"):
    """
    Lance le scraper en arrière-plan.
    
    Args:
        mode: Mode d'exécution ('full', 'incremental', 'update-pdf')
    """
    global scraping_status
    
    if scraping_status["is_running"]:
        raise HTTPException(
            status_code=409, 
            detail="Un scraping est déjà en cours. Veuillez patienter."
        )
    
    if mode not in ["full", "incremental", "update-pdf"]:
        raise HTTPException(
            status_code=400,
            detail="Mode invalide. Utilisez 'full', 'incremental' ou 'update-pdf'"
        )
    
    # Lancer la tâche en arrière-plan
    background_tasks.add_task(run_scraper_task, mode)
    
    return {
        "message": f"Scraping démarré en mode {mode}",
        "status": "started"
    }


@app.get("/scraper/status")
def get_scraper_status():
    """Récupère l'état actuel du scraper."""
    return scraping_status

