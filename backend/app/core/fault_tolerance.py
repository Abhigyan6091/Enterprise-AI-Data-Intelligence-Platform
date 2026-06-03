import asyncio
import time
import logging
from typing import Callable, Any
from functools import wraps
from app.domain.exceptions import (
    PlatformException,
    InfrastructureConnectionError,
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
    def __init__(self, failure_threshold: int = 5, recovery_timeout_sec: int = 30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout_sec = recovery_timeout_sec
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
                result = await asyncio.wait_for(func(*args, **kwargs), timeout=60.0)
                
                if self.state == "HALF-OPEN":
                    self._record_success()
                return result
                
            except (InfrastructureConnectionError, ExternalServiceTimeout, asyncio.TimeoutError) as e:
                self._record_failure()
                # Promote vague timeout to explicit platform exception
                if isinstance(e, asyncio.TimeoutError):
                    raise ExternalServiceTimeout("Asyncio timeout threshold breached.") from e
                raise e
        return wrapper

# Standardized instances for specific infrastructures
ollama_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout_sec=45)
qdrant_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout_sec=20)
