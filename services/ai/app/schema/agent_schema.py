from typing import Any, Literal
from pydantic import BaseModel, Field
from app.core.config import settings

class InlineSourceInput(BaseModel):
    source_type: Literal["pdf", "web", "page"] = "page"
    title: str = Field(..., description="Document title")
    locator: str = Field(..., description="URL, filename, or DOM/page identifier")
    content: str = Field(..., description="Extracted text from source")
    metadata: dict[str, Any] = Field(default_factory=dict, description="example: {'page_number': 4}")

class CitationItem(BaseModel):
    citation_id: int = Field(..., description="1-based index matching [1], [2] in the response")
    source_type: Literal["pdf", "web", "page"]
    title: str
    locator: str = Field(..., description="URL, PDF filename, or page route")
    snippet: str = Field(..., description="Exact excerpt used from the source")
    metadata: dict[str, Any] = Field(default_factory=dict)
    similarity_score: float | None = None

class AgentRequest(BaseModel):
    session_id: str = Field(..., min_length=1, description="Chat session ID stored in Postgres")
    prompt: str = Field(..., min_length=1)
    model: str = Field(default=settings.OLLAMA_DEFAULT_MODEL)
    collection_id: str = Field(
        default="global",
        description="Knowledge collection to search (used by citation_agent)",
    )
    inline_sources: list[InlineSourceInput] = Field(
        default_factory=list,
        description="Optional live page/web snippets passed directly with the request",
    )

class AgentResponse(BaseModel):
    session_id: str
    agent_name: str
    response: str
    citations: list[CitationItem] = Field(
        default_factory=list,
        description="Populated by citation_agent; empty for normal_agent",
    )