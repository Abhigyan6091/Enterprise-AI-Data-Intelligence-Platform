#!/bin/bash
# RAG Document Ingestion Wrapper
# Makes ingestion easy from any directory

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

if [ $# -lt 1 ]; then
    echo "Usage: ./ingest.sh <directory>"
    echo "Example: ./ingest.sh ./demo_docs"
    echo "Example: ./ingest.sh /path/to/documents"
    exit 1
fi

DOCS_DIR="$1"

echo "🚀 RAG Document Ingestion"
echo "📁 Documents: $DOCS_DIR"
echo "🎯 Backend: $BACKEND_DIR"
echo ""

cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run start.sh first."
    exit 1
fi

source venv/bin/activate

python -m app.ingestion.ingest "$DOCS_DIR"
