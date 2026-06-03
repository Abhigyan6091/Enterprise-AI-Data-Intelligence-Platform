from app.domain.schemas.agent import AgentExecutionResult
from app.domain.models.state import PlatformState
from app.infrastructure.retrieval.hybrid import get_hybrid_retriever
from app.infrastructure.retrieval.compression import get_context_compressor
from langchain_core.documents import Document
import logging

logger = logging.getLogger(__name__)

class DocumentationAgent:
    """Specialized in executing unstructured RAG leveraging Async Hybrid Search mappings."""
    
    def __init__(self, raw_documents: list[Document] = None):
        # If no documents provided, will retrieve from Qdrant collection
        self.raw_documents = raw_documents or []
        self._hybrid_retriever = None
        self._compressor = None

    async def _ensure_initialized(self):
        if self._compressor is None:
            # Hybrid retriever handles both provided documents and Qdrant collection queries
            self._hybrid_retriever = await get_hybrid_retriever(self.raw_documents, "enterprise_knowledge")
            self._compressor = get_context_compressor(self._hybrid_retriever)

    async def execute(self, state: PlatformState) -> AgentExecutionResult:
        """
        Converted directly to asyncio mappings utilizing native Langchain .ainvoke().
        This fully mitigates event loop halting during intensive Qdrant density metrics lookups.
        """
        await self._ensure_initialized()
        queries = state.get("decomposed_queries", [state.get("rewritten_query")])
        all_chunks = []
        
        for q in queries:
            if not q: continue
            chunks = await self._compressor.ainvoke(q)
            logger.info(f"📚 Retrieved {len(chunks)} chunks for query: {q[:100] if q else 'N/A'}")
            all_chunks.extend(chunks)
            
        logger.info(f"📚 Total retrieved chunks: {len(all_chunks)}")
        combined_text = "\n\n".join([c.page_content for c in all_chunks])
        logger.info(f"📚 Combined context size: {len(combined_text)} characters")
        
        # Mapping back into the state dictates we do NOT overwrite if in parallel execution utilizing Send APIs, 
        # it is returned seamlessly enforcing `Annotated` reducers.
        return AgentExecutionResult(
            agent_name="DocumentationAgent",
            status="SUCCESS",
            raw_response=combined_text,
            tools_invoked=len(queries)
        )
