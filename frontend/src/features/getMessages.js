import api from '../../utils/axios';

/**
 * Fetches message history for a specific conversation ID.
 * @param {string} id - Conversation ID
 * @returns {Promise<Array>} List of messages
 */
async function getMessages(id) {
    try {
        const { data } = await api.get(`/api/chat/get-messages/${id}`);
        return data;
    } catch (error) {
        console.error("getMessages error:", error);
        return [];
    }
}

export default getMessages;
