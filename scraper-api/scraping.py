# scraping.py

import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup, Tag
from typing import List, Dict, Any
from selenium.webdriver.common.by import By

try:
    from scraper.config import URL_ROOT, MATCH_LINK_CLASS, PDF_LINK_CLASS
except ImportError:
    from config import URL_ROOT, MATCH_LINK_CLASS, PDF_LINK_CLASS


def init_driver():
    """Initialise et retourne le driver Chrome/Chromium optimisé pour la performance."""
    import os
    
    options = webdriver.ChromeOptions()
    
    # Options de base
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--disable-software-rasterizer')
    
    # 🚀 OPTIMISATIONS DE PERFORMANCE 
    options.add_argument('--disable-images')  # Pas de chargement d'images
    options.add_argument('--disable-javascript')  # Pas de JS si pas nécessaire  
    options.add_argument('--disable-plugins')
    options.add_argument('--disable-extensions')
    options.add_argument('--disable-background-networking')
    options.add_argument('--disable-background-timer-throttling')
    options.add_argument('--disable-renderer-backgrounding')
    options.add_argument('--disable-backgrounding-occluded-windows')
    options.add_argument('--disable-client-side-phishing-detection')
    options.add_argument('--disable-default-apps')
    options.add_argument('--disable-hang-monitor')
    options.add_argument('--disable-prompt-on-repost')
    options.add_argument('--disable-sync')
    options.add_argument('--disable-translate')
    options.add_argument('--disable-web-security')
    
    # Optimisations réseau et cache
    options.add_argument('--aggressive-cache-discard')
    options.add_argument('--memory-pressure-off')
    options.add_argument('--max_old_space_size=4096')
    
    # Taille de fenêtre fixe pour éviter les recalculs
    options.add_argument('--window-size=1366,768')
    
    # User agent fictif pour éviter la détection
    options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    # Timeouts agressifs
    options.add_argument('--page-load-strategy=eager')  # Pas d'attente du DOM complet
    
    # Dtecter si on est dans Docker
    is_docker = os.path.exists('/.dockerenv')
    
    if is_docker:
        # Dans Docker, utiliser chromium et chromium-driver
        chromium_bin = os.environ.get('CHROME_BIN', '/usr/bin/chromium')
        options.binary_location = chromium_bin
        print(f"Initialisation du navigateur Chromium (Docker)... (binaire: {chromium_bin})")
        chromedriver_bin = '/usr/bin/chromedriver'
        try:
            driver = webdriver.Chrome(service=ChromeService(chromedriver_bin), options=options)
            return driver
        except Exception as e:
            print(f"Erreur d'initialisation de Chromium. Erreur: {e}")
            return None
    else:
        # En local, essayer d'abord un chromedriver local
        print("Initialisation du navigateur Chrome (Local)...")
        local_driver_path = os.path.join(os.path.dirname(__file__), "drivers", "chromedriver.exe")
        if os.path.exists(local_driver_path):
            print(f"Utilisation du chromedriver local: {local_driver_path}")
            try:
                service = ChromeService(local_driver_path)
                driver = webdriver.Chrome(service=service, options=options)
                return driver
            except Exception as e:
                print(f"Erreur avec le chromedriver local: {e}")
                print("Tentative avec ChromeDriverManager...")
        try:
            # Essayer avec ChromeDriverManager (fallback)
            service = ChromeService(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=options)
            return driver
        except Exception as e:
            print(f"Erreur avec ChromeDriverManager: {e}")
            print("Tentative avec Chrome par defaut...")
            try:
                # Essayer sans spcifier de service (utilise le chromedriver dans PATH)
                driver = webdriver.Chrome(options=options)
                return driver
            except Exception as e2:
                print(f"Erreur d'initialisation de Chrome. Erreur: {e2}")
                print("Veuillez verifier que Chrome et ChromeDriver sont installes et compatibles.")
                return None


def parse_match_card(match_card: Tag, equipe_cible: str) -> Dict[str, Any] | None:
    """Extrait la date, le score, les noms d'quipes et le lien depuis la balise <a>."""

    relative_link = match_card.get('href')
    if not relative_link or '/rencontre-' not in relative_link:
        return None
    full_link = URL_ROOT + relative_link

    date_tag = match_card.find('p', class_='block_date__dYMQX')
    date_str = date_tag.text.strip() if date_tag else None

    # Rcupration des scores et noms d'quipes
    team_blocks = match_card.find_all('div', class_='styles_team__BCUHo')
    score_blocks = match_card.find_all('div', class_='styles_score__ELPXO')

    if len(team_blocks) != 2 or len(score_blocks) != 2:
        print("    -> [ERROR] Structure de score/quipe inattendue.")
        return None

    # Assumer l'ordre: [Recevant], [Visiteur]
    team_recevant_nom = team_blocks[0].find('div', class_='styles_teamName__aH4Gu').text.strip()
    team_exterieur_nom = team_blocks[1].find('div', class_='styles_teamName__aH4Gu').text.strip()

    # Le score de l'quipe recevant est affich en premier, puis le score de l'quipe extrieur
    score_recevant = score_blocks[0].text.strip()
    score_exterieur = score_blocks[1].text.strip()

    # Dterminer si l'quipe cible tait l'quipe recevant ou extrieur
    cible_est_recevant = equipe_cible.upper().replace(' ', '') in team_recevant_nom.upper().replace(' ', '')

    if cible_est_recevant:
        equipe_adverse = team_exterieur_nom
        home_away = 'domicile'
    else:
        equipe_adverse = team_recevant_nom
        home_away = 'exterieur'

    return {
        'match_url': full_link,
        'date_match_str': date_str,
        'score_recevant': score_recevant,
        'score_visiteur': score_exterieur,
        'equipe_recevant_nom': team_recevant_nom,
        'equipe_exterieur_nom': team_exterieur_nom,
        'equipe_adverse_nom': equipe_adverse,
        'home_away': home_away
    }


def get_referees_from_match_page(driver: webdriver.Chrome, match_url: str) -> tuple[str, str]:
    """Se rend sur la page de la rencontre et extrait les noms des arbitres."""
    if driver is None:
        return "Aucun/non dfini", "Aucun/non dfini"

    try:
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # Slecteur d'attribut pour trouver toutes les balises <span> dont la classe commence par 'style_referee__'
        referee_elements = soup.find_all('span', class_=lambda x: x and x.startswith('style_referee__'))

        arbitres = []

        for element in referee_elements:
            name = element.text.strip()

            if name and name != "Bientt disponible":
                arbitres.append(name)
            elif name == "Bientt disponible":
                print("    -> [WARN] Arbitres: 'Bientt disponible' trouv.")
                break

        # Assigner les deux arbitres
        arbitre_1 = arbitres[0] if len(arbitres) > 0 else "Aucun/non dfini"
        arbitre_2 = arbitres[1] if len(arbitres) > 1 else "Aucun/non dfini"

        print(f"    -> Arbitres trouvs: {arbitre_1}, {arbitre_2}")
        return arbitre_1, arbitre_2

    except Exception as e:
        print(f"    -> Erreur lors de l'extraction des arbitres pour {match_url}: {e}")
        return "Aucun/non dfini", "Aucun/non dfini"


def get_match_data_from_journee_dynamic(driver: webdriver.Chrome, competition_config: dict, num_journee: int) -> List[Dict[str, Any]]:
    """Rcupre les donnes riches des rencontres pour une journe donne."""
    if driver is None:
        return []

    base_url = competition_config["url"]
    equipe_cible = competition_config["equipe"]
    poule = competition_config["poule"]

    journee_url = f"{base_url.rstrip('/')}/{poule}/journee-{num_journee}/"

    print(f"\n--- Dbut de la Journe {num_journee} ---")
    print(f"-> quipe recherche: {equipe_cible}")

    all_match_data = []

    try:
        driver.get(journee_url)
        time.sleep(3)  # Laisser le temps de charger
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        match_cards = soup.find_all('a', class_=MATCH_LINK_CLASS)

        for match_card in match_cards:
            if equipe_cible.upper() in match_card.text.upper():
                match_data = parse_match_card(match_card, equipe_cible)

                if match_data:
                    all_match_data.append(match_data)

        return all_match_data

    except Exception as e:
        print(f"Erreur lors du scraping dynamique pour la journe {num_journee} : {e}")
        return []


def get_pdf_url_from_match_page(driver: webdriver.Chrome, match_url: str) -> str | None:
    """Se rend sur la page de la rencontre et extrait l'URL du PDF."""
    if driver is None:
        return None

    try:
        driver.get(match_url)
        time.sleep(5)  # Plus long pour le PDF
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        pdf_link_tag = soup.find('a', class_=PDF_LINK_CLASS)

        if pdf_link_tag and 'href' in pdf_link_tag.attrs:
            pdf_url = pdf_link_tag['href']
            print(f"    -> Lien PDF trouv.")
            return pdf_url
        else:
            print("    -> ATTENTION: Lien PDF non trouv.")
            return None

    except Exception as e:
        print(f"    -> Erreur lors de l'extraction du PDF pour {match_url}: {e}")
        return None



