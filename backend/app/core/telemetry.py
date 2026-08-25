"""
Real, in-process telemetry for /chat requests.

This replaces the previously hardcoded numbers on /api/v1/observability. It is
intentionally simple: an in-memory ring buffer, reset on process restart, with
no persistent store wired up. That's an honest limitation to state rather than
paper over with fabricated numbers.
"""

import time
from collections import deque
from typing import Deque, Dict, List, Optional

_MAX_RECORDS = 500


class TelemetryRecorder:
    def __init__(self, maxlen: int = _MAX_RECORDS):
        self._records: Deque[dict] = deque(maxlen=maxlen)

    def record(
        self,
        *,
        latency_ms: float,
        success: bool,
        hallucination_score: Optional[float] = None,
        confidence_score: Optional[float] = None,
        error: Optional[str] = None,
    ) -> None:
        self._records.append({
            "timestamp": time.time(),
            "latency_ms": latency_ms,
            "success": success,
            "hallucination_score": hallucination_score,
            "confidence_score": confidence_score,
            "error": error,
        })

    def snapshot(self) -> Dict:
        records = list(self._records)
        n = len(records)
        if n == 0:
            return {
                "total_queries": 0,
                "avg_latency_ms": 0.0,
                "p95_latency_ms": 0.0,
                "error_rate": 0.0,
                "avg_hallucination_score": None,
                "avg_confidence_score": None,
                "recent_errors": [],
            }

        latencies = sorted(r["latency_ms"] for r in records)
        errors = [r for r in records if not r["success"]]
        hallu = [r["hallucination_score"] for r in records if r["hallucination_score"] is not None]
        conf = [r["confidence_score"] for r in records if r["confidence_score"] is not None]
        p95_idx = min(n - 1, int(n * 0.95))

        return {
            "total_queries": n,
            "avg_latency_ms": sum(latencies) / n,
            "p95_latency_ms": latencies[p95_idx],
            "error_rate": len(errors) / n,
            "avg_hallucination_score": (sum(hallu) / len(hallu)) if hallu else None,
            "avg_confidence_score": (sum(conf) / len(conf)) if conf else None,
            "recent_errors": [
                {"node": "chat", "error": r["error"], "timestamp": r["timestamp"]}
                for r in errors[-10:]
            ],
        }


telemetry = TelemetryRecorder()
