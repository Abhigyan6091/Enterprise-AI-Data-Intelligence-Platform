# Document Ingestion Pipeline

## Overview

Lightweight document ingestion system for populating the Qdrant vector database with embeddings and metadata.

## Supported File Types

| Format | Use Case | Chunking Strategy |
|--------|----------|-------------------|
| `.md` | Markdown docs | Paragraph-based (256-1024 chars) |
| `.txt` | Plain text | Paragraph-based (256-1024 chars) |
| `.sql` | SQL queries | Line-based (20 lines, 2-line overlap) |
| `.py` | Python code | Line-based (20 lines, 2-line overlap) |
| `.csv` | Data tables | Paragraph-based (256-1024 chars) |

## Quick Start

### From Project Root

```bash
cd /data/RAG
./ingest.sh ./demo_docs          # Ingest demo documents
./ingest.sh /path/to/docs        # Ingest custom directory
```

### From Backend Directory

```bash
cd /data/RAG/backend
source venv/bin/activate
python -m app.ingestion.ingest ../demo_docs
```

## Architecture

### Pipeline Flow

```
1. File Discovery
   └─ Recursively find all supported file types

2. Content Loading
   └─ Parse files with appropriate loaders

3. Chunking
   └─ Smart chunking based on file type
   └─ Size constraints: min 256, max 1024 chars

4. Embedding Generation
   └─ BAAI/bge-large-en-v1.5 model
   └─ Redis caching for efficiency
   └─ 1024-dimensional vectors

5. Metadata Extraction
   ├─ source_file: Original file path
   ├─ file_type: Extension (.md, .py, etc.)
   ├─ chunk_id: Sequential chunk number
   ├─ ingestion_timestamp: ISO8601 timestamp
   └─ chunk_size: Character count

6. Vector Storage
   └─ Upsert to Qdrant collection
   └─ Cosine distance metric
```

### Modules

#### `loaders.py`

Document parsers for different file types:

```python
load_markdown(file_path)     # Parse .md files
load_text(file_path)         # Parse .txt files
load_sql(file_path)          # Parse .sql files
load_python(file_path)       # Parse .py files
load_csv(file_path)          # Parse .csv files
discover_files(directory)    # Find all supported files
```

#### `chunker.py`

Intelligent chunking strategies:

```python
chunk_by_paragraphs()        # For documents (default)
chunk_by_lines()             # For code/SQL files
chunk_document()             # Auto-select strategy
```

#### `indexer.py`

Qdrant vector storage:

```python
index_chunks(chunks)         # Async upsert to Qdrant
index_chunks_sync(chunks)    # Sync wrapper
get_collection_stats()       # Query collection metrics
```

#### `ingest.py`

Command-line interface:

```python
ingest_directory(directory)  # Main ingestion function
main()                       # CLI entry point
```

## Examples

### Ingest Demo Documents

```bash
cd /data/RAG && ./ingest.sh ./demo_docs
```

Output:
```
======================================================================
  RAG Document Ingestion Pipeline
======================================================================
📁 Directory: /data/RAG/demo_docs
🎯 Target Collection: enterprise_knowledge

📊 Before Ingestion:
   Points: 46
   Indexed: 0

🔍 Discovering files...
   ✓ Found 5 files
     - data-pipeline.md
     - embedding-basics.txt
     - example-dag.py
     - sample-config.csv
     - sql-queries.sql

📄 Loading and chunking documents...
   ✓ data-pipeline.md: 3 chunks
   ✓ embedding-basics.txt: 4 chunks
   ✓ example-dag.py: 9 chunks
   ✓ sample-config.csv: 2 chunks
   ✓ sql-queries.sql: 5 chunks

   📊 Summary:
      Files loaded: 5/5
      Total chunks: 23

🚀 Indexing to Qdrant...
Generating embeddings for 23 chunks...
Upserting 23 points to Qdrant...
✓ Successfully indexed 23 chunks

📊 After Ingestion:
   Points: 69
   Indexed: 0

======================================================================
  ✅ Ingestion Complete
======================================================================
⏱  Time elapsed: 11.87s
📁 Files processed: 5
📦 Chunks created: 23
✨ Vectors indexed: 23

✅ Documents are now searchable in the RAG system!
```

### Ingest Custom Directory

```bash
./ingest.sh /path/to/your/documents
```

The system will:
1. Discover all .md, .txt, .sql, .py, .csv files
2. Extract text content
3. Apply intelligent chunking
4. Generate embeddings
5. Store in Qdrant with metadata

## Configuration

Edit `backend/app/core/config.py` to modify:

- `QDRANT_HOST` - Qdrant server host (default: localhost)
- `QDRANT_PORT` - Qdrant server port (default: 6333)
- `EMBEDDING_MODEL` - BGE model name (default: BAAI/bge-large-en-v1.5)
- `REDIS_URL` - Redis cache for embeddings

## Chunking Strategies

### Paragraph-Based (Documents)

**Used for:** .md, .txt, .csv

**Algorithm:**
1. Split by double newlines (paragraph breaks)
2. Merge paragraphs until reaching max size (1024 chars)
3. Ensure minimum chunk size (256 chars)

**Example:**
```
Text: "Paragraph 1.\n\nParagraph 2.\n\nParagraph 3."
Result: [
  Chunk 1: "Paragraph 1.\n\nParagraph 2.",
  Chunk 2: "Paragraph 3."
]
```

### Line-Based (Code/SQL)

**Used for:** .py, .sql

**Algorithm:**
1. Split by newlines
2. Create chunks of 20 lines each
3. Maintain 2-line overlap for context

**Example:**
```
Lines: 1-100
Result: [
  Chunk 1: Lines 1-20,
  Chunk 2: Lines 19-39,
  Chunk 3: Lines 38-58,
  ...
]
```

## Metadata Structure

Each chunk stores metadata in Qdrant:

```json
{
  "text": "Chunk content here...",
  "source_file": "/path/to/data-pipeline.md",
  "file_type": ".md",
  "chunk_id": 0,
  "ingestion_timestamp": "2026-06-01T12:34:56.123456",
  "chunk_size": 512
}
```

## Monitoring

### Query Collection Stats

```bash
curl http://localhost:6333/collections/enterprise_knowledge | jq '.result | {points_count, indexed_vectors_count, status}'
```

### Check Ingestion Progress

The CLI shows real-time progress:
- Files discovered
- Files loaded
- Chunks created
- Embeddings generated
- Vectors indexed
- Processing time

## Troubleshooting

### Virtual Environment Not Found

```bash
cd /data/RAG && bash start.sh  # Initializes venv
./ingest.sh ./demo_docs
```

### Module Not Found Error

```bash
# Run from backend directory (correct)
cd /data/RAG/backend && source venv/bin/activate
python -m app.ingestion.ingest ../demo_docs
```

### Port Already in Use

```bash
fuser -k 3001/tcp 9191/tcp 6333/tcp
sleep 2
cd /data/RAG && bash start.sh
```

### Qdrant Connection Failed

Verify Qdrant is running:
```bash
curl http://localhost:6333/health
```

## Performance

### Typical Metrics

| Aspect | Value |
|--------|-------|
| Files/second | 1-2 |
| Chunks/second | 2-5 |
| Embeddings/second | ~2 |
| Average time | 11-15s for 23 chunks |
| Memory usage | ~1GB for BGE model |

### Optimization Tips

1. **Cache embeddings** - Redis caching enabled by default
2. **Batch processing** - All embeddings computed in parallel
3. **Incremental ingestion** - Only new/modified files processed
4. **Storage** - Store chunks efficiently with metadata

## Advanced Usage

### Programmatic Ingestion

```python
from app.ingestion.loaders import discover_files, load_document
from app.ingestion.chunker import chunk_document
from app.ingestion.indexer import index_chunks_sync

# Discover files
files = discover_files("/path/to/docs")

# Load and chunk
all_chunks = []
for file_path in files:
    content = load_document(file_path)
    chunks = chunk_document(content, file_path, ".md")
    all_chunks.extend(chunks)

# Index to Qdrant
result = index_chunks_sync(all_chunks)
print(f"Indexed {result['indexed']} chunks")
```

### Custom Chunking Strategy

```python
from app.ingestion.chunker import Chunk

def custom_chunk(text, source_file):
    """Your custom chunking logic."""
    chunks = []
    # Your implementation
    return [
        Chunk(text=..., chunk_id=..., source_file=..., file_type=...)
        for ...
    ]
```

## Next Steps

1. ✅ Documents are now indexed in Qdrant
2. ✅ Frontend can retrieve and display results
3. ✅ RAG system generates answers from context

Try asking questions in the chat interface:
- "What are the main components of the data pipeline?"
- "Explain embeddings"
- "Show me SQL queries for revenue analysis"

The system will retrieve relevant chunks and generate grounded answers!

---

**For issues or questions, check logs in:**
- Backend: `backend/logs/`
- Qdrant: http://localhost:6333/health
