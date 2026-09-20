import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.config import PORT, LOG_LEVEL, AGENT_SERVICE_URL
from app.supabase_client import SupabaseService
from app.api.auth import router as auth_router
from app.api.complaints import router as complaints_router
from app.api.agents import router as agents_router
from app.api.location import router as location_router

logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("civicflow_backend")

app = FastAPI(
    title="CivicFlowAI Backend API Gateway",
    description="Central API Gateway connecting React Frontend, Supabase Database & Auth, and 7-Specialist Multi-Agent AI Core",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(complaints_router, prefix="/api/v1")
app.include_router(agents_router, prefix="/api/v1")
app.include_router(location_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "service": "CivicFlowAI Backend API Gateway",
        "status": "online",
        "docs": "/docs",
        "agent_core_url": AGENT_SERVICE_URL,
        "supabase": SupabaseService.get_status()
    }


@app.get("/health")
async def health_check():
    """Unified health check covering Backend Gateway, Supabase, and Agent Core."""
    agent_healthy = False
    agent_info = {}
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            res = await client.get(f"{AGENT_SERVICE_URL}/health")
            if res.status_code == 200:
                agent_healthy = True
                agent_info = res.json()
    except Exception as e:
        logger.warning(f"Agent service ping failed: {e}")

    return {
        "status": "healthy",
        "gateway": "online",
        "port": PORT,
        "supabase": SupabaseService.get_status(),
        "agent_core": {
            "status": "healthy" if agent_healthy else "offline",
            "url": AGENT_SERVICE_URL,
            "agents_count": len(agent_info.get("agents", [])) if agent_healthy else 0,
            "agents": agent_info.get("agents", [])
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
