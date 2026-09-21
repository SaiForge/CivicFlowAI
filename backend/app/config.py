import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Agent
    AGENT_SERVICE_URL: str = os.getenv("AGENT_SERVICE_URL", "http://localhost:8000")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "5000"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://civicflow:civicflow_secret@postgres:5432/civicflow",
    )

    # Redis Cache & Realtime
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")

    # JWT Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change_me_in_production_civicflow_2024")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Voice / AI Services
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL_NAME: str = os.getenv("OPENROUTER_MODEL_NAME", "inclusionai/ling-3.0-flash-vl:free")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")


settings = Settings()
