import api from "../../utils/axios";

/**
 * Verifies Razorpay payment signature on the Billing Service.
 * @param {Object} payload - { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * @returns {Promise<Object>} Verification response and updated user record
 */
export const verifyPayment = async (payload) => {
    try {
        const { data } = await api.post("/api/billing/verify", payload);
        return data;
    } catch (error) {
        console.error("verifyPayment error:", error);
        return null;
    }
};