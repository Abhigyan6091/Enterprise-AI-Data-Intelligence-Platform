"""Qdrant indexer for storing embeddings and metadata."""

import asyncio
import sys
from datetime import datetime
from typing import Optional
from uuid import uuid4

from qdrant_client.models import Distance, PointStruct, VectorParams

from app.infrastructure.llm.embeddings import get_embeddings_model
from app.infrastructure.retrieval.vector_db import vector_store
from app.ingestion.chunker import Chunk


async def index_chunks(
    chunks: list[Chunk],
    collection_name: str = "enterprise_knowledge",
    show_progress: bool = True,
) -> dict:
    """
    Index chunks into Qdrant with embeddings and metadata.
    
    Args:
        chunks: List of Chunk objects to index
        collection_name: Target Qdrant collection
        show_progress: Show progress messages
    
    Returns:
        Dictionary with indexing results
    """
    if not chunks:
        return {"indexed": 0, "failed": 0, "errors": []}
    
    # Get embeddings model
    embeddings = get_embeddings_model()
    
    indexed_count = 0
    failed_count = 0
    errors = []
    
    # Generate embeddings for all chunks
    if show_progress:
        print(f"Generating embeddings for {len(chunks)} chunks...")
    
    try:
        # Prepare points for Qdrant
        points = []
        
        for i, chunk in enumerate(chunks):
            try:
                # Generate embedding
                embedding = embeddings.embed_query(chunk.text) if hasattr(embeddings, 'embed_query') else embeddings.embed(chunk.text)
                
                # Create point with metadata
                point = PointStruct(
                    id=int(uuid4().int % (2**63)),  # Use random 63-bit ID
                    vector=embedding,
                    payload={
                        "text": chunk.text,
                        "source_file": chunk.source_file,
                        "file_type": chunk.file_type,
                        "chunk_id": chunk.chunk_id,
                        "ingestion_timestamp": datetime.utcnow().isoformat(),
                        "chunk_size": len(chunk.text),
                    },
                )
                points.append(point)
                indexed_count += 1
                
                if show_progress and (i + 1) % 10 == 0:
                    print(f"  Processed {i + 1}/{len(chunks)} chunks...")
            
            except Exception as e:
                failed_count += 1
                error_msg = f"Failed to process chunk {i}: {str(e)}"
                errors.append(error_msg)
                if show_progress:
                    print(f"  ⚠ {error_msg}")
        
        # Upsert to Qdrant
        if points:
            if show_progress:
                print(f"\nUpserting {len(points)} points to Qdrant...")
            
            await vector_store.get_client().upsert(
                collection_name=collection_name,
                points=points,
            )
            
            if show_progress:
                print(f"✓ Successfully indexed {indexed_count} chunks")
    
    except Exception as e:
        error_msg = f"Qdrant upsert failed: {str(e)}"
        errors.append(error_msg)
        if show_progress:
            print(f"✗ {error_msg}")
    
    return {
        "indexed": indexed_count,
        "failed": failed_count,
        "errors": errors,
    }


def index_chunks_sync(
    chunks: list[Chunk],
    collection_name: str = "enterprise_knowledge",
    show_progress: bool = True,
) -> dict:
    """
    Synchronous wrapper for indexing chunks.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(
            index_chunks(chunks, collection_name, show_progress)
        )
    finally:
        loop.close()


async def get_collection_stats(
    collection_name: str = "enterprise_knowledge",
) -> Optional[dict]:
    """Get statistics about a collection."""
    try:
        collection_info = await vector_store.get_client().get_collection(collection_name)
        return {
            "points_count": collection_info.points_count,
            "indexed_vectors_count": collection_info.indexed_vectors_count,
            "status": collection_info.status,
        }
    except Exception as e:
        print(f"Error getting collection stats: {e}")
        return None


def get_collection_stats_sync(
    collection_name: str = "enterprise_knowledge",
) -> Optional[dict]:
    """Synchronous wrapper for getting collection stats."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(get_collection_stats(collection_name))
    finally:
        loop.close()
