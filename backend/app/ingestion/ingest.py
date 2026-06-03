#!/usr/bin/env python3
"""
Lightweight document ingestion pipeline for Qdrant.

Usage:
    python -m app.ingestion.ingest <directory>
    python -m app.ingestion.ingest ../demo_docs
    python -m app.ingestion.ingest /path/to/documents
"""

import sys
import time
from pathlib import Path
from typing import Optional

# Add backend to path if needed
backend_dir = Path(__file__).parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ingestion.chunker import chunk_document
from app.ingestion.indexer import get_collection_stats_sync, index_chunks_sync
from app.ingestion.loaders import discover_files, load_document


def ingest_directory(
    directory: str,
    collection_name: str = "enterprise_knowledge",
    show_stats: bool = True,
) -> dict:
    """
    Ingest all supported files from a directory into Qdrant.
    
    Args:
        directory: Directory path to scan for files
        collection_name: Target Qdrant collection
        show_stats: Display statistics before/after
    
    Returns:
        Ingestion summary dictionary
    """
    dir_path = Path(directory)
    if not dir_path.exists():
        raise FileNotFoundError(f"Directory not found: {directory}")
    
    print("\n" + "=" * 70)
    print("  RAG Document Ingestion Pipeline")
    print("=" * 70)
    print(f"📁 Directory: {dir_path.resolve()}")
    print(f"🎯 Target Collection: {collection_name}")
    
    # Show before stats
    if show_stats:
        before_stats = get_collection_stats_sync(collection_name)
        if before_stats:
            print(f"\n📊 Before Ingestion:")
            print(f"   Points: {before_stats['points_count']}")
            print(f"   Indexed: {before_stats['indexed_vectors_count']}")
    
    # Discover files
    print(f"\n🔍 Discovering files...")
    files = discover_files(directory)
    
    if not files:
        print("   ⚠ No supported files found (.md, .txt, .sql, .py, .csv)")
        return {
            "files_processed": 0,
            "chunks_created": 0,
            "vectors_indexed": 0,
            "errors": [],
        }
    
    print(f"   ✓ Found {len(files)} files")
    for f in files[:10]:
        print(f"     - {Path(f).name}")
    if len(files) > 10:
        print(f"     ... and {len(files) - 10} more")
    
    # Load and chunk documents
    print(f"\n📄 Loading and chunking documents...")
    all_chunks = []
    loaded_count = 0
    failed_files = []
    
    for file_path in files:
        try:
            content = load_document(file_path)
            if content:
                file_type = Path(file_path).suffix.lower()
                chunks = chunk_document(content, file_path, file_type)
                all_chunks.extend(chunks)
                loaded_count += 1
                
                chunk_count = len(chunks)
                print(f"   ✓ {Path(file_path).name}: {chunk_count} chunks")
            else:
                failed_files.append(file_path)
        except Exception as e:
            failed_files.append(f"{file_path} ({str(e)})")
            print(f"   ✗ {Path(file_path).name}: {str(e)}")
    
    print(f"\n   📊 Summary:")
    print(f"      Files loaded: {loaded_count}/{len(files)}")
    print(f"      Total chunks: {len(all_chunks)}")
    if failed_files:
        print(f"      Failed files: {len(failed_files)}")
    
    if not all_chunks:
        print("\n   ⚠ No chunks created. Nothing to index.")
        return {
            "files_processed": loaded_count,
            "chunks_created": 0,
            "vectors_indexed": 0,
            "errors": failed_files,
        }
    
    # Index to Qdrant
    print(f"\n🚀 Indexing to Qdrant...")
    start_time = time.time()
    
    result = index_chunks_sync(all_chunks, collection_name, show_progress=True)
    
    elapsed = time.time() - start_time
    
    # Show after stats
    if show_stats:
        after_stats = get_collection_stats_sync(collection_name)
        if after_stats:
            print(f"\n📊 After Ingestion:")
            print(f"   Points: {after_stats['points_count']}")
            print(f"   Indexed: {after_stats['indexed_vectors_count']}")
    
    # Final summary
    print("\n" + "=" * 70)
    print("  ✅ Ingestion Complete")
    print("=" * 70)
    print(f"⏱  Time elapsed: {elapsed:.2f}s")
    print(f"📁 Files processed: {loaded_count}")
    print(f"📦 Chunks created: {len(all_chunks)}")
    print(f"✨ Vectors indexed: {result['indexed']}")
    if result["failed"] > 0:
        print(f"⚠  Failed: {result['failed']}")
    
    if result["errors"]:
        print(f"\n❌ Errors:")
        for error in result["errors"][:5]:
            print(f"   - {error}")
        if len(result["errors"]) > 5:
            print(f"   ... and {len(result['errors']) - 5} more")
    
    print("\n✅ Documents are now searchable in the RAG system!")
    print("=" * 70 + "\n")
    
    return {
        "files_processed": loaded_count,
        "chunks_created": len(all_chunks),
        "vectors_indexed": result["indexed"],
        "errors": result["errors"],
    }


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: python ingest.py <directory>")
        print("Example: python ingest.py ./docs")
        print("Example: python ingest.py /path/to/documents")
        sys.exit(1)
    
    directory = sys.argv[1]
    
    try:
        result = ingest_directory(directory)
        
        # Exit with error code if there were failures
        if result["errors"] and result["vectors_indexed"] == 0:
            sys.exit(1)
    
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
