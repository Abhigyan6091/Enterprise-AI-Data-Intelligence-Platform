import json
import time
import logging
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.fault_tolerance import ollama_breaker, qdrant_breaker
from app.core.telemetry import telemetry
from app.domain.schemas.query import QueryProcessingRequest, QueryProcessingResponse, CitationSchema
from app.application.graph.builder import compile_graph
from app.infrastructure.retrieval.vector_db import vector_store

logger = logging.getLogger(__name__)

graph = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global graph
    logger.info("Compiling LangGraph state machine...")
    graph = await asyncio.to_thread(compile_graph)
    # Qdrant needs this collection to exist before any retrieval/ingestion call
    # will succeed - it was previously never called anywhere outside a test mock.
    await vector_store.bootstrap_collections()
    logger.info(f"{settings.PROJECT_NAME} v{settings.VERSION} ready")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.VERSION}

@app.post(f"{settings.API_V1_STR}/chat", response_model=QueryProcessingResponse)
async def chat(request: QueryProcessingRequest):
    start = time.time()
    try:
        initial_state = {
            "original_query": request.query,
            "rewritten_query": "",
            "decomposed_queries": [],
            "query_type": "factual",
            "selected_agents": [],
            "chat_history": [],
            "agent_scratchpad": [],
            "agent_outputs": [],
            "retrieved_chunks": [],
            "reranked_chunks": [],
            "compressed_context": "",
            "graph_context": {},
            "answer": "",
            "citations": [],
            "confidence_score": 0.0,
            "hallucination_score": 0.0,
            "reflection_iteration": 0,
            "reflection_feedback": "",
            "evaluation_metrics": {},
            "token_usage": {},
            "cost_tracking": 0.0,
            "latency": {},
        }

        result = await graph.ainvoke(initial_state, {"recursion_limit": 50})
        latency = (time.time() - start) * 1000

        citations = [
            CitationSchema(
                text=c.get("text", ""),
                metadata=c.get("metadata", {}),
                relevance_score=c.get("relevance_score", 0.0),
            )
            for c in result.get("citations", [])
        ]

        telemetry.record(
            latency_ms=latency,
            success=True,
            hallucination_score=result.get("hallucination_score"),
            confidence_score=result.get("confidence_score"),
        )

        return QueryProcessingResponse(
            final_answer=result.get("answer", "No answer generated."),
            citations=citations,
            confidence_score=result.get("confidence_score", 0.0),
            latency_ms=round(latency, 2),
            total_cost_usd=result.get("cost_tracking", 0.0),
        )
    except Exception as e:
        logger.error(f"Chat pipeline failed: {e}", exc_info=True)
        telemetry.record(latency_ms=(time.time() - start) * 1000, success=False, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


def _breaker_status(name: str, breaker) -> dict:
    return {
        "name": name,
        "state": breaker.state,
        "failure_threshold": breaker.failure_threshold,
        "recovery_timeout_s": breaker.recovery_timeout_sec,
        "current_failures": breaker.failure_count,
    }


def _latest_benchmark_result() -> dict | None:
    """Reads the most recent offline evaluation/run_benchmark.py output, if any."""
    results_dir = Path(__file__).resolve().parent.parent / "evaluation" / "results"
    if not results_dir.is_dir():
        return None
    files = sorted(results_dir.glob("benchmark_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        return None
    try:
        payload = json.loads(files[0].read_text())
        payload["_source_file"] = files[0].name
        payload["_run_at"] = files[0].stat().st_mtime
        return payload
    except (json.JSONDecodeError, OSError) as e:
        logger.warning(f"Could not read benchmark result {files[0]}: {e}")
        return None


@app.get(f"{settings.API_V1_STR}/observability")
async def get_observability():
    live = telemetry.snapshot()
    return {
        "total_queries": live["total_queries"],
        # Local Ollama/HuggingFace inference has no per-token billing, so real
        # cost is genuinely 0 rather than a fabricated per-query estimate.
        "total_cost_usd": 0.0,
        "avg_latency_ms": live["avg_latency_ms"],
        "p95_latency_ms": live["p95_latency_ms"],
        "error_rate": live["error_rate"],
        "avg_hallucination_score": live["avg_hallucination_score"],
        "avg_confidence_score": live["avg_confidence_score"],
        # Not instrumented yet: doing this honestly requires per-node timing
        # inside the LangGraph nodes, which isn't wired up. Empty is more
        # trustworthy than fabricated numbers.
        "token_usage": [],
        "latency_by_node": [],
        "retry_counts": [],
        "circuit_breakers": [
            _breaker_status("ollama_breaker", ollama_breaker),
            _breaker_status("qdrant_breaker", qdrant_breaker),
        ],
        "recent_errors": live["recent_errors"],
    }

@app.get(f"{settings.API_V1_STR}/evaluation")
async def get_evaluation():
    bench = _latest_benchmark_result()
    if not bench or not bench.get("summary"):
        return {
            "metrics": [],
            "message": (
                "No evaluation run found. Run `python -m evaluation.run_benchmark` "
                "from backend/ to populate this."
            ),
        }

    s = bench["summary"]
    return {
        "metrics": [
            {"name": "Recall@5", "value": s.get("recall@5", 0.0), "target": 0.90, "unit": "%"},
            {"name": "MRR", "value": s.get("mrr", 0.0), "target": 0.85, "unit": "ratio"},
            {"name": "Faithfulness", "value": s.get("faithfulness_mean", 0.0), "target": 0.85, "unit": "%"},
            {"name": "Answer Relevancy", "value": s.get("answer_relevance_mean", 0.0), "target": 0.85, "unit": "%"},
            {"name": "Hallucination Rate", "value": s.get("hallucination_rate_gt_0.5", 0.0), "target": 0.05, "unit": "%"},
            {"name": "Retrieval Latency", "value": s.get("retrieval_latency_ms_mean", 0.0), "target": 2000, "unit": "ms"},
            {"name": "End-to-End Latency", "value": s.get("end_to_end_latency_ms_mean", 0.0), "target": 5000, "unit": "ms"},
        ],
        "source": bench.get("_source_file"),
        "run_at": bench.get("_run_at"),
        "n_queries": s.get("n_queries", 0),
    }

@app.get(f"{settings.API_V1_STR}/sessions")
async def list_sessions():
    return [
        {"id": "default", "title": "Data pipeline analysis", "created_at": int(time.time()) - 3600, "message_count": 5},
        {"id": "session-2", "title": "SQL query debugging", "created_at": int(time.time()) - 7200, "message_count": 3},
        {"id": "session-3", "title": "Lineage exploration: revenue pipeline", "created_at": int(time.time()) - 86400, "message_count": 8},
    ]

@app.post(f"{settings.API_V1_STR}/sessions")
async def create_session():
    import uuid
    return {"id": f"session-{uuid.uuid4().hex[:8]}", "title": "New conversation", "created_at": int(time.time()), "message_count": 0}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
