# 🏐 Scraper Handball - Guide d'utilisation

## 📋 Deux modes de fonctionnement

### 1️⃣ Mode Normal (ASCR Handball) - Votre "sureté"

Lance le scraping de **toutes** les compétitions ASCR Handball définies dans `config.py`.

```bash
# Récupérer tous les matchs
python main.py --mode full

# Récupérer seulement les nouveaux matchs (incrémental)
python main.py --mode incremental

# Mettre à jour les PDFs manquants
python main.py --mode update-pdf

# Mettre à jour les arbitres
python main.py --mode update-referees
```

**Configuration** : Toutes les compétitions sont définies dans `config.py` → `BASE_URLS`

**Backup de sécurité** : `backup_config.py` contient une copie de BASE_URLS

---

### 2️⃣ Mode SaaS (Compétition unique)

Lance le scraping d'**une seule** compétition (utilisé par l'API Next.js).

```bash
python main.py --config '{"url": "https://...", "equipe": "...", "equipe_bdd": "...", ...}'
```

**Configuration** : Passée en argument JSON

**Utilisé par** : `/api/onboarding/configure-competition` dans Next.js

---

## 🔧 Format de configuration

Chaque compétition doit avoir ces champs :

```python
{
    "url": "https://www.ffhandball.fr/competitions/...",
    "equipe": "ASC RENNAIS",           # Nom sur FFHandball
    "equipe_bdd": "ASCR Handball 1 M", # Nom dans la BDD
    "competition_name": "2024/2025 - Excellence Bretagne",
    "poule": "poule-147211",
    "max_journees": 22
}
```

---

## 🔐 Sécurité ASCR Handball

✅ **`config.py`** : Configuration principale (intacte)
✅ **`backup_config.py`** : Sauvegarde de sécurité (ne jamais modifier)

Si `config.py` est corrompu, vous pouvez restaurer depuis le backup :

```python
# Dans config.py
from backup_config import BASE_URLS_BACKUP
BASE_URLS = BASE_URLS_BACKUP
```

---

## 📊 Exemples d'utilisation

### Scraper toutes les compétitions ASCR

```bash
cd backend
python scraper/main.py
```

### Scraper une nouvelle compétition (SaaS)

```bash
python scraper/main.py --config '{
  "url": "https://www.ffhandball.fr/competitions/...",
  "equipe": "Dinan Handball",
  "equipe_bdd": "Dinan Handball 1",
  "competition_name": "2024/2025 - Régionale",
  "poule": "poule-123456",
  "max_journees": 18
}'
```

### Rescraper un match spécifique

```bash
python scraper/main.py --mode rescrape --match-url "https://www.ffhandball.fr/matchs/..."
```

---

## ⚠️ Points importants

1. **Ne jamais modifier `backup_config.py`** - C'est votre sauvegarde
2. **Mode SaaS ne modifie pas `config.py`** - Configuration temporaire en mémoire
3. **BASE_URLS reste intact** - Vous pouvez toujours lancer le scraping normal
4. **Les deux modes utilisent la même base de données** - Données isolées par équipe

---

## 🚀 Intégration Next.js

L'API Next.js appelle le script ainsi :

```typescript
const pythonProcess = spawn(
  "python",
  ["scraper/main.py", "--config", JSON.stringify(config)],
  { cwd: backendPath }
);
```

Le script détecte automatiquement le mode SaaS et n'utilise que cette compétition.
