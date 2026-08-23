import api from "../../utils/axios";

/**
 * Updates a conversation thread title on the Chat Service.
 * @param {Object} payload - { id: conversationId, title: newTitle }
 * @returns {Promise<Object>} Updated conversation
 */
export const updateConversation = async (payload) => {
    try {
        const { data } = await api.post("/api/chat/update-conversation", payload);
        return data;
    } catch (error) {
        console.error("updateConversation error:", error);
        return [];
    }
};