import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.domain.models.state import PlatformState

@pytest.fixture
def mock_state() -> PlatformState:
    """Provides a fresh, isolated state dictionary modeling a raw graph ingress for individual node testing."""
    return {
        "original_query": "Test analytical query",
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
        "latency": {}
    }

@pytest.fixture
def mock_ollama_chain():
    """Mocks standard LangChain LCEL chains typically returned bridging Ollama executions."""
    chain = AsyncMock()
    # Mocks a default raw output representing stringified logic
    chain.invoke.return_value = "Mocked LLM generation response"
    return chain

@pytest.fixture
def mock_redis_connection():
    """Provides an isolated AsyncMock matching aioredis interfaces."""
    mock_conn = AsyncMock()
    mock_pipeline = AsyncMock()
    mock_conn.pipeline.return_value = mock_pipeline
    return mock_conn
