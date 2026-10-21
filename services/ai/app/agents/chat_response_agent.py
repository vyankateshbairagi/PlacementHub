from app.agents.base import BaseAgent
from app.schema.agent_schema import AgentRequest, AgentResponse

class NormalAgent(BaseAgent):
    name = "normal"
    description = "General-purpose conversational agent with PostgreSQL long-term chat memory."
    system_prompt = (
        "You are a helpful, direct, and knowledgeable AI assistant. "
        "Answer the user's questions clearly using the conversation context."
    )
    temperature = 0.7

    async def run(self, request: AgentRequest) -> AgentResponse:
        _, messages = await self._prepare_conversation(request.session_id, request.prompt)

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
            citations=[],
        )