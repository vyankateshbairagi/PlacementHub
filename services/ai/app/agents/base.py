from abc import ABC, abstractmethod
from app.schema.agent_schema import AgentRequest, AgentResponse
from app.service.ai_service import AIService
from app.service.memory_service import MemoryService

class BaseAgent(ABC):
    name: str = "base"
    description: str = "Abstract Base Agent"
    system_prompt: str = "You are a helpful AI assistant."
    temperature: float = 0.7

    def __init__(self, ai_service: AIService, memory_service: MemoryService):
        self.ai_service = ai_service
        self.memory = memory_service

    async def _prepare_conversation(
        self, session_id: str, prompt: str
    ) -> tuple[list[float], list[dict[str, str]]]:
        await self.memory.ensure_system_prompt(session_id, self.system_prompt)
        user_embedding = await self.ai_service.generate_embedding(prompt)
        await self.memory.add_message(
            session_id=session_id,
            role="user",
            content=prompt,
            embedding=user_embedding,
        )
        history = await self.memory.build_context_messages(
            session_id=session_id,
            query_embedding=user_embedding,
        )
        return user_embedding, history

    async def _save_assistant_reply(self, session_id: str, reply: str) -> None:
        reply_embedding = await self.ai_service.generate_embedding(reply)
        await self.memory.add_message(
            session_id=session_id,
            role="assistant",
            content=reply,
            embedding=reply_embedding,
        )

    @abstractmethod
    async def run(self, request: AgentRequest) -> AgentResponse:
        pass