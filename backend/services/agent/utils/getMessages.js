import axios from "axios";

/**
 * ============================================================================
 * GET MESSAGES UTILITY
 * ============================================================================
 * Internal inter-service call to Chat Service to fetch message history for a thread.
 * ============================================================================
 * @param {string} conversationId
 */
export const getMessages = async (conversationId) => {
    try {
        const { data } = await axios.get(`${process.env.CHAT_SERVICE}/get-messages/${conversationId}`);
        return data;
    } catch (error) {
        console.error("Failed to fetch messages from chat service:", error.message || error);
        return null;
    }
};