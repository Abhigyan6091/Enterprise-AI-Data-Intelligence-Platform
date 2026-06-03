from langchain.retrievers.contextual_compression import ContextualCompressionRetriever
from typing import Any
from .reranker import get_bge_reranker

def get_context_compressor(base_retriever: Any, final_k_limit: int = 5) -> ContextualCompressionRetriever:
    """
    The terminal stage of the Retrieval pipeline structurally isolating context block tokens.
    It wraps the Adaptive Pruned Ensemble RRF pipeline explicitly securely.
    Because `base_retriever` statically maps Adaptive constraints <= 25 chunks max, the
    wrapped Reranker safely executes without triggering thread lockups!
    """
    # CrossEncoder assesses the filtered 15-25 chunks outputting exactly the Final K Limit (5).
    reranker = get_bge_reranker(top_n=final_k_limit)
    
    compressor = ContextualCompressionRetriever(
        base_compressor=reranker,
        base_retriever=base_retriever
    )
    return compressor
