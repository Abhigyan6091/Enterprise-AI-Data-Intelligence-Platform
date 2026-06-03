import pytest
import os
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

# Dependency adjustments ensuring pytest imports correctly out-of-bounds
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__name__), "../../")))

from app.infrastructure.memory.checkpointer import HardenedAsyncRedisSaver
from redis.exceptions import TimeoutError, ConnectionError

@pytest.fixture
def mock_redis_connection():
    mock_conn = AsyncMock()
    # Mocking standard Async pipeline execution structures natively utilized inside AIO layers
    mock_pipeline = AsyncMock()
    mock_conn.pipeline.return_value = mock_pipeline
    mock_conn.keys.return_value = [b"checkpoint:test_uuid:1",b"checkpoint:test_uuid:2"]
    return mock_conn

@pytest.mark.asyncio
async def test_hardened_redis_saver_ttl_enforcement(mock_redis_connection):
    """Verifies that the strict memory bounds automatically apply EXPIRE logic against thread payloads."""
    
    saver = HardenedAsyncRedisSaver(mock_redis_connection, ttl_seconds=3600)
    config = {"configurable": {"thread_id": "test_uuid"}}
    
    # Mocking standard LangGraph internal class execution bypass natively
    with patch("langgraph.checkpoint.redis.aio.AsyncRedisSaver.aput", new_callable=AsyncMock) as base_aput:
        await saver.aput(config, checkpoint={"id": "mock"}, metadata={}, new_versions={})
    
        # Asserts LangGraph logic executed natively
        base_aput.assert_called_once()
        
        # Asserts our precise TTL injection mapping logic evaluated exactly against the wildcard endpoints
        mock_redis_connection.keys.assert_called_with("checkpoint:test_uuid:*")
        pipeline = mock_redis_connection.pipeline()
        pipeline.expire.assert_any_call(b"checkpoint:test_uuid:1", 3600)
        pipeline.execute.assert_called_once()

@pytest.mark.asyncio
async def test_hardened_redis_saver_partition_fault_handling(mock_redis_connection):
    """
    Tests infrastructure fault protections. If Redis clusters fall completely dead, 
    verifies explicit typed connection errors bubble outwards safely preventing silent logic hanging.
    """
    saver = HardenedAsyncRedisSaver(mock_redis_connection)
    config = {"configurable": {"thread_id": "dead_uuid"}}
    
    # Mock network timeout 
    with patch("langgraph.checkpoint.redis.aio.AsyncRedisSaver.aput", side_effect=TimeoutError("Socket Timed Out natively")):
        with pytest.raises(TimeoutError) as exc_info:
            await saver.aput(config, checkpoint={}, metadata={}, new_versions={})
            
        assert "Socket Timed Out" in str(exc_info.value)
