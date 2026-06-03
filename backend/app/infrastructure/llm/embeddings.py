from langchain_huggingface import HuggingFaceEmbeddings
from langchain.embeddings.cache import CacheBackedEmbeddings
from langchain_community.storage import RedisStore
from redis import Redis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_embeddings_model() -> CacheBackedEmbeddings:
    """
    Initializes BAE/bge-large-en-v1.5 and rigorously implements Redis caching.
    Prevents CPU-bound matrix multiplications for frequently queried vectors protecting hardware limits natively.
    """
    logger.info("Initializing Cache-Backed HuggingFace BGE Embeddings...")
    
    # 1. Base Model
    model_name = "BAAI/bge-large-en-v1.5"
    model_kwargs = {'device': 'cpu'} 
    encode_kwargs = {'normalize_embeddings': True}
    
    base_embeddings = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )
    
    # 2. Binding Redis persistence store explicitly for embeddings mapping
    try:
        redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=False)
        document_store = RedisStore(client=redis_client)
        
        # 3. Wrapping cache architecture natively protecting throughput
        cached_embeddings = CacheBackedEmbeddings.from_bytes_store(
            underlying_embeddings=base_embeddings,
            document_embedding_cache=document_store,
            namespace=model_name
        )
        return cached_embeddings
    except Exception as e:
        logger.warning(f"Embedding Cache failed to connect to Redis: {e}. Falling back to default Base Embeddings.")
        return base_embeddings
