#!/usr/bin/env python

import sys
import os
import subprocess
import json

# Configuration de test
config = [{
    "competitionId": 5,
    "equipeId": 1,
    "url": "https://www.ffhandball.fr/competitions/saison-2024-2025-20/regional/16-ans-excellence-masculine-bretagne-25544",
    "equipe": "ASC RENNAIS 1",
    "equipe_bdd": "ASCR 1 M",
    "competition_name": "2024/2025 EXCELLENCE MASCULINE BRETAGNE",
    "poule": "poule-147211",
    "max_journees": 22,
    "saison": "2024/2025",
    "phase": "Poule"
}]

# Convertir en JSON string
config_json = json.dumps(config)

# Lancer le scraper
cmd = [
    sys.executable,
    "scraper/main.py", 
    "--config",
    config_json
]

print("🔧 Lancement du test scraper...")
print(f"Commande: {' '.join(cmd)}")
print(f"Working directory: {os.getcwd()}")
print()

try:
    result = subprocess.run(
        cmd, 
        capture_output=True, 
        text=True, 
        cwd=os.getcwd(),
        timeout=60  # Timeout de 60 secondes
    )
    
    print("=== STDOUT ===")
    print(result.stdout)
    print()
    print("=== STDERR ===") 
    print(result.stderr)
    print()
    print(f"Return code: {result.returncode}")
    
except subprocess.TimeoutExpired:
    print("❌ Le processus a expiré après 60 secondes")
except Exception as e:
    print(f"❌ Erreur lors de l'exécution: {e}")