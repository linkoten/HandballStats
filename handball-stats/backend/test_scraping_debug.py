#!/usr/bin/env python3
"""
Test rapide de scraping avec les nouveaux logs de debug
"""

import sys
import os
import json

# Ajouter le répertoire backend au path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Configuration de test (même que celle utilisée dans l'interface)
config_json = '''[{
    "competitionId": 8,
    "equipeId": 1,
    "url": "https://www.ffhandball.fr/competitions/saison-2024-2025-20/regional/16-ans-excellence-masculine-bretagne-25544",
    "competition_name": "2024/2025 EXCELLENCE MASCULINE BRETAGNE",
    "equipe": "ASC RENNAIS 1",
    "equipe_bdd": "ASCR 1 M",
    "saison": "2024/2025",
    "poule": "poule-147211",
    "max_journees": 22
}]'''

def test_scraping_debug():
    """Test du scraping avec les logs de debug pour voir où ça plante"""
    
    print("=== Test de scraping avec logs de debug ===")
    
    # Simuler les arguments comme l'interface web
    sys.argv = [
        'main.py',
        '--config', config_json,
        '--mode', 'full'
    ]
    
    try:
        # Importer et exécuter main.py
        os.chdir('scraper')
        import main
        
        print("[DEBUG] Script terminé sans erreur")
        
    except Exception as e:
        print(f"[ERROR] Le script a planté: {e}")
        import traceback
        traceback.print_exc()
        
        # Chercher si c'est une erreur d'encodage
        if "charmap" in str(e) or "encode" in str(e):
            print("\n💡 Solution: Le problème vient des emojis dans les print()")
            print("   Les logs de debug que j'ai ajoutés devraient montrer où exactement")

if __name__ == "__main__":
    test_scraping_debug()