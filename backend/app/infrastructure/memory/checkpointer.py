import logging
import time
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from langgraph.checkpoint.redis.aio import AsyncRedisSaver
except ImportError:
    # Explicitly breaking API if missing standard libraries enforcing production conformity
    raise ImportError("pip install langgraph-checkpoint-redis is strictly required for Memory.")

import redis.asyncio as aioredis
from redis.exceptions import ConnectionError, TimeoutError

class HardenedAsyncRedisSaver(AsyncRedisSaver):
    """
    Subclasses the raw LangGraph Redis checkpointer injecting precise Enterprise bounds:
    - strict TTL policies preventing unbounded RAM leakage.
    - Explicit try/except parsing mapping unhandled Redis partitions cleanly.
    - Custom telemetry wrapping execution spans.
    """
    
    def __init__(self, conn: aioredis.Redis, ttl_seconds: int = 604800):
        # Default TTL 7 days (60 * 60 * 24 * 7) mapping transient conversation persistence gracefully
        super().__init__(conn)
        self.ttl_seconds = ttl_seconds

    async def aput(self, config: Dict[str, Any], *args, **kwargs) -> None:
        start_time = time.time()
        try:
            # 1. Native LangGraph State Generation
            await super().aput(config, *args, **kwargs)
            
            # 2. Strict Memory Cleanup Policy (TTL enforcement)
            thread_id = config["configurable"]["thread_id"]
            
            # Assuming standard LangGraph structural checkpoint mapping keys internally 
            # We enforce standard expiration ensuring the namespace eventually purges autonomously
            # We wildcard the checkpoint IDs to expire the entire conversation history thread cleanly
            keys = await self.conn.keys(f"checkpoint:{thread_id}:*")
            if keys:
                pipeline = self.conn.pipeline()
                for key in keys:
                    pipeline.expire(key, self.ttl_seconds)
                await pipeline.execute()

            # 3. Telemetry 
            latency_ms = (time.time() - start_time) * 1000
            logger.info(f"Memory Saved | Thread Payload: {thread_id} | Latency: {latency_ms:.2f}ms")
            
        except (ConnectionError, TimeoutError) as e:
            # LangGraph can optionally proceed inherently without state bounds depending on node graph
            # but logging strictly guarantees SRE tracing capabilities.
            logger.error(f"Redis Partition explicitly halted state preservation natively: {e}")
            raise
        except Exception as e:
            # Corrupted State / Serialization crash bindings
            logger.critical(f"Graph Serialization Hard-Crash bounded inside Checkpointer natively: {e}")
            raise

def get_redis_checkpointer() -> HardenedAsyncRedisSaver:
    logger.info("Initializing Hardened Non-Blocking Redis Infrastructure.")
    
    # 🚀 Adding specific connection timeout parameters and health checks natively resolving
    # hanging socket execution starvation faults identified in the Async Audit.
    connection = aioredis.Redis.from_url(
        settings.REDIS_URL, 
        decode_responses=False,
        health_check_interval=30,
        socket_timeout=5,
        socket_connect_timeout=5,
        retry_on_timeout=True
    )
    
    return HardenedAsyncRedisSaver(connection)
