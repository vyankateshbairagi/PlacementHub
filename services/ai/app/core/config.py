from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "Main Backend API"
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_DEFAULT_MODEL: str = Field(
        default="llama3.1:8b-instruct-q4_K_M",
        validation_alias=AliasChoices("OLLAMA_DEFAULT_MODEL", "AI_MODEL"),
    )
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    OLLAMA_EMBED_DIM: int = 768
    OLLAMA_KEEP_ALIVE: str = "5m"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:admin@localhost:5432/ai_service_db"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()