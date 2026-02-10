from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings as cfg
from routers import consistency, generate, settings

app = FastAPI(title="Chat to Note")

app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(consistency.router, prefix="/api/consistency", tags=["consistency"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])


@app.get("/api/health")
def health():
    return {"status": "ok", "api_key_configured": bool(cfg.ANTHROPIC_API_KEY)}


@app.get("/")
def root():
    return FileResponse("static/index.html")


app.mount("/static", StaticFiles(directory="static"), name="static")
