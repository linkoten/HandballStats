#!/usr/bin/env python

# Test du scraper avec progression détaillée

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scraper'))

from database.database import get_db_connection, update_competition_progress
import json

print("🔧 Test de scraping avec progression détaillée...")

# Configuration réelle mais limitée (juste 2 journées pour tester rapidement)
config = [{
    "competitionId": 6,  # Utiliser l'ID 6 de votre test
    "equipeId": 1,
    "url": "https://www.ffhandball.fr/competitions/saison-2024-2025-20/regional/16-ans-excellence-masculine-bretagne-25544",
    "equipe": "ASC RENNAIS 1",
    "equipe_bdd": "ASCR 1 M",
    "competition_name": "2024/2025 EXCELLENCE MASCULINE BRETAGNE",
    "poule": "poule-147211",
    "max_journees": 3,  # Limité à 3 journées pour test rapide
    "saison": "2024/2025",
    "phase": "Poule"
}]

# Remettre à zéro le statut
conn = get_db_connection()
if conn:
    print("✅ Remise à zéro du statut de progression...")
    update_competition_progress(conn, 6, 0, "🔄 Prêt à démarrer le test...", "PENDING")
    conn.close()
    print("🚀 Vous pouvez maintenant aller sur votre page de progression et voir les détails !")
    print("📱 URL: http://localhost:3000/competitions/scraping-progress?ids=6")
else:
    print("❌ Impossible de se connecter à la base de données")

print("\n💡 Pour lancer le vrai scraping avec progression détaillée:")
print("1. Allez sur votre page de progression")
print("2. Soumettez à nouveau le formulaire d'onboarding") 
print("3. Vous verrez maintenant :")
print("   - 🚀 Initialisation du scraper...")
print("   - 📊 Récupération des classements...")
print("   - 📋 Classements récupérés (1 poule(s))")
print("   - 🔍 Recherche des matchs...")
print("   - 🏟️ Analyse journée X/Y - Z match(s) trouvé(s)")
print("   - 📄 Traitement des X match(s) trouvé(s)...")
print("   - ⚽ Match X/Y: Équipe A vs Équipe B")
print("   - 🎉 Scraping terminé ! X match(s) avec statistiques")