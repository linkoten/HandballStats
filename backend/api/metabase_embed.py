import os
import time
import jwt
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()

# À adapter : mettre la même clé que dans MB_EMBEDDING_SECRET_KEY
def get_metabase_secret_key():
    return os.getenv("MB_EMBEDDING_SECRET_KEY", "super_secret_key_2026")

@router.get("/metabase-embed-url")
def metabase_embed_url(request: Request, resource: str, params: dict = None):
    # resource: "dashboard" ou "question"
    # params: dict de filtres (ex: {"club_id": 123})
    METABASE_SITE_URL = os.getenv("METABASE_SITE_URL", "http://localhost:3001")
    METABASE_SECRET_KEY = get_metabase_secret_key()
    payload = {
        "resource": {resource: int(request.query_params.get("id", 1))},
        "params": params or {},
        "exp": int(time.time()) + 600  # 10 min
    }
    token = jwt.encode(payload, METABASE_SECRET_KEY, algorithm="HS256")
    iframe_url = f"{METABASE_SITE_URL}/embed/{resource}/{token.decode() if hasattr(token, 'decode') else token}#bordered=true&titled=true"
    return JSONResponse({"iframe_url": iframe_url})
