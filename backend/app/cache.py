"""
CivicFlowAI Backend — Redis High-Speed In-Memory Caching & Realtime Pub/Sub
Provides sub-millisecond caching for stats, complaints, and geospatial data,
plus live Redis Pub/Sub event broadcasting for instant multi-client sync.
"""

import json
import logging
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional, AsyncGenerator

import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger("civicflow.cache")

# Global async Redis client
_redis_client: Optional[aioredis.Redis] = None
# In-memory fallback dictionary with timestamp expiration if Redis is offline
_in_memory_cache: Dict[str, Dict[str, Any]] = {}

CHANNEL_LIVE_EVENTS = "civicflow:live_events"

# Local event queues for SSE subscribers when running in memory / broadcast
_local_subscribers: List[asyncio.Queue] = []


async def get_redis() -> Optional[aioredis.Redis]:
    """Retrieve or initialize async Redis client with graceful error handling."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
            retry_on_timeout=True,
        )
        await client.ping()
        _redis_client = client
        logger.info(f"Connected to Redis cache at {settings.REDIS_URL}")
        return _redis_client
    except Exception as exc:
        logger.warning(f"Redis unavailable ({exc}); running with in-memory cache & fallback.")
        _redis_client = None
        return None


async def get_cache(key: str) -> Optional[Any]:
    """Retrieve value from Redis (or in-memory fallback)."""
    client = await get_redis()
    if client:
        try:
            val = await client.get(key)
            if val is not None:
                return json.loads(val)
        except Exception as exc:
            logger.debug(f"Redis get failed for {key}: {exc}")

    # Fallback to in-memory cache
    entry = _in_memory_cache.get(key)
    if entry:
        if datetime.utcnow().timestamp() < entry["exp"]:
            return entry["val"]
        else:
            _in_memory_cache.pop(key, None)
    return None


async def set_cache(key: str, value: Any, ttl: int = 60) -> None:
    """Store value in Redis with TTL seconds (and in-memory fallback)."""
    serialized = json.dumps(value, default=str)

    client = await get_redis()
    if client:
        try:
            await client.set(key, serialized, ex=ttl)
        except Exception as exc:
            logger.debug(f"Redis set failed for {key}: {exc}")

    # In-memory fallback backup
    _in_memory_cache[key] = {
        "val": value,
        "exp": datetime.utcnow().timestamp() + ttl,
    }


async def invalidate_pattern(pattern: str) -> None:
    """Delete all keys matching pattern across Redis and memory."""
    client = await get_redis()
    if client:
        try:
            keys = await client.keys(pattern)
            if keys:
                await client.delete(*keys)
        except Exception as exc:
            logger.debug(f"Redis delete keys failed for pattern {pattern}: {exc}")

    # Memory cleanup
    prefix = pattern.replace("*", "")
    to_delete = [k for k in _in_memory_cache.keys() if k.startswith(prefix)]
    for k in to_delete:
        _in_memory_cache.pop(k, None)


async def invalidate_all_stats() -> None:
    """Invalidate all cached metrics, lists, feeds, and incident clusters."""
    await invalidate_pattern("civicflow:*")


async def publish_event(event_type: str, data: Optional[Dict[str, Any]] = None) -> None:
    """
    Publish a real-time event through Redis Pub/Sub and notify all connected local SSE listeners.
    """
    payload = {
        "type": event_type,
        "data": data or {},
        "timestamp": datetime.utcnow().isoformat(),
    }
    serialized = json.dumps(payload)

    # 1. Publish to Redis Pub/Sub
    client = await get_redis()
    if client:
        try:
            await client.publish(CHANNEL_LIVE_EVENTS, serialized)
        except Exception as exc:
            logger.debug(f"Redis publish failed: {exc}")

    # 2. Push to local SSE subscriber queues
    for q in list(_local_subscribers):
        try:
            q.put_nowait(serialized)
        except Exception:
            pass


async def subscribe_events() -> AsyncGenerator[str, None]:
    """
    Async generator that yields SSE data messages from Redis Pub/Sub or local event queue.
    """
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    _local_subscribers.append(q)

    client = await get_redis()
    pubsub = None
    pubsub_task = None

    if client:
        try:
            pubsub = client.pubsub()
            await pubsub.subscribe(CHANNEL_LIVE_EVENTS)

            async def _reader():
                try:
                    async for message in pubsub.listen():
                        if message and message.get("type") == "message":
                            data = message.get("data")
                            await q.put(data)
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.debug(f"PubSub reader error: {e}")

            pubsub_task = asyncio.create_task(_reader())
        except Exception as e:
            logger.warning(f"Could not initialize Redis pubsub listener: {e}")

    try:
        # Initial keepalive / connection confirmation event
        yield f"event: connected\ndata: {json.dumps({'status': 'connected', 'timestamp': datetime.utcnow().isoformat()})}\n\n"

        while True:
            try:
                # Wait for next event or send keepalive ping every 15s
                msg = await asyncio.wait_for(q.get(), timeout=15.0)
                yield f"event: update\ndata: {msg}\n\n"
            except asyncio.TimeoutError:
                # SSE heartbeat ping to prevent connection drops across proxies/gateways
                yield f": ping {datetime.utcnow().isoformat()}\n\n"
    finally:
        if q in _local_subscribers:
            _local_subscribers.remove(q)
        if pubsub_task:
            pubsub_task.cancel()
        if pubsub:
            try:
                await pubsub.unsubscribe(CHANNEL_LIVE_EVENTS)
                await pubsub.close()
            except Exception:
                pass
