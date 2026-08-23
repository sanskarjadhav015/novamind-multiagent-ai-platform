import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

/**
 * ============================================================================
 * RAZORPAY PAYMENT GATEWAY CLIENT
 * ============================================================================
 * Initialized with API Key ID and Secret for creating orders and verifying signatures.
 * ============================================================================
 */
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

export default razorpay;