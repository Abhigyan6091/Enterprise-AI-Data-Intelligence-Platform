from langchain.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
import logging

logger = logging.getLogger(__name__)

def get_bge_reranker(top_n: int = 5) -> CrossEncoderReranker:
    """
    Initializes the BAAI/bge-reranker-large model.
    Note: CrossEncoders are vastly CPU/GPU bound. For extreme multi-threading loads, this specific 
    node wrapper should run entirely within `asyncio.to_thread()` mappings inside agent closures.
    """
    logger.info(f"Initializing BGE CrossEncoder Reranker with top_n {top_n}")
    
    model = HuggingFaceCrossEncoder(model_name="BAAI/bge-reranker-large")
    reranker = CrossEncoderReranker(model=model, top_n=top_n)
    
    return reranker
