"""
API FastAPI pour Handball Stats
Ce fichier expose l'API REST pour le service web
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Handball Stats API",
    description="API pour les statistiques de handball",
    version="1.0.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À adapter selon vos besoins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """
    Point d'entrée principal de l'API
    """
    return {
        "message": "Bienvenue sur l'API Handball Stats",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """
    Endpoint de vérification de santé du service
    """
    return {
        "status": "healthy",
        "service": "handball-stats-api"
    }

# TODO: Ajoutez vos autres routes ici
# Exemple:
# @app.get("/competitions")
# async def get_competitions():
#     return {"competitions": []}

# @app.get("/matches")
# async def get_matches():
#     return {"matches": []}