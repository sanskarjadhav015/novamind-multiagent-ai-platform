import redis from "../../shared/redis/redis.js";

/**
 * ============================================================================
 * GATEWAY AUTHENTICATION MIDDLEWARE (`protect`)
 * ============================================================================
 * Purpose:
 * - Intercepts incoming requests on protected routes (/api/chat, /api/agent, etc.).
 * - Reads the "session" cookie containing a cryptographically random UUID.
 * - Performs a sub-millisecond session lookup against Redis (`session-${sessionId}`).
 * - Attaches parsed user metadata to `req.user` for downstream consumers.
 * ============================================================================
 */
const protect = async (req, res, next) => {
    try {
        // 1. Extract session UUID from incoming HTTP-only cookies
        const sessionId = req.cookies?.session;
        if (!sessionId) {
            return res.status(400).json({ message: "Unauthorized" });
        }
        
        // 2. Query Redis for active session payload
        const session = await redis.get(`session-${sessionId}`);
        if (!session) {
            return res.status(400).json({ message: "session expired" });
        }

        // 3. Attach user data to the request object
        req.user = JSON.parse(session);
        next();
    } catch (error) {
        return res.status(500).json({ message: `protect error ${error}` });
    }
};

export default protect;