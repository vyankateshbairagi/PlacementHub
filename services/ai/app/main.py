import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base
from app.models import chat_model, knowledge_model
from app.routes import (
    agent_router,
    ai_router,
    job_router,
    evidence_router,
    matching_router,
    resume_router,
    interview_router,
)
from app.service.ai_service import check_ollama_health

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        models = await check_ollama_health()
        logger.info(f"Connected to Ollama, Available models: {models}")
    except Exception as e:
        logger.warning(f"[WARN]: Ollama AI Service not available at startup: {e}")

    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning(f"[WARN]: Database connection not available at startup: {e}")
    yield
    await engine.dispose()

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.include_router(ai_router.router, prefix="/api/v1")
app.include_router(agent_router.router, prefix="/api/v1")
app.include_router(job_router.router, prefix="/api/v1")
app.include_router(evidence_router.router, prefix="/api/v1")
app.include_router(matching_router.router, prefix="/api/v1")
app.include_router(resume_router.router, prefix="/api/v1")
app.include_router(interview_router.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": f"{settings.APP_NAME} is running"}
