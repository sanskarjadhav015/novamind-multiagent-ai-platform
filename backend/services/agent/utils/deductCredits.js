import axios from "axios";

/**
 * ============================================================================
 * DEDUCT CREDITS UTILITY
 * ============================================================================
 * Internal inter-service call to Auth Service `/deduct-credits`.
 * Deducts credits according to the agent's configured cost tier.
 * ============================================================================
 * @param {string} userId - User identifier
 * @param {string} agent - Agent name (e.g. "coding", "pdf", "chat")
 */
export const deductCredits = async (userId, agent) => {
    try {
        const { data } = await axios.post(`${process.env.AUTH_SERVICE}/deduct-credits`, {
            userId,
            agent
        });
        return data;
    } catch (error) {
        console.error("Credit deduction failed:", error.message || error);
        return null;
    }
};