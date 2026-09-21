"""
CivicFlowAI Backend — FastAPI Application Entry Point
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.routes import auth_router, complaints_router, incidents_router, stats_router, notifs_router, router

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [backend]: %(message)s",
)
logger = logging.getLogger("civicflow.backend")


# ─────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="CivicFlowAI Backend API Gateway",
    description=(
        "Production-ready API Gateway for the CivicFlowAI multi-role civic grievance platform. "
        "Handles authentication, complaint lifecycle, image storage, AI agent orchestration, "
        "and all dashboard statistics."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Startup — create tables + seed demo users
# ─────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    logger.info("Creating database schema...")
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS agent_thoughts_json TEXT;"))
            conn.commit()
    except Exception as e:
        logger.warning(f"Schema patch notice: {e}")
    _seed_demo_data()
    try:
        from app.routes import purge_rejected_complaints
        with SessionLocal() as db:
            purge_rejected_complaints(db)
    except Exception as e:
        logger.warning(f"Initial purge check notice: {e}")
    logger.info("CivicFlowAI Backend ready.")


def _seed_demo_data():
    """
    Idempotently create demo login users only.
    No dummy/mock complaints or incidents are seeded so that all data in
    dashboards and command centres strictly reflects real citizen reports.
    """
    from app.models import User
    from app.auth import hash_password

    db = SessionLocal()
    try:
        # ── Demo users for role-based portal access ──────────────
        demo_users = [
            dict(name="Aarav Sharma", email="citizen@civicflow.gov",
                 password="demo123", role="citizen", ward="Ward 14, MG Road Area"),
            dict(name="Eng. Rajesh Kumar", email="dept@civicflow.gov",
                 password="demo123", role="dept", ward="Central Zone", dept="road"),
            dict(name="Dr. Meera Patel", email="admin@civicflow.gov",
                 password="admin123", role="admin", ward="Municipal HQ"),
        ]
        for u in demo_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    name=u["name"], email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"], ward=u["ward"],
                    dept=u.get("dept"),
                )
                db.add(user)
            else:
                existing.password_hash = hash_password(u["password"])
                existing.role = u["role"]
                existing.name = u["name"]
        db.commit()
        logger.info("Demo and default admin authentication accounts verified.")

    except Exception as exc:
        logger.error(f"Seeding error: {exc}", exc_info=True)
        db.rollback()
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

app.include_router(router)
app.include_router(auth_router)
app.include_router(complaints_router)
app.include_router(incidents_router)
app.include_router(stats_router)
app.include_router(notifs_router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "CivicFlowAI Backend API Gateway v2",
        "status": "online",
        "agent_service_url": settings.AGENT_SERVICE_URL,
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.BACKEND_PORT, reload=True)
