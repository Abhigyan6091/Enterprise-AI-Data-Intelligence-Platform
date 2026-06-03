import logging
import asyncio
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams
from app.core.config import settings

logger = logging.getLogger(__name__)

class AsyncQdrantStore:
    """
    Singleton wrapper for the enterprise Qdrant Vector database modernizing 
    interactions natively to asynchronous AsyncQdrantClient preventing locking.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AsyncQdrantStore, cls).__new__(cls)
            logger.info("Connecting to Async Qdrant cluster...")
            cls._instance.client = AsyncQdrantClient(
                url=settings.QDRANT_HOST,
                port=settings.QDRANT_PORT,
                api_key=settings.QDRANT_API_KEY
            )
        return cls._instance

    def get_client(self) -> AsyncQdrantClient:
        return self.client
    
    async def bootstrap_collections(self, collection_name: str = "enterprise_knowledge"):
        client = self.get_client()
        
        collections_response = await client.get_collections()
        exists = any(c.name == collection_name for c in collections_response.collections)
        
        if not exists:
            logger.info(f"Bootstrapping new Async Qdrant Hybrid collection: {collection_name}")
            # Non-blocking network call creating remote index tables 
            await client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
            )
        else:
            logger.info(f"Async Qdrant collection {collection_name} already exists.")

vector_store = AsyncQdrantStore()
