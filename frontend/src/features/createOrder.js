import api from "../../utils/axios";

/**
 * Initiates Razorpay Order creation on the Billing Service.
 * @param {string} plan - "starter" | "pro"
 * @returns {Promise<Object>} Razorpay Order object and plan details
 */
export const createOrder = async (plan) => {
    try {
        const { data } = await api.post("/api/billing/create", { plan });
        return data;
    } catch (error) {
        console.error("createOrder error:", error);
        return null;
    }
};