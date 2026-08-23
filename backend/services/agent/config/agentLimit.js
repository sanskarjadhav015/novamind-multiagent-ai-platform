import redis from "../../../shared/redis/redis.js";

/**
 * ============================================================================
 * SLIDING-WINDOW PER-AGENT RATE LIMITING (`agentLimit.js`)
 * ============================================================================
 * Purpose:
 * - Prevents API abuse and runaway LLM costs by limiting requests per agent per user.
 * - Key format: `rate:${userId}:${agent}`
 * - Time window: 60 seconds
 * - Throws HTTP 429 error with exact retryAfter time when limit is exceeded.
 * ============================================================================
 */

// Per-minute request limits per agent type
const Limits = {
    chat: 20,
    coding: 5,
    pdf: 5,
    pdfRag: 5,
    ppt: 5,
    image: 5,
    vision: 5,
    imageAnalyzer: 5,
    search: 10
};

/**
 * Checks and increments rate limit for a specific user and agent.
 * @param {string} userId - Authenticated user identifier
 * @param {string} agent - Agent identifier (e.g. "coding", "chat")
 */
export const checkAgentLimit = async (userId, agent = "chat") => {
    if (!userId) {
        return { remaining: 999, limit: 999 };
    }

    const max = Limits[agent] || Limits["chat"] || 20;
    const key = `rate:${userId}:${agent}`;
    
    // Atomic increment
    const count = await redis.incr(key);

    // Set 60-second expiration window on first request
    if (count === 1) {
        await redis.expire(key, 60);
    }

    const ttl = await redis.ttl(key);

    // Exceeded limit check
    if (count > max) {
        const minutes = Math.floor(ttl / 60);
        const seconds = ttl % 60;
        const time = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        const error = new Error(`You have reached the ${agent} limit (${max} requests/minute). Please try again in ${time}.`);
        error.status = 429;
        error.data = {
            success: false,
            agent,
            limit: max,
            remainingTime: ttl,
            retryAfter: time,
            message: `You have reached the ${agent} limit (${max} requests/minute). Try again in ${time}.`
        };
        throw error;
    }

    return {
        remaining: Math.max(0, max - count),
        limit: max
    };
};