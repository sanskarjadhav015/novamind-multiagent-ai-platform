import redis from "../../../shared/redis/redis.js";
import { getMessages } from "../utils/getMessages.js";

/**
 * ============================================================================
 * SLIDING-WINDOW CONVERSATION MEMORY LAYER (Redis)
 * ============================================================================
 * Features:
 * - Caches up to 20 recent messages under `messages-${conversationId}`.
 * - Always written with a 24-hour TTL (EX: 86400) to prevent Redis memory leaks.
 * - Falls back to Chat Service MongoDB when cache misses occur.
 * ============================================================================
 */

/**
 * Retrieves conversation memory from Redis cache, falling back to MongoDB.
 * @param {string} conversationId
 */
export const getMemory = async (conversationId) => {
    const key = `messages-${conversationId}`;
    const cached = await redis.get(key);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
    }

    // Cache miss: fetch from Chat Service MongoDB
    const messages = await getMessages(conversationId);
    const validMessages = Array.isArray(messages) ? messages : [];
    
    // Store in Redis with 24h TTL
    await redis.set(key, JSON.stringify(validMessages), "EX", 24 * 60 * 60);

    return validMessages;
};

/**
 * Appends a message to the active Redis conversation sliding window.
 * Enforces a strict 20-message FIFO cap and ensures 24-hour expiration.
 * @param {string} conversationId
 * @param {string} role - "user" | "assistant"
 * @param {string} content - message text
 */
export const addMessage = async (conversationId, role, content) => {
    const key = `messages-${conversationId}`;
    const rawMessages = await redis.get(key);
    let messages = [];
    if (rawMessages) {
        try {
            const parsed = JSON.parse(rawMessages);
            if (Array.isArray(parsed)) messages = parsed;
        } catch (e) {}
    }
    messages.push({ role, content });

    // FIFO eviction: maintain maximum 20 messages in active memory window
    while (messages.length > 20) {
        messages.shift();
    }

    // Persist with 24-hour TTL
    await redis.set(key, JSON.stringify(messages), "EX", 24 * 60 * 60);
};