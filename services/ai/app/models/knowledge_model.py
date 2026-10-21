from datetime import datetime, timezone
from typing import Any, Literal
from sqlalchemy import String, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from app.core.database import Base
from app.core.config import settings

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    collection_id: Mapped[str] = mapped_column(String(128), index=True, default="global")
    source_type: Mapped[Literal["pdf", "web", "page"]] = mapped_column(String(32), nullable=False)
    source_title: Mapped[str] = mapped_column(String(512), nullable=False)
    source_locator: Mapped[str] = mapped_column(String(1024), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    embedding: Mapped[list[float]] = mapped_column(
        Vector(settings.OLLAMA_EMBED_DIM), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )