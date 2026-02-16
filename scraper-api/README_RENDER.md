# Déploiement Render pour Scraper FastAPI

## Build Command

```
pip install -r requirements.txt
```

## Start Command

```
uvicorn main:app --host 0.0.0.0 --port 10000
```

- Pousse ce dossier sur un repo GitHub.
- Crée un Web Service sur https://render.com (plan Free, Python).
- Renseigne les commandes ci-dessus.
- L'API sera accessible sur https://<ton-service>.onrender.com/scrape
