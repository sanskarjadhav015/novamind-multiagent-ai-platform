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

// Per-minute request limits per agent type (Heavy compute/document agents capped at 1 req/min)
const Limits = {
    chat: Number(process.env.LIMIT_CHAT) || 20,
    coding: Number(process.env.LIMIT_CODING) || 1,
    pdf: Number(process.env.LIMIT_PDF) || 1,
    pdfRag: Number(process.env.LIMIT_PDF_RAG) || 1,
    rag: Number(process.env.LIMIT_RAG) || 1,
    ppt: Number(process.env.LIMIT_PPT) || 1,
    image: Number(process.env.LIMIT_IMAGE) || 5,
    vision: Number(process.env.LIMIT_VISION) || 5,
    imageAnalyzer: Number(process.env.LIMIT_IMAGE_ANALYZER) || 5,
    search: Number(process.env.LIMIT_SEARCH) || 10
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

    const max = Limits[agent] ?? Limits["chat"] ?? 20;
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
        const reqText = max === 1 ? "1 request/minute" : `${max} requests/minute`;
        const error = new Error(`You have reached the ${agent} limit (${reqText}). Please try again in ${time}.`);
        error.status = 429;
        error.data = {
            success: false,
            agent,
            limit: max,
            remainingTime: ttl,
            retryAfter: time,
            message: `You have reached the ${agent} limit (${reqText}). Try again in ${time}.`
        };
        throw error;
    }

    return {
        remaining: Math.max(0, max - count),
        limit: max
    };
};