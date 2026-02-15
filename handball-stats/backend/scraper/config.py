# config.py

# --- Variables de Configuration ---

BASE_URLS = [
    # ==================================
    # === SAISON 2025-2026 ===
    # ==================================
    # M2 - 2025/2026
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2025-2026-21/regional/16-ans-2eme-division-territoriale-mas-p-10-27847/",
        "equipe": "ASC RENNAIS 2",
        "equipe_bdd": "ASCR Handball 2 M",
        "competition_name": "2025/2026 - D2 Territoriale (M2)",
        "poule": "poule-171667",
        "max_journees": 18
    },
    # M1 - 2025/2026
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2025-2026-21/regional/16-ans-excellence-masculine-bretagne-27844/",
        "equipe": "ASC RENNAIS",
        "equipe_bdd": "ASCR Handball 1 M",
        "competition_name": "2025/2026 - Excellence Bretagne (M1)",
        "poule": "poule-168419",
        "max_journees": 22
    },
    # F1 - 2025/2026
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2025-2026-21/regional/16-ans-excellence-feminine-bretagne-27853/",
        "equipe": "ASC RENNAIS",
        "equipe_bdd": "ASCR Handball 1 F",
        "competition_name": "2025/2026 - Excellence Bretagne (F1)",
        "poule": "poule-168469",
        "max_journees": 22
    },
    # F2 - 2025/2026
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2025-2026-21/regional/16-ans-2eme-division-territoriale-feminine-p-8-28836/",
        "equipe": "ASC RENNAIS 2",
        "equipe_bdd": "ASCR Handball 2 F",
        "competition_name": "2025/2026 - D2 Territoriale (F2)",
        "poule": "poule-171690",
        "max_journees": 14
    },

    # ==================================
    # === SAISON 2024-2025 ===
    # ==================================
    # M1 - 2024/2025
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2024-2025-20/regional/16-ans-excellence-masculine-bretagne-25544/",
        "equipe": "ASC RENNAIS",
        "equipe_bdd": "ASCR Handball 1 M",
        "competition_name": "2024/2025 - Excellence Bretagne (M1)",
        "poule": "poule-147211",
        "max_journees": 22
    },
    # M2 - 2024/2025
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2024-2025-20/regional/16-ans-1ere-division-territoriale-masculine-25546/",
        "equipe": "ASC RENNAIS 2",
        "equipe_bdd": "ASCR Handball 2 M",
        "competition_name": "2024/2025 - D1 Territoriale (M2)",
        "poule": "poule-147225",
        "max_journees": 22
    },
    # F1 - 2024/2025
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2024-2025-20/regional/16-ans-1ere-division-territoriale-feminine-p-10-25551/",
        "equipe": "ASC RENNAIS",
        "equipe_bdd": "ASCR Handball 1 F",
        "competition_name": "2024/2025 - D1 Territoriale (F1)",
        "poule": "poule-147801",
        "max_journees": 18
    },
    # F2 - 2024/2025 - Partie 1
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2024-2025-20/regional/16-ans-2eme-division-territoriale-feminine-p-8-26140/",
        "equipe": "ASC RENNAIS 2",
        "equipe_bdd": "ASCR Handball 2 F",
        "competition_name": "2024/2025 - D2 Territoriale P1 (F2)",
        "poule": "poule-149826",
        "max_journees": 14
    },
    # F2 - 2024/2025 - Partie 2
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2024-2025-20/regional/16-ans-2eme-division-territoriale-feminine-p-8-26140/",
        "equipe": "ASC RENNAIS 2",
        "equipe_bdd": "ASCR Handball 2 F",
        "competition_name": "2024/2025 - D2 Territoriale P2 (F2)",
        "poule": "poule-162129",
        "max_journees": 8
    },

    # ==================================
    # === SAISON 2023-2024 ===
    # ==================================
    # M1 - 2023/2024
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2023-2024-19/regional/16-ans-prenationale-masculine-bretagne-22352/",
        "equipe": "ASC RENNAIS",
        "equipe_bdd": "ASCR Handball 1 M",
        "competition_name": "2023/2024 - Prnationale (M1)",
        "poule": "poule-127203",
        "max_journees": 26
    },
    # M2 - 2023/2024
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2023-2024-19/regional/16-ans-2eme-division-territoriale-masculine-22357/",
        "equipe": "ASC RENNAIS 2",
        "equipe_bdd": "ASCR Handball 2 M",
        "competition_name": "2023/2024 - D2 Territoriale (M2)",
        "poule": "poule-127598",
        "max_journees": 18
    },
    # F1 - 2023/2024
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2023-2024-19/regional/16-ans-1ere-division-territoriale-feminine-22363/",
        "equipe": "ASC RENNAIS",
        "equipe_bdd": "ASCR Handball 1 F",
        "competition_name": "2023/2024 - D1 Territoriale (F1)",
        "poule": "poule-127201",
        "max_journees": 18
    },
    # F2 - 2023/2024
    {
        "url": "https://www.ffhandball.fr/competitions/saison-2023-2024-19/regional/16-ans-2eme-division-territoriale-feminine-p12-23482/",
        "equipe": "ASC RENNAIS 2",
        "equipe_bdd": "ASCR Handball 2 F",
        "competition_name": "2023/2024 - D2 Territoriale (F2)",
        "poule": "poule-130511",
        "max_journees": 22
    }
]

URL_ROOT = "https://www.ffhandball.fr"

# Classes CSS
MATCH_LINK_CLASS = "styles_rencontre__9O0P0"
PDF_LINK_CLASS = "style_button__I4Ez2"

# --- Fin Configuration ---


