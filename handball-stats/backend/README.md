# Backend Scripts 🐍

Ce dossier contient les scripts Python de scraping pour l'extraction de données handball.

## 📁 Structure

```
backend/
├── scraper/                    # Scripts de scraping principal
│   ├── main.py                # Point d'entrée du scraper
│   ├── scraping.py            # Logique de scraping
│   ├── parsing.py             # Parsing des données
│   ├── config.py              # Configuration du scraper
│   ├── classement.py          # Gestion des classements
│   └── backup_config.py       # Sauvegarde de configuration
├── scraper_service.py         # Service de scraping
├── test_pdf_structure.py      # Tests de structure PDF
├── requirements_scraper.txt   # Dépendances Python
├── logs/                      # Logs de scraping
├── .env                       # Variables d'environnement
└── .env.example               # Exemple de configuration
```

## 🚀 Utilisation

Les scripts sont appelés automatiquement par les **Server Actions Next.js** depuis `app/actions/scraping-actions.ts`.

**Exemple d'appel :**

```typescript
// Dans scraping-actions.ts
const pythonProcess = spawn("python", [
  "./backend/scraper/main.py",
  "--mode",
  "full",
  "--config",
  JSON.stringify(config),
]);
```

## 📦 Installation des dépendances

```bash
# Installer les dépendances Python
cd backend
pip install -r requirements_scraper.txt
```

## 🔧 Configuration

1. Copier `.env.example` vers `.env`
2. Remplir les variables d'environnement nécessaires
3. Les Server Actions Next.js gèrent automatiquement la configuration

## 📊 Intégration

- **Déclenchement** : Via Server Actions Next.js
- **Données** : Sauvegardées directement en PostgreSQL
- **Logs** : Stockés dans `logs/`
- **Status** : Suivi via l'interface Next.js

## 🏗️ Architecture

```
Next.js Server Actions → Python Scripts → PostgreSQL
       ↑                      ↓
   Interface Web         Données scrappées
```

Cette architecture unifiée permet de lancer le scraping depuis l'interface web tout en conservant la puissance des scripts Python existants.
