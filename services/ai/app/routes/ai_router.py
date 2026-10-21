from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.schema.ai_schema import ChatRequest, ChatResponse
from app.service.ai_service import AIService, get_ai_service

router = APIRouter(prefix="/ai", tags=["AI Service"])

@router.get("/health")
async def ai_health_check(service: AIService = Depends(get_ai_service)):
    models = await service.check_health()
    return {"status": 200, "available_models": models}

@router.post("/chat", response_model=ChatResponse)
async def chat_completion(request: ChatRequest, service: AIService = Depends(get_ai_service)):
    return await service.generate_chat(request)

@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    service: AIService = Depends(get_ai_service),
):
    return StreamingResponse(
        service.stream_chat(request),
        media_type="text/event-stream",
    )

@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    service: AIService = Depends(get_ai_service),
):
    history = await service.memory.get_full_history(session_id)
    return {"session_id": session_id, "messages": history}

@router.delete("/history/{session_id}")
async def clear_chat_history(
    session_id: str,
    service: AIService = Depends(get_ai_service),
):
    cleared = await service.memory.clear_session(session_id)
    return {"session_id": session_id, "cleared": cleared}
