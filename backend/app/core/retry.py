import logging
from tenacity import (
    retry,
    wait_exponential,
    stop_after_attempt,
    retry_if_exception_type,
    before_sleep_log,
)
from app.domain.exceptions import (
    InfrastructureConnectionError,
    ExternalServiceTimeout,
    RateLimitExceeded,
    DatabaseLockError
)

logger = logging.getLogger(__name__)

def with_exponential_backoff(max_attempts: int = 4):
    """
    Decorator implementing robust Exponential Backoff (2s, 4s, 8s -> Fail).
    Strictly filters against recoverable typed exceptions to prevent retrying 400 Bad Requests silently.
    
    Usage:
        @with_exponential_backoff(max_attempts=3)
        async def fetch_airflow_dags(): ...
    """
    return retry(
        wait=wait_exponential(multiplier=2, min=2, max=10),
        stop=stop_after_attempt(max_attempts),
        retry=retry_if_exception_type((
            InfrastructureConnectionError, 
            ExternalServiceTimeout, 
            RateLimitExceeded,
            DatabaseLockError
        )),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True  # Ensure exceptions burst outward terminating graphs gracefully if ultimate failure occurs
    )

def with_constant_retry(max_attempts: int = 3, wait_sec: int = 2):
    """A lighter retry mechanism for predictable, swift infrastructure failures (e.g. Redis timeouts)."""
    from tenacity import wait_fixed
    return retry(
        wait=wait_fixed(wait_sec),
        stop=stop_after_attempt(max_attempts),
        retry=retry_if_exception_type((InfrastructureConnectionError, ExternalServiceTimeout)),
        reraise=True
    )
