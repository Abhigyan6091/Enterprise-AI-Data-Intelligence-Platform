# Qdrant Startup Guide

## Prerequisite
Docker must be installed and running.

## Start Qdrant

```bash
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  qdrant/qdrant
```

## Verify

```bash
curl http://localhost:6333/health
# Expected: {"status":"ok","title":"qdrant","version":"..."}
```

## Persistent Storage (optional)

```bash
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```
