# Ce fichier sert d'adaptateur pour réutiliser ta logique de scraping existante dans le FastAPI Render
from typing import Dict, Any

from main import main as legacy_scraper_main

def run_legacy_scraper(competition_config: Dict[str, Any]):
    """
    Appelle la fonction main() de ton ancien scraper avec la config reçue du FastAPI.
    """
    # Ici, adapte les paramètres selon ce que main() attend
    # Exemple : main(mode='full', competition_id=..., equipe_id=...)
    legacy_scraper_main(mode='full')
    # Tu peux passer d'autres paramètres selon besoin
