from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from scraper_adapter import run_legacy_scraper

app = FastAPI()

class CompetitionConfig(BaseModel):
    url: str
    equipe: str
    equipe_bdd: str
    competition_name: str
    poule: str
    max_journees: str
    saison: str
    phase: Optional[str] = None
    equipeId: Optional[int] = None

class ScrapeRequest(BaseModel):
    competitions: List[CompetitionConfig]

def run_scraper(request: ScrapeRequest):
    for comp in request.competitions:
        print(f"Scraping {comp.competition_name} ({comp.url})")
        # Appelle ici ta fonction main.py adaptée
        run_legacy_scraper(comp.dict())

@app.post("/scrape")
async def scrape(request: ScrapeRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_scraper, request)
    return {"status": "started"}
