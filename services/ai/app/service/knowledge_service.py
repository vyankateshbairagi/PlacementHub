import io
from typing import Literal, cast
import httpx
from bs4 import BeautifulSoup
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.knowledge_model import KnowledgeChunk
from app.schema.agent_schema import CitationItem
from app.service.ai_service import AIService

class KnowledgeService:
    def __init__(self, db: AsyncSession, ai_service: AIService):
        self.db = db
        self.ai_service = ai_service

    def _chunk_text(self, text: str, chunk_size: int = 800, overlap: int = 150) -> list[str]:
        clean = " ".join(text.split())
        if not clean:
            return []
        chunks = []
        start = 0
        step = max(1, chunk_size - overlap)
        while start < len(clean):
            end = start + chunk_size
            chunks.append(clean[start:end])
            start += step
        return chunks

    async def ingest_pdf(
        self, file_bytes: bytes, filename: str, collection_id: str = "global"
    ) -> int:
        reader = PdfReader(io.BytesIO(file_bytes))
        total_chunks = 0

        for page_idx, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""
            for chunk in self._chunk_text(page_text):
                emb = await self.ai_service.generate_embedding(chunk)
                self.db.add(
                    KnowledgeChunk(
                        collection_id=collection_id,
                        source_type="pdf",
                        source_title=filename,
                        source_locator=f"{filename}#page={page_idx}",
                        content=chunk,
                        metadata_={"page_number": page_idx, "total_pages": len(reader.pages)},
                        embedding=emb,
                    )
                )
                total_chunks += 1

        await self.db.commit()
        return total_chunks

    async def ingest_web_url(self, url: str, collection_id: str = "global") -> int:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()

        title = soup.title.get_text().strip() if soup.title else url
        text = soup.get_text(separator=" ")
        chunks = self._chunk_text(text)

        for idx, chunk in enumerate(chunks, start=1):
            emb = await self.ai_service.generate_embedding(chunk)
            self.db.add(
                KnowledgeChunk(
                    collection_id=collection_id,
                    source_type="web",
                    source_title=title,
                    source_locator=url,
                    content=chunk,
                    metadata_={"chunk_index": idx, "domain": httpx.URL(url).host},
                    embedding=emb,
                )
            )

        await self.db.commit()
        return len(chunks)

    async def ingest_page_info(
        self,
        title: str,
        locator: str,
        content: str,
        metadata: dict,
        collection_id: str = "global",
    ) -> int:
        chunks = self._chunk_text(content)
        for idx, chunk in enumerate(chunks, start=1):
            emb = await self.ai_service.generate_embedding(chunk)
            self.db.add(
                KnowledgeChunk(
                    collection_id=collection_id,
                    source_type="page",
                    source_title=title,
                    source_locator=locator,
                    content=chunk,
                    metadata_={**metadata, "chunk_index": idx},
                    embedding=emb,
                )
            )
        await self.db.commit()
        return len(chunks)

    async def search_citations(
        self, query_embedding: list[float], collection_id: str = "global", top_k: int = 5
    ) -> list[CitationItem]:
        distance_col = KnowledgeChunk.embedding.cosine_distance(query_embedding).label("distance")
        stmt = (
            select(KnowledgeChunk, distance_col)
            .where(KnowledgeChunk.collection_id == collection_id)
            .order_by(distance_col.asc())
            .limit(top_k)
        )
        rows = (await self.db.execute(stmt)).all()

        citations: list[CitationItem] = []
        for idx, (chunk, distance) in enumerate(rows, start=1):
            similarity = round(max(0.0, 1.0 - float(distance)), 4)
            source_type = cast(Literal["pdf", "web", "page"], chunk.source_type)
            citations.append(
                CitationItem(
                    citation_id=idx,
                    source_type=source_type,
                    title=chunk.source_title,
                    locator=chunk.source_locator,
                    snippet=chunk.content,
                    metadata=chunk.metadata_ if chunk.metadata_ is not None else {},
                    similarity_score=similarity,
                )
            )
        return citations