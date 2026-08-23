import api from "../../utils/axios";

/**
 * Creates a new conversation record on the Chat Service.
 * @returns {Promise<Object>} Created conversation object
 */
export const createConversation = async () => {
    try {
        const { data } = await api.post("/api/chat/create-conversation");
        return data;
    } catch (error) {
        console.error("createConversation error:", error);
        return [];
    }
};