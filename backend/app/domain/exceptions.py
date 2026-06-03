class PlatformException(Exception):
    """Base class for all Platform errors, allowing generic catch blocks internally."""
    pass

class ExternalServiceTimeout(PlatformException):
    """Triggered when underlying aiohttp or asyncio timeouts breach limits without response."""
    pass

class InfrastructureConnectionError(PlatformException):
    """Triggered when Databases (Qdrant, Redis, Postgres) explicitly refuse connections (e.g. Socket dropped)."""
    pass

class RateLimitExceeded(PlatformException):
    """Triggered against 429 HTTP statuses explicitly (e.g., GitHub API scanning bounds logic)."""
    pass

class DatabaseLockError(PlatformException):
    """Triggered when concurrent writes hit SQLite / Postgres concurrency locks unexpectedly."""
    pass

class HallucinationThresholdExceeded(PlatformException):
    """Triggered inside NLI constraints; primarily bound inside Evaluation nodes natively."""
    pass
