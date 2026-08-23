import api from "../../utils/axios";

/**
 * Retrieves the active user profile and credit balance from /api/me.
 * @returns {Promise<Object>} User session data
 */
const getCurrentUser = async () => {
    try {
        const { data } = await api.get("/api/me");
        return data;
    } catch (error) {
        console.error("getCurrentUser error:", error);
        return null;
    }
};

export default getCurrentUser;