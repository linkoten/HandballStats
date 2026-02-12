# scraper_service.py - Service de scraping indépendant pour Render
import os
import sys
import requests
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import subprocess
from typing import List, Optional

# Add the parent directory to path to import scraper modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

app = FastAPI(title="Handball Scraper Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, restreindre aux domaines Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScrapingRequest(BaseModel):
    competitionIds: List[int]
    equipeId: int
    callbackUrl: str

@app.post("/scrape")
async def trigger_scraping(request: ScrapingRequest):
    """Déclenche le scraping en arrière-plan et notifie Vercel par callback."""
    try:
        # Démarrer le scraping de manière asynchrone
        asyncio.create_task(run_scraping_task(request))
        
        return {"success": True, "message": "Scraping démarré"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def run_scraping_task(request: ScrapingRequest):
    """Exécute le scraping et notifie Vercel des résultats."""
    try:
        for comp_id in request.competitionIds:
            # Notifier le début
            await notify_callback(request.callbackUrl, {
                "competitionId": comp_id,
                "status": "IN_PROGRESS", 
                "progress": 10
            })
            
            # Simuler le scraping (remplacer par votre logique réelle)
            await simulate_scraping(comp_id, request.callbackUrl)
            
            # Notifier la fin
            await notify_callback(request.callbackUrl, {
                "competitionId": comp_id,
                "status": "COMPLETED",
                "progress": 100,
                "matches": []  # Vos données de matchs
            })
            
    except Exception as e:
        # Notifier l'erreur
        await notify_callback(request.callbackUrl, {
            "competitionId": comp_id,
            "status": "FAILED",
            "progress": 0,
            "error": str(e)
        })

async def notify_callback(callback_url: str, data: dict):
    """Envoie une notification à Vercel."""
    try:
        auth_secret = os.getenv("WEBHOOK_AUTH_SECRET", "default-secret")
        headers = {
            "Content-Type": "application/json",
            "x-webhook-auth": auth_secret
        }
        
        response = requests.post(callback_url, json=data, headers=headers)
        print(f"Callback envoyé: {response.status_code}")
    except Exception as e:
        print(f"Erreur callback: {e}")

async def simulate_scraping(competition_id: int, callback_url: str):
    """Simulation du scraping - remplacer par votre logique."""
    # Simulation avec notifications de progression
    for progress in [25, 50, 75]:
        await asyncio.sleep(2)  # Simule le temps de scraping
        await notify_callback(callback_url, {
            "competitionId": competition_id,
            "status": "IN_PROGRESS",
            "progress": progress
        })

@app.get("/health")
def health_check():
    """Simple health check pour Render."""
    return {"status": "healthy"}

# Point d'entrée pour Render
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)