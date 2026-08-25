import asyncio
import time
import logging
from typing import Callable, Any
from functools import wraps
from app.domain.exceptions import (
    PlatformException,
    ExternalServiceTimeout
)

logger = logging.getLogger(__name__)

class CircuitBreakerOpenException(PlatformException):
    """Explicit indicator that an external subsystem is dead, failing requests instantly."""
    pass

class CircuitBreaker:
    """
    Asynchronous Circuit Breaker protecting the platform from cascading latency blocks.
    Limits traffic to unresponsive subsystems (e.g. Ollama falling offline).
    Transitions: CLOSED -> (Failures > threshold) -> OPEN -> (Timeout expires) -> HALF_OPEN.
    """
    def __init__(self, failure_threshold: int = 5, recovery_timeout_sec: int = 30, call_timeout_sec: float = 60.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout_sec = recovery_timeout_sec
        self.call_timeout_sec = call_timeout_sec
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.state = "CLOSED"

    def _record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.error(f"CIRCUIT BREAKER TRIPPED OPEN. Rejecting traffic for {self.recovery_timeout_sec}s.")

    def _record_success(self):
        self.failure_count = 0
        self.state = "CLOSED"
        logger.info("Circuit Breaker RESET. System operating normally.")
        
    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if self.state == "OPEN":
                # Assess Half-Open Recovery Phase
                if time.time() - self.last_failure_time > self.recovery_timeout_sec:
                    self.state = "HALF-OPEN"
                    logger.warning("Circuit Breaker HALF-OPEN. Probing infrastructure viability...")
                else:
                    raise CircuitBreakerOpenException("Circuit Breaker is OPEN. Fast failing request to preserve Event Loop.")
                    
            try:
                # Execution with strict asyncio timeout enforcement globally guarding IO lockups
                result = await asyncio.wait_for(func(*args, **kwargs), timeout=self.call_timeout_sec)

                if self.state == "HALF-OPEN":
                    self._record_success()
                return result

            except asyncio.TimeoutError as e:
                self._record_failure()
                raise ExternalServiceTimeout("Asyncio timeout threshold breached.") from e
            except Exception as e:
                # Catches real client-library failures (connection refused, HTTP errors, etc.)
                # in addition to the platform's own exception types - the underlying Qdrant/
                # Ollama clients raise their own library-specific exceptions, not
                # InfrastructureConnectionError/ExternalServiceTimeout, so narrowing this to
                # only those two types meant the breaker never actually tripped on a real outage.
                self._record_failure()
                raise e
        return wrapper

# Standardized instances for specific infrastructures.
# ollama_breaker's call_timeout is higher than the old fixed 60s: the judge role
# (self_rag_validator_node, EvaluationFramework) now runs a larger model
# (settings.JUDGE_MODEL) for reliability, which is measurably slower on CPU-only
# inference - a single judge call was observed to occasionally exceed 60s.
ollama_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout_sec=45, call_timeout_sec=150.0)
qdrant_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout_sec=20, call_timeout_sec=60.0)
