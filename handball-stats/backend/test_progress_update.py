#!/usr/bin/env python3
"""
Test de la fonction update_competition_progress pour déboguer les mises à jour en temps réel
"""

import sys
import os

# Ajouter le répertoire backend au path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from database.database import get_db_connection, update_competition_progress
import time

def test_progress_updates():
    """Test les mises à jour de progression en temps réel"""
    
    print("=== Test de update_competition_progress ===")
    
    # Test de connexion
    conn = get_db_connection()
    if not conn:
        print("[ERROR] Impossible de se connecter à la base de données")
        return False
    
    print("[OK] Connexion à la base de données établie")
    
    # ID de compétition à tester (utiliser 8 comme dans les logs)
    competition_id = 8
    
    try:
        # Vérifier que la compétition existe
        with conn.cursor() as cur:
            cur.execute("SELECT id, nom FROM competitions WHERE id = %s", (competition_id,))
            result = cur.fetchone()
            
            if not result:
                print(f"[ERROR] Compétition ID {competition_id} introuvable")
                return False
            
            print(f"[OK] Compétition trouvée: {result[1]} (ID: {result[0]})")
        
        # Test des mises à jour progressives
        steps = [
            (10, "🧪 Test 1/5 - Initialisation", None),
            (30, "🧪 Test 2/5 - Progression", None),
            (50, "🧪 Test 3/5 - Mi-parcours", None),
            (80, "🧪 Test 4/5 - Presque fini", None),
            (100, "🧪 Test 5/5 - Terminé", "COMPLETED")
        ]
        
        for i, (progress, step, status) in enumerate(steps, 1):
            print(f"\n--- Test {i}/5: {progress}% ---")
            
            # Effectuer la mise à jour
            update_competition_progress(conn, competition_id, progress, step, status)
            
            # Vérifier que la mise à jour a bien été appliquée
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT scraping_progress, scraping_step, scraping_status, updated_at 
                    FROM competitions 
                    WHERE id = %s
                """, (competition_id,))
                result = cur.fetchone()
                
                if result:
                    db_progress, db_step, db_status, updated_at = result
                    print(f"[DB] Progress: {db_progress}%, Step: '{db_step}', Status: '{db_status}'")
                    print(f"[DB] Updated at: {updated_at}")
                    
                    # Vérifier que les valeurs correspondent
                    if db_progress == progress and db_step == step:
                        print("✅ Mise à jour réussie !")
                    else:
                        print(f"❌ Incohérence: attendu {progress}%/'{step}', obtenu {db_progress}%/'{db_step}'")
                        return False
                else:
                    print("❌ Impossible de récupérer les données mises à jour")
                    return False
            
            # Petite pause pour simuler un vrai scraping
            time.sleep(1)
        
        print("\n🎉 Tous les tests sont passés avec succès !")
        
        # Réinitialiser la compétition pour les prochains tests
        update_competition_progress(conn, competition_id, 0, "⏳ En attente", "PENDING")
        print("[CLEANUP] Compétition réinitialisée à PENDING")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Erreur pendant les tests: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        if conn:
            conn.close()
            print("[CLEANUP] Connexion fermée")

if __name__ == "__main__":
    success = test_progress_updates()
    sys.exit(0 if success else 1)