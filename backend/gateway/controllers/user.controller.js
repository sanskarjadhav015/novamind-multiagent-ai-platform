/**
 * ============================================================================
 * GATEWAY USER CONTROLLER
 * ============================================================================
 * Endpoint: GET /api/me (Protected by `protect` middleware)
 * Returns the currently authenticated user's profile and credit status
 * attached from the Redis session cache.
 * ============================================================================
 */
export const getCurrentUser = async (req, res) => {
    try {
        // Return the user object attached by the protect middleware
        return res.status(200).json(req.user);
    } catch (error) {
        return res.status(500).json({ message: `get current user error ${error}` });
    }
};