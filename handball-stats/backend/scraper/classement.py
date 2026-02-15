# classement.py

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from typing import Dict, List, Any
import time


def scrape_classement_complet(driver: webdriver.Chrome, classement_url: str) -> Dict[str, Dict[str, Any]]:
    """
    Scrape le classement complet de toutes les quipes depuis l'URL du classement ffhandball.fr.
    
    Args:
        driver: Instance du driver Selenium
        classement_url: URL de la page de classement (ex: https://www.ffhandball.fr/.../classements/)
    
    Returns:
        Dict avec nom d'quipe normalis comme cl et infos de classement comme valeur:
        {
            "ASCRENNAIS": {"classement": 1, "partie_tableau": "suprieur"},
            "ASCRENNAIS2": {"classement": 5, "partie_tableau": "suprieur"},
            ...
        }
    """
    print(f"\n--- [INFO] Scraping classement complet ---")
    print(f"    URL: {classement_url}")
    
    classements = {}
    
    try:
        driver.get(classement_url)
        time.sleep(2)  # Attendre le chargement de la page
        
        # Attendre que le tableau de classement soit visible
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "style_classement__VzowG"))
            )
        except Exception as e:
            print(f"    -> [WARN] Timeout en attendant le tableau de classement: {e}")
        
        # Parser le HTML avec BeautifulSoup
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # Trouver le tableau de classement
        tableau = soup.find('table', class_='style_classement__VzowG')
        
        if not tableau:
            print("    -> [ERROR] Tableau de classement non trouv")
            return classements
        
        # Trouver toutes les lignes du tableau (tbody > tr)
        tbody = tableau.find('tbody')
        if not tbody:
            print("    -> [ERROR] Corps du tableau non trouv")
            return classements
        
        lignes = tbody.find_all('tr')
        total_equipes = len(lignes)
        
        print(f"    -> {total_equipes} quipes dans le championnat")
        
        # Calculer le milieu du tableau
        milieu = (total_equipes + 1) // 2
        
        # Parcourir toutes les lignes pour extraire tous les classements
        for ligne in lignes:
            all_tds = ligne.find_all('td')
            
            # La structure est: TD0=Position, TD1=Nom du club, TD2=Points, ...
            if len(all_tds) < 2:
                continue
            
            try:
                position = int(all_tds[0].text.strip())
            except (ValueError, AttributeError):
                continue
            
            club_name = all_tds[1].text.strip()
            
            # Normaliser le nom de l'quipe (enlever espaces et majuscules)
            club_normalized = club_name.upper().replace(' ', '').replace('-', '').strip()
            
            # Calculer la partie du tableau
            partie_tableau = 'suprieur' if position <= milieu else 'infrieur'
            
            # Stocker dans le dictionnaire
            classements[club_normalized] = {
                'classement': position,
                'partie_tableau': partie_tableau,
                'nom_affichage': club_name
            }
            
            print(f"    -> {position}. {club_name} ({partie_tableau})")
        
        print(f"    -> [OK] {len(classements)} quipes extraites")
        
    except Exception as e:
        print(f"    -> [ERROR] Erreur lors du scraping du classement: {e}")
    
    return classements


def build_classement_url(competition_url: str, poule: str) -> str:
    """
    Construit l'URL du classement  partir de l'URL de la comptition et de la poule.
    
    Args:
        competition_url: URL de base de la comptition
        poule: Identifiant de la poule (ex: "poule-171667")
    
    Returns:
        URL complte du classement
    """
    # Enlever le slash final si prsent
    base_url = competition_url.rstrip('/')
    
    # Construire l'URL du classement
    classement_url = f"{base_url}/{poule}/classements/"
    
    return classement_url


