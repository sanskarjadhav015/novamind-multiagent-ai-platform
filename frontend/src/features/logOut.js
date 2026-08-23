import api from '../../utils/axios';

/**
 * Logs out the active user session on the Auth Service and clears cookies.
 */
async function logOut() {
    try {
        const { data } = await api.post("/api/auth/logout");
        return data;
    } catch (error) {
        console.error("logOut error:", error);
        return null;
    }
}

export default logOut;
