from app.domain.models.state import PlatformState

def citation_generator_node(state: PlatformState) -> dict:
    """
    Extracts deterministic metadata mapping generated answer claims directly back 
    to specific retrieved chunks from the Reranker phase to surface on the Frontend.
    """
    chunks = state.get("reranked_chunks", [])
    
    # In a prod environment, you would use an LLM chaining block to exact-match substrings.
    # For now, it passes the source telemetry mapping natively via graph flow.
    citations = []
    
    for doc in chunks:
        # Faux fuzzy matching logic to determine if the chunk was implicitly utilized 
        if doc.page_content[:20] in state.get("answer", ""):
            citations.append({
                "text": doc.page_content[:150] + "...",
                "metadata": doc.metadata,
                "relevance_score": doc.metadata.get("relevance_score", 1.0)
            })
            
    return {"citations": citations}
