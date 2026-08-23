import api from "../../utils/axios";

/**
 * Fetches all conversation threads belonging to the current user.
 * @returns {Promise<Array>} List of conversation objects
 */
export const getConversations = async () => {
    try {
        const { data } = await api.get("/api/chat/get-conversations");
        return data;
    } catch (error) {
        console.error("getConversations error:", error);
        return [];
    }
};