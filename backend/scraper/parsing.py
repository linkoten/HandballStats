# parsing.py

import pandas as pd
import pdfplumber
import requests
import io
import re
from typing import Dict, Any, List


def determine_home_away(table, equipe_cible: str):
    """Dtermine si l'quipe recherche (ASC Rennais) joue  domicile ou  l'extrieur pour indexer le PDF."""
    try:
        cible_clean = equipe_cible.upper().replace(' ', '')
        for row_idx in range(min(10, len(table))):
            row = table[row_idx]
            row_text = ' '.join(str(cell) for cell in row if cell)
            row_text_clean = row_text.upper().replace(' ', '')

            if cible_clean in row_text_clean:
                slash_index = row_text_clean.find('/')
                cible_index = row_text_clean.find(cible_clean)

                if slash_index == -1:
                    home_away = 'domicile'
                elif cible_index < slash_index:
                    home_away = 'domicile'
                else:
                    home_away = 'exterieur'

                print(f"    -> quipes trouves (dans PDF): {row_text}")
                print(f"    -> {equipe_cible}: {home_away}")
                return home_away

        print("    -> [WARN] Impossible de dterminer domicile/extrieur (dans PDF), supposer domicile")
        return 'domicile'

    except Exception as e:
        print(f"    -> [ERROR] Erreur dtection domicile/extrieur (dans PDF): {e}")
        return 'domicile'


def parse_pdf_data_pdfplumber(pdf_url: str, equipe_cible: str) -> Dict[str, Any]:
    """
    Extrait uniquement les stats de joueurs (joueurs_recevant) du PDF.
    Ajout d'une logique d'essai pour le cas o l'quipe adverse a plus de 12 joueurs.
    """
    match_data = {
        'joueurs_recevant': pd.DataFrame(),
        'home_away': 'domicile',
        'arbitre_1': None,
        'arbitre_2': None,
        'cartons_jaunes_adversaire': 0,
        'exclusions_2min_adversaire': 0,
        'cartons_rouges_adversaire': 0,
        'sept_metres_adversaire': 0
    }
    print(f"\n--- [HANDBALL] Parsing PDF pour {equipe_cible} ---")

    try:
        response = requests.get(pdf_url, timeout=30)
        response.raise_for_status()
        pdf_stream = io.BytesIO(response.content)

        with pdfplumber.open(pdf_stream) as pdf:
            page = pdf.pages[0]
            tables = page.extract_tables()

            if not tables or len(tables) == 0:
                print("    -> [ERROR] Aucun tableau trouv")
                return match_data

            table = tables[0]

            if len(table) < 21:
                print(f"    -> [ERROR] Tableau trop court: {len(table)} lignes")
                return match_data

            # Extraire les arbitres (lignes 4 et 5, colonne 12)
            try:
                if len(table) > 4:
                    arbitre_1_row = table[4]
                    # L'arbitre 1 est dans la colonne 12 (aprs "JugeArbitre1")
                    arbitre_1 = arbitre_1_row[12] if len(arbitre_1_row) > 12 and arbitre_1_row[12] else None
                    match_data['arbitre_1'] = arbitre_1.strip() if arbitre_1 and isinstance(arbitre_1, str) and arbitre_1.strip() else "Aucun/non dfini"
                
                if len(table) > 5:
                    arbitre_2_row = table[5]
                    # L'arbitre 2 est dans la colonne 12 (aprs "JugeArbitre2")
                    arbitre_2 = arbitre_2_row[12] if len(arbitre_2_row) > 12 and arbitre_2_row[12] else None
                    match_data['arbitre_2'] = arbitre_2.strip() if arbitre_2 and isinstance(arbitre_2, str) and arbitre_2.strip() else None
                
                print(f"    -> Arbitres extraits du PDF: {match_data['arbitre_1']}, {match_data['arbitre_2'] or 'Aucun/non dfini'}")
            except Exception as e:
                print(f"    -> [WARN] Erreur extraction arbitres: {e}")
                match_data['arbitre_1'] = "Aucun/non dfini"
                match_data['arbitre_2'] = None

            # Dterminer Domicile/Extrieur
            home_away = determine_home_away(table, equipe_cible)
            match_data['home_away'] = home_away

            # --- Extraire les sanctions de l'quipe adverse ---
            try:
                # Les statistiques de l'quipe adverse sont dans la partie oppose du PDF
                # Si notre quipe est  domicile (lignes 10-21), l'adversaire est en extrieur (lignes 29-40 environ)
                # Si notre quipe est  l'extrieur (lignes 29-40), l'adversaire est  domicile (lignes 10-21)
                
                if home_away == 'domicile':
                    # L'adversaire est l'quipe extrieure (lignes 28-31)
                    adversaire_header = 28
                    adversaire_stats_lines = [29, 30, 31]  # Essayer plusieurs dcalages
                else:
                    # L'adversaire est l'quipe  domicile (lignes 9-10)
                    adversaire_header = 9
                    adversaire_stats_lines = [10]
                
                # Trouver les index des colonnes depuis le header
                header_row = table[adversaire_header] if adversaire_header < len(table) else []
                av_col_idx = None
                deux_min_col_idx = None
                dis_col_idx = None
                
                for idx, cell in enumerate(header_row):
                    if cell and "Av." in str(cell):
                        av_col_idx = idx
                    elif cell and "2'" in str(cell):
                        deux_min_col_idx = idx
                    elif cell and "Dis" in str(cell):
                        dis_col_idx = idx
                
                print(f"    -> Colonnes adversaire trouves: Av.={av_col_idx}, 2'={deux_min_col_idx}, Dis={dis_col_idx}")
                
                cartons_jaunes = 0
                exclusions_2min = 0
                cartons_rouges = 0
                sept_metres = 0
                
                # Trouver la colonne du nom depuis le header
                nom_col_idx = None
                if adversaire_header < len(table):
                    for idx, cell in enumerate(header_row):
                        if cell and "NOM" in str(cell):
                            nom_col_idx = idx
                            break
                
                if nom_col_idx is None:
                    nom_col_idx = 1  # Par dfaut colonne 1
                
                print(f"    -> Colonne nom adversaire: {nom_col_idx}")
                
                # Essayer chaque ligne de dpart possible
                joueurs_adverses = 0
                adversaire_start = None
                
                # Essayer chaque position comme on le fait pour nos propres joueurs
                for stats_line in adversaire_stats_lines:
                    if stats_line < len(table):
                        test_row = table[stats_line]
                        # Vrifier si cette ligne a un nom de joueur
                        nom_value = test_row[nom_col_idx] if nom_col_idx < len(test_row) else None
                        if nom_value and str(nom_value).strip() and str(nom_value).strip() != 'None':
                            adversaire_start = stats_line
                            print(f"    -> Position de dpart adversaire trouve: ligne {adversaire_start}")
                            break
                
                if adversaire_start is None:
                    print(f"    -> [WARN] Impossible de trouver le dbut des stats adverses")
                    match_data['cartons_jaunes_adversaire'] = 0
                    match_data['exclusions_2min_adversaire'] = 0
                    match_data['cartons_rouges_adversaire'] = 0
                    match_data['sept_metres_adversaire'] = 0
                else:
                    # Parser les lignes de l'quipe adverse (jusqu' 12 joueurs)
                    for i in range(12):
                        line_num = adversaire_start + i
                        if line_num >= len(table):
                            break
                        
                        row = table[line_num]
                        
                        # Vrifier si la ligne contient un joueur (utiliser la colonne du nom trouve)
                        nom = row[nom_col_idx] if nom_col_idx < len(row) else None
                        if not nom or not str(nom).strip() or str(nom).strip() == 'None':
                            break  # Plus de joueurs
                        
                        joueurs_adverses += 1
                        
                        # Extraire les sanctions avec les index trouvs dans le header
                        try:
                            # Cartons jaunes (Av.)
                            if av_col_idx is not None and av_col_idx < len(row) and row[av_col_idx]:
                                val = str(row[av_col_idx]).strip()
                                if val == 'X' or val == '1':
                                    cartons_jaunes += 1
                                    print(f"       -> CJ pour joueur ligne {line_num}")
                            
                            # Exclusions 2 min (2')
                            if deux_min_col_idx is not None and deux_min_col_idx < len(row) and row[deux_min_col_idx]:
                                val = str(row[deux_min_col_idx]).strip()
                                if val.isdigit():
                                    exclusions_2min += int(val)
                                    print(f"       -> {val} x 2' pour joueur ligne {line_num}")
                                elif val == 'X':
                                    exclusions_2min += 1
                                    print(f"       -> 1 x 2' pour joueur ligne {line_num}")
                            
                            # Cartons rouges (Dis) - marqu par 'D' pour Disqualification
                            if dis_col_idx is not None and dis_col_idx < len(row) and row[dis_col_idx]:
                                val = str(row[dis_col_idx]).strip().upper()
                                if val == 'D' or val == 'X' or val == '1':
                                    cartons_rouges += 1
                                    print(f"       -> CR ('{val}') pour joueur ligne {line_num}")
                        
                        except Exception as e:
                            print(f"       -> Erreur ligne {line_num}: {e}")
                            continue
                    
                    print(f"    -> {joueurs_adverses} joueurs adverses analyss")
                    
                    # Pour les 7m, chercher dans la colonne 7m du header pour savoir o regarder
                    sept_m_col_idx = None
                    for idx, cell in enumerate(header_row):
                        if cell and "7m" in str(cell):
                            sept_m_col_idx = idx
                            break
                    
                    if sept_m_col_idx is not None:
                        # Compter les 7m marqus dans les stats des joueurs adverses
                        for i in range(12):
                            line_num = adversaire_start + i
                            if line_num >= len(table):
                                break
                            row = table[line_num]
                            
                            # Vrifier qu'il y a un joueur
                            nom = row[nom_col_idx] if nom_col_idx < len(row) else None
                            if not nom or not str(nom).strip() or str(nom).strip() == 'None':
                                break
                            
                            # Compter les 7m
                            if sept_m_col_idx < len(row) and row[sept_m_col_idx]:
                                val = str(row[sept_m_col_idx]).strip()
                                if val.isdigit():
                                    sept_metres += int(val)
                        
                        if sept_metres > 0:
                            print(f"       -> {sept_metres} 7m trouvs dans les stats joueurs adverses")
                    else:
                        print(f"       -> [WARN] Colonne 7m non trouve dans le header adversaire")
                    
                    match_data['cartons_jaunes_adversaire'] = cartons_jaunes
                    match_data['exclusions_2min_adversaire'] = exclusions_2min
                    match_data['cartons_rouges_adversaire'] = cartons_rouges
                    match_data['sept_metres_adversaire'] = sept_metres
                    
                    print(f"    -> Sanctions adversaire: {cartons_jaunes} cartons jaunes, {exclusions_2min} exclusions 2', {cartons_rouges} cartons rouges, {sept_metres} 7m")
            
            except Exception as e:
                print(f"    -> [WARN] Erreur extraction sanctions adversaire: {e}")

            # --- Fonction interne pour essayer le parsing ---
            def _extract_stats(current_header_line: int, current_start_line: int,
                               pdf_table: List[List[Any]]) -> pd.DataFrame | None:
                """Tente d'extraire les stats pour une position de ligne donne."""
                if len(pdf_table) <= current_header_line:
                    return None

                header_row = pdf_table[current_header_line]
                
                # DEBUG: Afficher le contenu du header
                print(f"       DEBUG Header ligne {current_header_line}: {header_row}")
                
                column_mapping = {}
                
                # Recherche flexible des colonnes
                for idx, cell in enumerate(header_row):
                    if cell:
                        cell_str = str(cell).strip()
                        # Colonne numéro (N ou N°)
                        if cell_str in ['N', 'N°', 'N']:
                            column_mapping['N'] = idx
                        # Colonne nom (avec ou sans accent)
                        elif 'NOM' in cell_str and 'nom' in cell_str and 'usage' in cell_str:
                            column_mapping["NOMprnom(Nomd'usage)"] = idx
                        # Colonnes statistiques
                        elif cell_str == 'Buts':
                            column_mapping['Buts'] = idx
                        elif cell_str == '7m':
                            column_mapping['7m'] = idx
                        elif cell_str == 'Tirs':
                            column_mapping['Tirs'] = idx
                        elif cell_str == 'Arrets':
                            column_mapping['Arrets'] = idx
                        elif cell_str == 'Av.':
                            column_mapping['Av.'] = idx
                        elif cell_str == "2'":
                            column_mapping["2'"] = idx
                        elif cell_str == 'Dis':
                            column_mapping['Dis'] = idx

                if not column_mapping:
                    print(f"       DEBUG: Aucune colonne trouve dans le header")
                    return None

                print(f"       DEBUG: Colonnes trouvees: {list(column_mapping.keys())}")

                players_data = []
                for i in range(12):
                    line_num = current_start_line + i
                    if line_num >= len(pdf_table): break
                    row = pdf_table[line_num]
                    player = {}

                    for col_name, col_index in column_mapping.items():
                        if col_index < len(row):
                            value = row[col_index]
                            if value is None or value == '': value = ''
                            if col_name in ['Av.', 'Dis'] and value == 'D': value = '1'
                            player[col_name] = value
                        else:
                            player[col_name] = ''

                    nom = player.get("NOMprnom(Nomd'usage)", '').strip()
                    if nom and nom != '':
                        players_data.append(player)
                    else:
                        break

                if not players_data:
                    print(f"       DEBUG: Aucun joueur trouve (players_data vide)")
                    return pd.DataFrame()  # Retourne un DF vide si 0 joueur trouv

                # Conversion finale en DataFrame
                df = pd.DataFrame(players_data)
                column_mapping_output = {
                    'N': 'N', "NOMprnom(Nomd'usage)": 'Nom_Prenom', 'Buts': 'Buts', '7m': '7m', 'Tirs': 'Tirs',
                    'Arrets': 'Arrets', 'Av.': 'Avertissements', "2'": 'Exclusions_2min', 'Dis': 'Discipline'
                }
                output_columns = []
                for old_name, new_name in column_mapping_output.items():
                    if old_name in df.columns:
                        df = df.rename(columns={old_name: new_name})
                        output_columns.append(new_name)

                numeric_cols = ['Buts', '7m', 'Tirs', 'Arrets', 'Avertissements', 'Exclusions_2min', 'Discipline']
                for col in numeric_cols:
                    if col in df.columns:
                        df[col] = df[col].replace('X', '1')
                        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

                final_columns = [col for col in output_columns if col in df.columns]
                return df[final_columns].fillna('')

            # --- Dfinition des essais ---
            df_stats = pd.DataFrame()

            if home_away == 'domicile':
                start_lines_to_try = [(9, 10)]
            else:
                start_lines_to_try = [(28, 29), (29, 30), (30, 31)]

            # --- Boucle d'essais ---
            for i, (h_line, s_line) in enumerate(start_lines_to_try):
                print(f"    ->  Essai d'extraction (Header: {h_line}, Stats: {s_line})...")

                try:
                    df_stats = _extract_stats(h_line, s_line, table)

                    if df_stats is not None and not df_stats.empty:
                        print(f"    -> [OK] Succs de l'extraction  l'essai {i + 1}. Dcalage: +{i}")
                        break

                except Exception as e:
                    print(f"    -> [ERROR] Erreur critique  l'essai {i + 1}: {e}")
                    continue

            if not df_stats.empty:
                match_data['joueurs_recevant'] = df_stats
                print(f"    -> [OK] {len(df_stats)} joueurs {equipe_cible} extraits")
            else:
                print("    -> [ERROR] Aucun joueur trouv aprs tous les essais.")

    except requests.exceptions.HTTPError as e:
        print(f"    -> [ERROR] Erreur tlchargement PDF (HTTP): {e}")
    except Exception as e:
        print(f"    -> [ERROR] Erreur parsing PDF: {e}")

    return match_data


