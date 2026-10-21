from typing import Any, cast
from fastapi import Depends
from sqlalchemy import select, delete, CursorResult
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.chat_model import ChatMessage

class MemoryService:
    def __init__(self, db: AsyncSession, recent_limit: int = 20, semantic_limit: int = 3):
        self.db = db
        self.recent_limit = recent_limit
        self.semantic_limit = semantic_limit

    async def ensure_system_prompt(self, session_id: str, system_prompt: str) -> None:
        statement = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id, ChatMessage.role == "system")
            .limit(1)
        )
        existing = (await self.db.execute(statement)).scalar_one_or_none()
        if not existing:
            message = ChatMessage(
                session_id=session_id,
                role="system",
                content=system_prompt,
                embedding=None,
            )
            self.db.add(message)
            await self.db.commit()

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        embedding: list[float] | None = None,
    ) -> ChatMessage:
        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            embedding=embedding,
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def build_context_messages(
        self, session_id: str, query_embedding: list[float]
    ) -> list[dict[str, str]]:
        system_statement = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id, ChatMessage.role == "system")
            .order_by(ChatMessage.created_at.asc())
            .limit(1)
        )
        system_message = (await self.db.execute(system_statement)).scalar_one_or_none()

        recent_statement = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id, ChatMessage.role != "system")
            .order_by(ChatMessage.created_at.desc())
            .limit(self.recent_limit)
        )
        recent_rows = list((await self.db.execute(recent_statement)).scalars().all())
        recent_rows.reverse()
        recent_ids = {row.id for row in recent_rows}

        conditions = [
            ChatMessage.session_id == session_id,
            ChatMessage.role != "system",
            ChatMessage.embedding.is_not(None),
        ]
        if recent_ids:
            conditions.append(ChatMessage.id.not_in(recent_ids))

        semantic_statement = (
            select(ChatMessage)
            .where(*conditions)
            .order_by(ChatMessage.embedding.cosine_distance(query_embedding))
            .limit(self.semantic_limit)
        )
        semantic_rows = list((await self.db.execute(semantic_statement)).scalars().all())

        messages: list[dict[str, str]] = []
        if system_message:
            messages.append({"role": "system", "content": system_message.content})

        if semantic_rows:
            recalled_text = "\n".join(
                [f"[{m.role}]: {m.content}" for m in semantic_rows]
            )
            messages.append(
                {
                    "role": "system",
                    "content": f"Relevant context recalled from earlier in this conversation:\n{recalled_text}",
                }
            )

        for r in recent_rows:
            messages.append({"role": r.role, "content": r.content})

        return messages

    build_context_message = build_context_messages

    async def get_full_history(self, session_id: str) -> list[dict[str, str]]:
        statement = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        rows = (await self.db.execute(statement)).scalars().all()
        return [{"role": r.role, "content": r.content} for r in rows]

    async def clear_session(self, session_id: str) -> bool:
        statement = delete(ChatMessage).where(ChatMessage.session_id == session_id)
        result = cast(CursorResult[Any], await self.db.execute(statement))
        await self.db.commit()
        rowcount = getattr(result, "rowcount", 0) or 0
        return rowcount > 0

def get_memory_service(db: AsyncSession = Depends(get_db)) -> MemoryService:
    return MemoryService(db=db)