from app.agents.base import BaseAgent
from app.schema.agent_schema import AgentRequest, AgentResponse, CitationItem
from app.service.ai_service import AIService
from app.service.memory_service import MemoryService
from app.service.knowledge_service import KnowledgeService

class CitationAgent(BaseAgent):
    name = "citation"
    description = "Answers questions grounded in PDFs, Web URLs, and Page content with inline [n] citations."
    system_prompt = (
        "You are a strict Citation & Research Agent. "
        "You MUST answer the user's question using the provided SOURCES block. "
        "Cite your facts inline using bracketed numbers like [1], [2] immediately after the claim. "
        "If multiple sources support a claim, cite all of them, e.g., [1][3]. "
        "If the provided sources do not contain the answer, state clearly what is missing."
    )
    temperature = 0.2

    def __init__(
        self,
        ai_service: AIService,
        memory_service: MemoryService,
        knowledge_service: KnowledgeService,
    ):
        super().__init__(ai_service, memory_service)
        self.knowledge = knowledge_service

    async def run(self, request: AgentRequest) -> AgentResponse:
        user_embedding, messages = await self._prepare_conversation(
            request.session_id, request.prompt
        )

        citations: list[CitationItem] = await self.knowledge.search_citations(
            query_embedding=user_embedding,
            collection_id=request.collection_id,
            top_k=5,
        )

        next_id = len(citations) + 1
        for inline in request.inline_sources:
            citations.append(
                CitationItem(
                    citation_id=next_id,
                    source_type=inline.source_type,
                    title=inline.title,
                    locator=inline.locator,
                    snippet=inline.content,
                    metadata=inline.metadata,
                    similarity_score=1.0,
                )
            )
            next_id += 1

        if citations:
            formatted_sources = []
            for c in citations:
                meta_info = (
                    f" (Page {c.metadata.get('page_number')})"
                    if c.metadata and c.metadata.get("page_number")
                    else ""
                )
                formatted_sources.append(
                    f"[{c.citation_id}] TYPE: {c.source_type.upper()} | "
                    f"TITLE: {c.title}{meta_info} | LOCATOR: {c.locator}\n"
                    f"CONTENT: {c.snippet}"
                )
            sources_block = (
                "SOURCES FOR CITATION:\n\n" + "\n\n---\n\n".join(formatted_sources)
            )
            if messages:
                messages.insert(-1, {"role": "system", "content": sources_block})
            else:
                messages.append({"role": "system", "content": sources_block})

        reply = await self.ai_service.chat_raw(
            messages=messages,
            model=request.model,
            temperature=self.temperature,
        )

        await self._save_assistant_reply(request.session_id, reply)

        return AgentResponse(
            session_id=request.session_id,
            agent_name=self.name,
            response=reply,
            citations=citations,
        )