import sys
sys.path.insert(0, '/app')

from scraper.parsing import parse_pdf_data_pdfplumber

pdf_url = "https://media-ffhb-fdm.ffhandball.fr/fdm/T/A/E/S/TAESUHA.pdf"

result = parse_pdf_data_pdfplumber(pdf_url, "ASC RENNAIS")

print(f"\n=== RÉSULTAT ===")
print(f"Arbitre 1: {result.get('arbitre_1')}")
print(f"Arbitre 2: {result.get('arbitre_2')}")
print(f"Home/Away: {result.get('home_away')}")
print(f"Nombre de joueurs: {len(result.get('joueurs_recevant', []))}")
