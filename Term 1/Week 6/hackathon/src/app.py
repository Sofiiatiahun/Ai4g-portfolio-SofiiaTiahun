"""
FastAPI web server exposing REST endpoints for the dashboard and serving
the interactive frontend.
"""

import os
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from src.storage import get_posts, get_sentiment_timeline, get_stats

app = FastAPI(title="NS Live Pulse API")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    with open(index_file, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/api/stats")
async def api_stats():
    return get_stats()

@app.get("/api/timeline")
async def api_timeline(interval: str = Query("hour", regex="^(hour|day)$")):
    return get_sentiment_timeline(interval=interval)

@app.get("/api/posts")
async def api_posts(limit: int = 150, offset: int = 0, sentiment: str = None):
    return get_posts(limit=limit, offset=offset, sentiment_filter=sentiment)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.app:app", host="0.0.0.0", port=8000, reload=False)
