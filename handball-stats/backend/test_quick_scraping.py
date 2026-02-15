#!/usr/bin/env python

# Test rapide du scraper avec timeout de progression

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scraper'))

from database.database import get_db_connection, update_competition_progress
import time

print("🚀 Test de scraping simulé...")

# Simuler le scraping avec des mises à jour de progression
conn = get_db_connection()
if not conn:
    print("❌ Impossible de se connecter à la base de données")
    sys.exit(1)

competition_id = 5

try:
    # Simulation d'un scraping rapide
    steps = [
        (0, "Début du scraping", "IN_PROGRESS"),
        (10, "Connexion au site FFHB", "IN_PROGRESS"),
        (25, "Récupération de la liste des matchs", "IN_PROGRESS"),
        (50, "Traitement des matchs (1/5)", "IN_PROGRESS"),
        (75, "Traitement des matchs (4/5)", "IN_PROGRESS"),
        (100, "Scraping terminé avec succès !", "COMPLETED")
    ]
    
    for progress, step, status in steps:
        print(f"📊 {progress}% - {step}")
        update_competition_progress(conn, competition_id, progress, step, status)
        time.sleep(2)  # Attendre 2 secondes entre chaque étape
        
    print("✅ Test de scraping simulé terminé avec succès !")
    
except Exception as e:
    print(f"❌ Erreur durant le test: {e}")
    update_competition_progress(conn, competition_id, 0, f"Erreur: {str(e)}", "FAILED")
    
finally:
    if conn:
        conn.close()