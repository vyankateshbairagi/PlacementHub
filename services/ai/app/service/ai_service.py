import json
from typing import AsyncGenerator
from fastapi import HTTPException, Depends
from ollama import AsyncClient, ResponseError
from app.core.config import settings
from app.schema.ai_schema import ChatRequest, ChatResponse
from app.service.memory_service import MemoryService, get_memory_service

ollama_client = AsyncClient(host=settings.OLLAMA_HOST)

async def check_ollama_health() -> list[str]:
    try:
        res = await ollama_client.list()
        return [m.model or "null" for m in res.models]
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama service unreachable at {settings.OLLAMA_HOST}: {str(e)}",
        )

class AIService:
    def __init__(self, memory: MemoryService):
        self.client = ollama_client
        self.memory = memory

    async def check_health(self) -> list[str]:
        return await check_ollama_health()

    async def chat_raw(
        self,
        messages: list[dict[str, str]],
        model: str = settings.OLLAMA_DEFAULT_MODEL,
        temperature: float = 0.7,
        format: str | None = None,
    ) -> str:
        try:
            kwargs = {
                "model": model,
                "messages": messages,
                "options": {"temperature": temperature},
                "keep_alive": settings.OLLAMA_KEEP_ALIVE,
            }
            if format:
                kwargs["format"] = format
            response = await self.client.chat(**kwargs)
            return response.message.content or ""
        except ResponseError as e:
            raise HTTPException(status_code=e.status_code, detail=e.error)

    async def generate_embedding(self, text: str) -> list[float]:
        try:
            res = await self.client.embed(
                model=settings.OLLAMA_EMBED_MODEL,
                input=text,
                keep_alive=settings.OLLAMA_KEEP_ALIVE,
            )
            return list(res.embeddings[0])
        except ResponseError as e:
            raise HTTPException(status_code=e.status_code, detail=f"Embedding error: {e.error}")

    async def generate_chat(self, request: ChatRequest) -> ChatResponse:
        await self.memory.ensure_system_prompt(request.session_id, request.system_prompt)

        user_embedding = await self.generate_embedding(request.prompt)
        await self.memory.add_message(
            session_id=request.session_id,
            role="user",
            content=request.prompt,
            embedding=user_embedding,
        )

        messages = await self.memory.build_context_messages(
            session_id=request.session_id,
            query_embedding=user_embedding,
        )

        try:
            res = await self.client.chat(
                model=request.model,
                messages=messages,
                options={"temperature": request.temperature},
                keep_alive=settings.OLLAMA_KEEP_ALIVE,
            )
            assistant_reply = res.message.content or ""

            reply_embedding = await self.generate_embedding(assistant_reply)
            await self.memory.add_message(
                session_id=request.session_id,
                role="assistant",
                content=assistant_reply,
                embedding=reply_embedding,
            )

            duration_ms = (res.total_duration / 1_000_000) if res.total_duration else None
            return ChatResponse(
                session_id=request.session_id,
                model=request.model,
                response=assistant_reply,
                total_duration_ms=round(duration_ms, 2) if duration_ms else None,
            )
        except ResponseError as e:
            raise HTTPException(status_code=e.status_code, detail=e.error)

    async def stream_chat(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        await self.memory.ensure_system_prompt(request.session_id, request.system_prompt)

        user_embedding = await self.generate_embedding(request.prompt)
        await self.memory.add_message(
            session_id=request.session_id,
            role="user",
            content=request.prompt,
            embedding=user_embedding,
        )

        messages = await self.memory.build_context_messages(
            session_id=request.session_id,
            query_embedding=user_embedding,
        )

        full_reply: list[str] = []

        try:
            stream = await self.client.chat(
                model=request.model,
                messages=messages,
                options={"temperature": request.temperature},
                keep_alive=settings.OLLAMA_KEEP_ALIVE,
                stream=True,
            )
            async for chunk in stream:
                if hasattr(chunk, "message") and chunk.message:
                    content = chunk.message.content or ""
                elif isinstance(chunk, dict):
                    content = chunk.get("message", {}).get("content", "")
                else:
                    content = ""
                if content:
                    full_reply.append(content)
                    yield f"data: {json.dumps({'token': content})}\n\n"

            if full_reply:
                complete_text = "".join(full_reply)
                reply_embedding = await self.generate_embedding(complete_text)
                await self.memory.add_message(
                    session_id=request.session_id,
                    role="assistant",
                    content=complete_text,
                    embedding=reply_embedding,
                )

            yield "data: [DONE]\n\n"
        except ResponseError as e:
            yield f"data: {json.dumps({'error': e.error})}\n\n"

def get_ai_service(memory: MemoryService = Depends(get_memory_service)) -> AIService:
    return AIService(memory=memory)