import axios from "axios";

/**
 * ============================================================================
 * AXIOS API CLIENT INSTANCE
 * ============================================================================
 * Pre-configured with base URL pointing to the API Gateway and credentials
 * enabled for sending/receiving HTTP-only session cookies.
 * ============================================================================
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URI,
    withCredentials: true,
});

export default api;