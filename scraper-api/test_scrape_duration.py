import requests
import time

# Configuration de la compétition à tester
data = {
    "competitions": [
        {
        "url": "https://www.ffhandball.fr/competitions/saison-2024-2025-20/regional/16-ans-2eme-division-territoriale-feminine-p-8-26140/",
        "equipe": "ASC RENNAIS 2",
        "equipe_bdd": "ASCR Handball 2 F",
        "competition_name": "2024/2025 - D2 Territoriale P1 (F2)",
        "poule": "poule-149826",
        "max_journees": 14,
        "saison": "2024/2025",
    },
    ]
}

# Lancer le test de temps
start = time.time()
response = requests.post(
    "http://localhost:8000/scrape/batch",
    json=data
)
duration = time.time() - start

print(f"Status: {response.status_code}")
print(f"Réponse: {response.text}")
print(f"Durée totale du scraping: {duration:.2f} secondes")
