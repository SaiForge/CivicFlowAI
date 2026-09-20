import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if present, overriding any ambient shell variables (e.g. from local proxies)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)
else:
    load_dotenv(override=True)

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=str(env_path) if env_path.exists() else ".env",
            env_file_encoding="utf-8",
            extra="ignore",
        )

        LLM_PROVIDER: str = "gemini"  # "gemini", "openai", "auto"
        OPENAI_API_KEY: str = ""
        MODEL_NAME: str = "gpt-4o-mini"
        VISION_MODEL_NAME: str = "gpt-4o-mini"

        GEMINI_API_KEY: str = ""
        GOOGLE_API_KEY: str = ""
        GEMINI_MODEL_NAME: str = "gemini-1.5-flash"

        MAX_RETRIES: int = 2
        CONFIDENCE_THRESHOLD: float = 0.7
        DATABASE_URL: str = "sqlite:///./civic.db"
        LOG_LEVEL: str = "INFO"

except ImportError:
    try:
        from pydantic import BaseSettings

        class Settings(BaseSettings):
            LLM_PROVIDER: str = "gemini"
            OPENAI_API_KEY: str = ""
            MODEL_NAME: str = "gpt-4o-mini"
            VISION_MODEL_NAME: str = "gpt-4o-mini"
            GEMINI_API_KEY: str = ""
            GOOGLE_API_KEY: str = ""
            GEMINI_MODEL_NAME: str = "gemini-1.5-flash"
            MAX_RETRIES: int = 2
            CONFIDENCE_THRESHOLD: float = 0.7
            DATABASE_URL: str = "sqlite:///./civic.db"
            LOG_LEVEL: str = "INFO"

            class Config:
                env_file = str(env_path) if env_path.exists() else ".env"
                extra = "ignore"
    except ImportError:
        class Settings:
            def __init__(self):
                self.LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
                self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
                self.MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o-mini")
                self.VISION_MODEL_NAME = os.getenv("VISION_MODEL_NAME", "gpt-4o-mini")
                self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
                self.GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
                self.GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")
                self.MAX_RETRIES = int(os.getenv("MAX_RETRIES", "2"))
                self.CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.7"))
                self.DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./civic.db")
                self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
