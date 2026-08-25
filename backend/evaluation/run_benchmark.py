#!/usr/bin/env python3
"""
Live RAG evaluation benchmark.

Runs the golden QA set (evaluation/golden_dataset.py) through the ACTUAL
production node functions used by the LangGraph pipeline
(query_rewriter_node -> hybrid retrieval + BGE reranker -> generator_node ->
self_rag_validator_node[-> reflection_node loop]) and measures:

  - Recall@1 / Recall@3 / Recall@5   (retrieval)
  - MRR                              (retrieval)
  - Retrieval latency                (hybrid search + cross-encoder rerank only)
  - End-to-End latency               (rewrite + retrieve + generate + self-rag[+reflect])
  - Faithfulness                     (LLM-judge: EvaluationFramework.calculate_faithfulness)
  - Hallucination score/rate         (native self_rag_validator_node judge)
  - Answer Relevance                 (LLM-judge: EvaluationFramework.calculate_answer_relevancy)

This intentionally scopes to the RAG path (no multi-agent router fan-out) so the
numbers measure retrieval/generation quality directly, matching what the user
asked to verify. Router/multi-agent behavior is a separate concern.

Usage:
    cd backend && source venv/bin/activate
    python -m evaluation.run_benchmark
"""

import asyncio
import json
import statistics
import sys
import time
from pathlib import Path

backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ingestion.ingest import ingest_directory
from app.ingestion.indexer import get_collection_stats
from app.infrastructure.retrieval.vector_db import vector_store
from app.infrastructure.retrieval.hybrid import get_hybrid_retriever
from app.infrastructure.retrieval.compression import get_context_compressor
from app.application.graph.nodes.rewriter import query_rewriter_node
from app.application.graph.nodes.generator import generator_node
from app.application.graph.nodes.self_rag import self_rag_validator_node
from app.application.graph.nodes.reflection import reflection_node
from app.application.graph.routing import check_hallucination

from evaluation.golden_dataset import GOLDEN_QA
from evaluation.metrics import recall_at_k, reciprocal_rank, EvaluationFramework

COLLECTION = "enterprise_knowledge"
DEMO_DOCS_DIR = str(backend_dir.parent / "demo_docs")
RESULTS_DIR = Path(__file__).parent / "results"


async def bootstrap_and_check() -> bool:
    """Runs in its own event loop (via asyncio.run), separate from the benchmark loop's."""
    await vector_store.bootstrap_collections(COLLECTION)
    stats = await get_collection_stats(COLLECTION)
    return not stats or stats["points_count"] == 0


def ensure_corpus_indexed():
    needs_ingest = asyncio.run(bootstrap_and_check())
    if needs_ingest:
        print(f"Collection '{COLLECTION}' is empty. Ingesting {DEMO_DOCS_DIR} ...")
        ingest_directory(DEMO_DOCS_DIR, COLLECTION)
    else:
        print(f"Collection '{COLLECTION}' already has points. Skipping ingestion.")


async def run_one(query: str, expected_source: str, reference_answer: str,
                   compressor, judge: EvaluationFramework) -> dict:
    record = {"query": query, "expected_source": expected_source}

    # --- Retrieval stage (timed) ---
    t0 = time.perf_counter()
    rewrite_out = query_rewriter_node({"original_query": query})
    rewritten_query = rewrite_out.get("rewritten_query") or query
    t_rewrite = time.perf_counter()

    chunks = await compressor.ainvoke(rewritten_query)
    t_retrieve = time.perf_counter()

    retrieval_latency_ms = (t_retrieve - t_rewrite) * 1000
    record["retrieval_latency_ms"] = retrieval_latency_ms
    record["rewrite_latency_ms"] = (t_rewrite - t0) * 1000

    retrieved_sources = [c.metadata.get("source_file", "") for c in chunks]
    record["retrieved_sources"] = retrieved_sources
    for k in (1, 3, 5):
        record[f"recall@{k}"] = recall_at_k(retrieved_sources, expected_source, k)
    record["reciprocal_rank"] = reciprocal_rank(retrieved_sources, expected_source)

    combined_text = "\n\n".join(c.page_content for c in chunks)
    compressed_context = "Documentation Findings:\n" + combined_text

    # --- Generation + self-RAG validation stage ---
    state = {
        "original_query": query,
        "rewritten_query": rewritten_query,
        "compressed_context": compressed_context,
        "reflection_feedback": "",
        "reflection_iteration": 0,
    }

    gen_out = await generator_node(state)
    state["answer"] = gen_out["answer"]

    validator_out = await self_rag_validator_node(state)
    state.update(validator_out)

    reflections = 0
    while check_hallucination(state) == "reflect" and reflections < 2:
        refl_out = await reflection_node(state)
        state.update(refl_out)
        gen_out = await generator_node(state)
        state["answer"] = gen_out["answer"]
        validator_out = await self_rag_validator_node(state)
        state.update(validator_out)
        reflections += 1

    t_end = time.perf_counter()
    record["end_to_end_latency_ms"] = (t_end - t0) * 1000
    record["reflection_iterations"] = reflections
    record["answer"] = state["answer"]
    record["hallucination_score"] = state.get("hallucination_score", 0.0)
    record["confidence_score"] = state.get("confidence_score", 0.0)

    # --- LLM-judge metrics (not timed as part of pipeline latency) ---
    record["faithfulness"] = judge.calculate_faithfulness(compressed_context, state["answer"])
    record["answer_relevance"] = judge.calculate_answer_relevancy(query, state["answer"])

    return record


def summarize(records: list) -> dict:
    def mean(key):
        vals = [r[key] for r in records if key in r]
        return statistics.mean(vals) if vals else 0.0

    def pctl(key, p):
        vals = sorted(r[key] for r in records if key in r)
        if not vals:
            return 0.0
        idx = min(len(vals) - 1, int(len(vals) * p))
        return vals[idx]

    return {
        "n_queries": len(records),
        "recall@1": mean("recall@1"),
        "recall@3": mean("recall@3"),
        "recall@5": mean("recall@5"),
        "mrr": mean("reciprocal_rank"),
        "faithfulness_mean": mean("faithfulness"),
        "answer_relevance_mean": mean("answer_relevance"),
        "hallucination_score_mean": mean("hallucination_score"),
        "hallucination_rate_gt_0.5": sum(1 for r in records if r["hallucination_score"] > 0.5) / len(records),
        "hallucination_rate_gt_0.9_app_threshold": sum(1 for r in records if r["hallucination_score"] > 0.9) / len(records),
        "retrieval_latency_ms_mean": mean("retrieval_latency_ms"),
        "retrieval_latency_ms_p95": pctl("retrieval_latency_ms", 0.95),
        "end_to_end_latency_ms_mean": mean("end_to_end_latency_ms"),
        "end_to_end_latency_ms_p95": pctl("end_to_end_latency_ms", 0.95),
        "reflection_loop_trigger_rate": sum(1 for r in records if r["reflection_iterations"] > 0) / len(records),
    }


async def main():
    retriever = await get_hybrid_retriever([], COLLECTION)
    compressor = get_context_compressor(retriever, final_k_limit=7)  # matches DocumentationAgent
    judge = EvaluationFramework()

    records = []
    for i, qa in enumerate(GOLDEN_QA, start=1):
        print(f"[{i}/{len(GOLDEN_QA)}] {qa['query']}")
        try:
            rec = await run_one(qa["query"], qa["expected_source"], qa["reference_answer"], compressor, judge)
        except Exception as e:
            print(f"  !! FAILED: {e}")
            rec = {"query": qa["query"], "expected_source": qa["expected_source"], "error": str(e)}
        records.append(rec)
        if "error" not in rec:
            print(f"    recall@5={rec['recall@5']} rr={rec['reciprocal_rank']:.2f} "
                  f"hallucination={rec['hallucination_score']:.2f} faithfulness={rec['faithfulness']:.2f} "
                  f"relevance={rec['answer_relevance']:.2f} e2e_ms={rec['end_to_end_latency_ms']:.0f}")

    good_records = [r for r in records if "error" not in r]
    summary = summarize(good_records) if good_records else {}
    summary["n_failed"] = len(records) - len(good_records)

    RESULTS_DIR.mkdir(exist_ok=True)
    out_path = RESULTS_DIR / f"benchmark_{int(time.time())}.json"
    out_path.write_text(json.dumps({"summary": summary, "records": records}, indent=2, default=str))

    print("\n" + "=" * 70)
    print("BENCHMARK SUMMARY")
    print("=" * 70)
    print(json.dumps(summary, indent=2))
    print(f"\nFull results written to {out_path}")


if __name__ == "__main__":
    ensure_corpus_indexed()
    asyncio.run(main())
