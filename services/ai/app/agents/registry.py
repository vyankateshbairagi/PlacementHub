from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.agents.base import BaseAgent
from app.agents.chat_response_agent import NormalAgent
from app.agents.citation_agent import CitationAgent
from app.service.ai_service import AIService, get_ai_service
from app.service.memory_service import MemoryService, get_memory_service
from app.service.knowledge_service import KnowledgeService

class AgentRegistry:
    def __init__(
        self,
        ai_service: AIService,
        memory_service: MemoryService,
        knowledge_service: KnowledgeService,
    ):
        self._agents: dict[str, BaseAgent] = {
            "normal": NormalAgent(ai_service, memory_service),
            "citation": CitationAgent(ai_service, memory_service, knowledge_service),
        }

    def get_agent(self, name: str) -> BaseAgent:
        agent = self._agents.get(name)
        if not agent:
            raise HTTPException(
                status_code=404,
                detail=f"Agent '{name}' not found. Available: {list(self._agents.keys())}",
            )
        return agent

    def list_agents(self) -> list[dict[str, str]]:
        return [
            {"name": a.name, "description": a.description}
            for a in self._agents.values()
        ]

def get_knowledge_service(
    db: AsyncSession = Depends(get_db),
    ai_service: AIService = Depends(get_ai_service),
) -> KnowledgeService:
    return KnowledgeService(db=db, ai_service=ai_service)

def get_agent_registry(
    ai_service: AIService = Depends(get_ai_service),
    memory_service: MemoryService = Depends(get_memory_service),
    knowledge_service: KnowledgeService = Depends(get_knowledge_service),
) -> AgentRegistry:
    return AgentRegistry(ai_service, memory_service, knowledge_service)