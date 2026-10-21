from pydantic import BaseModel, Field
from app.core.config import settings

class ChatRequest(BaseModel):
    session_id: str = Field(default="default", description="Chat session ID")
    prompt: str = Field(..., min_length=1, description="User query")
    system_prompt: str = Field(default="You are a helpful AI Assistant", description="System instructions for the model")
    model: str = Field(default=settings.OLLAMA_DEFAULT_MODEL)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)

class ChatResponse(BaseModel):
    session_id: str | None = None
    model: str
    response: str
    total_duration_ms: float | None = None