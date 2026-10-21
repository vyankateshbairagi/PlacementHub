from fastapi import APIRouter, Depends, UploadFile, File, Form
from pydantic import BaseModel, HttpUrl
from app.schema.agent_schema import AgentRequest, AgentResponse, InlineSourceInput
from app.agents.registry import AgentRegistry, get_agent_registry, get_knowledge_service
from app.service.knowledge_service import KnowledgeService

router = APIRouter(prefix="/agents", tags=["Isolated Agents & Citations"])

class WebIngestRequest(BaseModel):
    url: HttpUrl
    collection_id: str = "global"

class PageIngestRequest(InlineSourceInput):
    collection_id: str = "global"

@router.get("/")
async def list_agents(registry: AgentRegistry = Depends(get_agent_registry)):
    return {"agents": registry.list_agents()}

@router.post("/{agent_name}/run", response_model=AgentResponse)
async def run_agent(
    agent_name: str,
    request: AgentRequest,
    registry: AgentRegistry = Depends(get_agent_registry),
):
    agent = registry.get_agent(agent_name)
    return await agent.run(request)

@router.post("/citation/ingest/pdf")
async def ingest_pdf_source(
    collection_id: str = Form("global"),
    file: UploadFile = File(...),
    knowledge: KnowledgeService = Depends(get_knowledge_service),
):
    pdf_bytes = await file.read()
    chunks = await knowledge.ingest_pdf(pdf_bytes, file.filename or "document.pdf", collection_id)
    return {"status": "indexed", "source_type": "pdf", "filename": file.filename, "chunks": chunks}

@router.post("/citation/ingest/web")
async def ingest_web_source(
    request: WebIngestRequest,
    knowledge: KnowledgeService = Depends(get_knowledge_service),
):
    chunks = await knowledge.ingest_web_url(str(request.url), request.collection_id)
    return {"status": "indexed", "source_type": "web", "url": str(request.url), "chunks": chunks}

@router.post("/citation/ingest/page")
async def ingest_page_source(
    request: PageIngestRequest,
    knowledge: KnowledgeService = Depends(get_knowledge_service),
):
    chunks = await knowledge.ingest_page_info(
        title=request.title,
        locator=request.locator,
        content=request.content,
        metadata=request.metadata,
        collection_id=request.collection_id,
    )
    return {"status": "indexed", "source_type": "page", "title": request.title, "chunks": chunks}