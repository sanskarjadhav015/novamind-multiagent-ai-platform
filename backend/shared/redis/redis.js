import Redis from "ioredis";

/**
 * ============================================================================
 * SHARED REDIS CLIENT
 * ============================================================================
 * Purpose:
 * - Shared ioredis connection instance used across services.
 * - Powers:
 *   1. Distributed Session Storage (`session-${sessionId}`)
 *   2. Sliding-Window Conversation Memory (`messages-${conversationId}`)
 *   3. Sliding-Window Per-Agent Rate Limiting (`rate:${userId}:${agent}`)
 * ============================================================================
 */
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("connect", () => {
    console.log("Redis connected");
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err);
});

export default redis;