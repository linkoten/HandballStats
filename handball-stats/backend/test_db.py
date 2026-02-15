#!/usr/bin/env python

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scraper'))

from database.database import get_db_connection, update_competition_progress
import json

print("🔧 Test de connexion à la base de données...")

# Test de connexion
conn = get_db_connection()
if conn:
    print("✅ Connexion à la base de données réussie !")
    
    # Test de mise à jour de progression
    try:
        print("🔄 Test de mise à jour de progression...")
        update_competition_progress(conn, 5, 50, "Test de connexion depuis Python", "IN_PROGRESS")
        print("✅ Mise à jour de progression réussie !")
        
        # Vérifier si la compétition existe
        with conn.cursor() as cur:
            cur.execute("SELECT id, nom, scraping_status, scraping_progress, scraping_step FROM competitions WHERE id = 5")
            result = cur.fetchone()
            if result:
                print(f"📊 Compétition trouvée: ID={result[0]}, Nom={result[1]}, Statut={result[2]}, Progrès={result[3]}%, Étape={result[4]}")
            else:
                print("❌ Compétition ID=5 non trouvée")
                
        conn.close()
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
else:
    print("❌ Impossible de se connecter à la base de données")
    print("Vérifiez les variables d'environnement dans le fichier .env")