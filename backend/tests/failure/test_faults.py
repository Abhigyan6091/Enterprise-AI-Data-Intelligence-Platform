import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from aiohttp.client_exceptions import ClientConnectionError
from app.domain.exceptions import InfrastructureConnectionError, ExternalServiceTimeout, CircuitBreakerOpenException
from app.infrastructure.agents.airflow.agent import AirflowAgent
from app.core.fault_tolerance import ollama_breaker, CircuitBreaker

@pytest.mark.asyncio
async def test_ollama_timeout_circuit_breaker():
    """
    Tests the CircuitBreaker decorator tripping mapping OPEN preventing network congestion 
    following strict simulated timeout exceptions cascaded natively.
    """
    # Create isolated sterile circuit breaker for test instance mapping
    breaker = CircuitBreaker(failure_threshold=2, recovery_timeout_sec=5)
    
    @breaker
    async def mock_ollama_ping():
        raise asyncio.TimeoutError("Simulation Timeout")
    
    # Attempt 1: Count = 1
    with pytest.raises(ExternalServiceTimeout):
        await mock_ollama_ping()
        
    assert breaker.state == "CLOSED"
    
    # Attempt 2: Count = 2 (Threshold limit reached)
    with pytest.raises(ExternalServiceTimeout):
        await mock_ollama_ping()
        
    assert breaker.state == "OPEN"
    
    # Attempt 3: Immediate failure bypassing execution saving system loop latency
    with pytest.raises(CircuitBreakerOpenException):
        await mock_ollama_ping()

@pytest.mark.asyncio
async def test_qdrant_unavailable_fault_propagation():
    """
    Verifies Vector DB failures correctly format and bubble structurally without terminating 
    the overall pipeline thread mappings ungracefully natively.
    """
    from app.infrastructure.retrieval.hybrid import get_hybrid_retriever
    
    with patch("app.infrastructure.retrieval.vector_db.AsyncQdrantStore.bootstrap_collections") as mock_boot:
        mock_boot.side_effect = InfrastructureConnectionError("Qdrant Cluster Unreachable")
        
        with pytest.raises(InfrastructureConnectionError) as exc_info:
            await get_hybrid_retriever([])
            
        assert "Cluster Unreachable" in str(exc_info.value)
