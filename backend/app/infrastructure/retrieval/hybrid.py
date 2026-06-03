import logging
import hashlib
from typing import List, Dict, Any
from langchain_qdrant import QdrantVectorStore
from langchain.retrievers.ensemble import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from qdrant_client import QdrantClient

from .vector_db import vector_store
from app.infrastructure.llm.embeddings import get_embeddings_model
from app.core.config import settings

logger = logging.getLogger(__name__)

# Lightweight in-memory LRU Retrieval Caching
# (In absolute prod, this would map directly onto the Redis CacheStore)
_retrieval_cache: Dict[str, List[Document]] = {}

class AdaptivePrunedEnsembleRetriever(EnsembleRetriever):
    """
    Overrides the Reciprocal Rank Fusion standard Ensemble.
    Calculates query complexity dynamically adjusting the max bounds of returned subsets 
    (Top-K Pruning) natively guarding the downstream CrossEncoder reranker computationally!
    """
    def _get_adaptive_k(self, query: str) -> int:
        # Complex multi-faceted analytical queries require far broader initial extraction limits mapping
        words = len(query.split())
        if words > 15:
            return 25
        return 12 

    async def _aget_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun) -> List[Document]:
        # 1. Retrieval Cache Intercept (Hashing query)
        query_hash = hashlib.sha256(query.encode('utf-8')).hexdigest()
        if query_hash in _retrieval_cache:
            logger.info("🔍 Retrieval Cache HIT. Bypassing Qdrant/BM25 I/O constraints natively.")
            return _retrieval_cache[query_hash]
            
        logger.info(f"🔍 Query: {query[:100]}...")
        logger.info(f"🔍 Number of retrievers: {len(self.retrievers)}")
        
        # 2. Async Execution of Sparse/Dense Reciprocal Rank Fusion mapping
        documents = await super()._aget_relevant_documents(query, run_manager=run_manager)
        
        logger.info(f"🔍 RRF yielded {len(documents)} documents total")
        if documents:
            logger.info(f"🔍 First doc source: {documents[0].metadata.get('source_file', 'unknown')}")
        
        # 3. Adaptive Top-K Pruning completely bounding CPU Reranker overload
        prune_limit = self._get_adaptive_k(query)
        pruned_docs = documents[:prune_limit]
        
        logger.info(f"🔍 Pruned down to Top-{prune_limit}")
        
        # 4. Cache Persistence mapping
        _retrieval_cache[query_hash] = pruned_docs
        
        return pruned_docs

async def get_hybrid_retriever(documents: List[Document], collection_name: str = "enterprise_knowledge") -> AdaptivePrunedEnsembleRetriever:
    """Configures the Hybrid pipeline executing broad extraction (K=30/30) guaranteeing vast coverage."""
    
    dense_embeddings = get_embeddings_model()
    
    sync_client = QdrantClient(
        host=settings.QDRANT_HOST,
        port=settings.QDRANT_PORT,
        api_key=settings.QDRANT_API_KEY
    )
    qdrant = QdrantVectorStore(
        client=sync_client,
        collection_name=collection_name, 
        embedding=dense_embeddings,
        validate_collection_config=False,
        content_payload_key="text",  # We store content as "text" field
        metadata_payload_key="metadata"  # We store metadata as individual fields
    )
    # Dense extracts 30 mapping semantic mappings dynamically natively
    qdrant_retriever = qdrant.as_retriever(search_kwargs={"k": 30})
    
    # Sparse extraction grabs 30 mapping exact keyword metadata guarantees natively
    # Only add BM25 if documents are provided
    if documents:
        bm25_retriever = BM25Retriever.from_documents(documents)
        bm25_retriever.k = 30
        
        # Initialize the modern pruned ensemble with both retrievers
        ensemble_retriever = AdaptivePrunedEnsembleRetriever(
            retrievers=[bm25_retriever, qdrant_retriever],
            weights=[0.4, 0.6] # Density favored 60%
        )
    else:
        # If no documents, use only Qdrant retriever (works with ingested collection)
        logger.info("No local documents provided. Using Qdrant collection retrieval only.")
        ensemble_retriever = AdaptivePrunedEnsembleRetriever(
            retrievers=[qdrant_retriever],
            weights=[1.0]
        )
    
    return ensemble_retriever
