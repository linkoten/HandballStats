# 🏐 Handball Stats - Application Fullstack SAAS

Application fullstack de statistiques de handball pour l'ASC Rennais avec intégration Power BI.

## 📋 Architecture du Projet

```
HandballApp/
├── backend/                    # Backend Python (FastAPI)
│   ├── api/                   # Routes API
│   │   ├── __init__.py
│   │   └── main.py           # Point d'entrée FastAPI
│   ├── database/             # Gestion base de données
│   │   ├── __init__.py
│   │   └── database.py       # Connexion et opérations BDD
│   ├── models/               # Modèles Pydantic
│   │   ├── __init__.py
│   │   └── models.py         # Schémas de données
│   ├── scraper/              # Scripts de scraping
│   │   ├── __init__.py
│   │   ├── config.py         # Configuration des compétitions
│   │   ├── scraping.py       # Scraping des données FFHandball
│   │   ├── parsing.py        # Parsing des PDF
│   │   └── main.py           # Exécution du scraper
│   ├── services/             # Services métier (à développer)
│   ├── .env.example          # Template variables d'environnement
│   ├── .gitignore
│   ├── Dockerfile
│   └── requirements.txt      # Dépendances Python
│
├── handball-stats/            # Frontend Next.js
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx          # Page d'accueil
│   ├── components/           # Composants React (à développer)
│   ├── lib/
│   │   └── utils.ts
│   ├── public/
│   ├── .env.local            # Variables d'environnement Next.js
│   ├── Dockerfile
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml         # Orchestration des services
└── README.md                  # Ce fichier
```

## 🚀 Démarrage Rapide

### Prérequis

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose (optionnel)

### Option 1: Démarrage avec Docker (Recommandé)

1. **Cloner le projet**

```powershell
cd C:\Users\Francois\Desktop\ProjetHand\HandballApp
```

2. **Configurer les variables d'environnement**

```powershell
# Copier le fichier d'exemple
cp backend\.env.example backend\.env

# Éditer backend\.env avec vos valeurs si nécessaire
```

3. **Lancer l'application avec Docker Compose**

```powershell
docker-compose up -d
```

4. **Vérifier que les services sont démarrés**

```powershell
docker-compose ps
```

Services disponibles :

- Frontend Next.js: http://localhost:3000
- Backend API: http://localhost:8000
- Documentation API: http://localhost:8000/docs
- PostgreSQL: localhost:5432

### Option 2: Démarrage en Local (Sans Docker)

#### Backend Python

1. **Créer un environnement virtuel**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
```

2. **Installer les dépendances**

```powershell
pip install -r requirements.txt
```

3. **Configurer les variables d'environnement**

```powershell
cp .env.example .env
# Éditer .env avec vos paramètres PostgreSQL
```

4. **Lancer l'API FastAPI**

```powershell
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

L'API sera accessible sur http://localhost:8000

#### Frontend Next.js

1. **Installer les dépendances**

```powershell
cd handball-stats
npm install
```

2. **Lancer le serveur de développement**

```powershell
npm run dev
```

L'application sera accessible sur http://localhost:3000

## 🗄️ Base de Données PostgreSQL

### Structure des Tables

```sql
-- Équipes
CREATE TABLE Equipes (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) UNIQUE NOT NULL,
    ville VARCHAR(255)
);

-- Joueurs
CREATE TABLE Joueurs (
    id SERIAL PRIMARY KEY,
    nom_prenom VARCHAR(255) NOT NULL,
    num_maillot INTEGER,
    id_equipe INTEGER REFERENCES Equipes(id),
    UNIQUE(nom_prenom, id_equipe)
);

-- Matchs
CREATE TABLE Matchs (
    id SERIAL PRIMARY KEY,
    match_url VARCHAR(500) UNIQUE NOT NULL,
    pdf_url VARCHAR(500),
    competition_name VARCHAR(255),
    equipe_recevant_id INTEGER REFERENCES Equipes(id),
    equipe_exterieur_id INTEGER REFERENCES Equipes(id),
    score_final VARCHAR(50),
    date_match TIMESTAMP,
    Arbitre_1 VARCHAR(255),
    Arbitre_2 VARCHAR(255)
);

-- Statistiques des Joueurs
CREATE TABLE Statistiques_Joueur (
    id SERIAL PRIMARY KEY,
    id_match INTEGER REFERENCES Matchs(id),
    id_joueur INTEGER REFERENCES Joueurs(id),
    buts INTEGER DEFAULT 0,
    sept_metres INTEGER DEFAULT 0,
    tirs INTEGER DEFAULT 0,
    arrets INTEGER DEFAULT 0,
    avertissements INTEGER DEFAULT 0,
    exclusions_2min INTEGER DEFAULT 0,
    discipline INTEGER DEFAULT 0,
    UNIQUE(id_match, id_joueur)
);
```

### Initialiser la base de données

Si vous utilisez une installation locale de PostgreSQL :

```powershell
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE Handball;

# Exécuter le script de création des tables
\i database/init.sql
```

## 🔄 Scraping des Données

### Lancer le Scraper

Le scraper récupère automatiquement les données depuis le site de la FFHandball.

```powershell
cd backend
python -m scraper.main
```

### Configuration des Compétitions

Modifiez `backend/scraper/config.py` pour ajouter/modifier les compétitions à scraper :

```python
BASE_URLS = [
    {
        "url": "https://www.ffhandball.fr/competitions/...",
        "equipe": "ASC RENNAIS",
        "equipe_bdd": "ASCR Handball 1 M",
        "competition_name": "2025/2026 - Excellence Bretagne (M1)",
        "poule": "poule-168419",
        "max_journees": 22
    },
    # ... autres compétitions
]
```

## 📊 API Endpoints

### Équipes

- `GET /api/equipes` - Liste toutes les équipes
- `GET /api/equipes/{id}` - Détails d'une équipe
- `POST /api/equipes` - Créer une équipe

### Joueurs

- `GET /api/joueurs` - Liste tous les joueurs
- `GET /api/joueurs/{id}` - Détails d'un joueur
- `GET /api/joueurs?equipe_id={id}` - Joueurs d'une équipe

### Matchs

- `GET /api/matchs` - Liste les matchs
- `GET /api/matchs/{id}` - Détails complets d'un match
- `GET /api/matchs?equipe_id={id}` - Matchs d'une équipe
- `GET /api/matchs?competition={name}` - Matchs d'une compétition

### Statistiques

- `GET /api/statistiques/joueur/{id}` - Stats d'un joueur
- `GET /api/statistiques/equipe/{id}` - Stats agrégées d'une équipe

Documentation interactive : http://localhost:8000/docs

## 🛠️ Technologies Utilisées

### Backend

- **FastAPI** - Framework web Python moderne et rapide
- **PostgreSQL** - Base de données relationnelle
- **psycopg2** - Connecteur PostgreSQL pour Python
- **Selenium** - Scraping web dynamique
- **BeautifulSoup** - Parsing HTML
- **pdfplumber** - Extraction de données PDF
- **Pydantic** - Validation des données

### Frontend

- **Next.js 16** - Framework React
- **React 19** - Bibliothèque UI
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS
- **Lucide React** - Icônes

### DevOps

- **Docker** - Conteneurisation
- **Docker Compose** - Orchestration multi-conteneurs

## 📈 Intégration Power BI

Pour intégrer vos rapports Power BI :

1. Publiez votre rapport sur Power BI Service
2. Obtenez le code d'intégration (iframe)
3. Ajoutez-le dans le composant Next.js approprié

Exemple :

```tsx
<iframe
  width="100%"
  height="600"
  src="https://app.powerbi.com/view?r=YOUR_REPORT_ID"
  frameBorder="0"
  allowFullScreen={true}
></iframe>
```

## 🧪 Tests

```powershell
# Backend
cd backend
pytest

# Frontend
cd handball-stats
npm test
```

## 📝 Scripts Utiles

```powershell
# Backend
cd backend
python -m scraper.main          # Lancer le scraper
uvicorn api.main:app --reload   # Lancer l'API en mode dev

# Frontend
cd handball-stats
npm run dev                      # Serveur de développement
npm run build                    # Build de production
npm run start                    # Serveur de production
npm run lint                     # Linter

# Docker
docker-compose up -d             # Démarrer tous les services
docker-compose down              # Arrêter tous les services
docker-compose logs -f           # Voir les logs en temps réel
docker-compose ps                # Statut des services
```

## 🔐 Sécurité

⚠️ **Important** : Ne commitez JAMAIS les fichiers `.env` contenant vos mots de passe !

Les fichiers suivants sont ignorés par Git :

- `backend/.env`
- `handball-stats/.env.local`

Utilisez les fichiers `.env.example` comme templates.

## 📦 Déploiement

### Production avec Docker

```powershell
docker-compose -f docker-compose.prod.yml up -d
```

### Variables d'environnement de Production

Modifiez les variables dans vos fichiers `.env` pour la production :

- Changez les mots de passe
- Utilisez des URLs de production
- Configurez CORS correctement

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est privé et destiné à l'ASC Rennais.

## 👥 Auteurs

- **François** - Développement initial

## 📞 Support

Pour toute question ou problème :

- Créez une issue sur GitHub
- Contactez l'équipe de développement

---

**Note** : Ce projet est en développement actif. La structure et les fonctionnalités peuvent évoluer.
#   H a n d b a l l S t a t s  
 