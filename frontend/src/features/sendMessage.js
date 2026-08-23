import api from '../../utils/axios';

/**
 * Sends prompt, selected agent, and optional file to the Agent Service.
 * @param {FormData} payload - FormData containing prompt, conversationId, agent, and file
 * @returns {Promise<Object>} Agent result containing answer, images, and artifacts
 */
async function sendMessage(payload) {
    try {
        const { data } = await api.post("/api/agent/chat", payload);
        return data;
    } catch (error) {
        console.error("sendMessage error:", error);
        return null;
    }
}

export default sendMessage;
