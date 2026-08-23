import mongoose from "mongoose";

/**
 * ============================================================================
 * PAYMENT MONGOOSE SCHEMA & MODEL
 * ============================================================================
 * Tracks Razorpay order creation, payment ID captures, amounts, and statuses.
 * Statuses: "created" -> "paid" | "failed"
 * ============================================================================
 */
const paymentSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    paymentId: String,
    amount: Number,
    currency: {
        type: String,
        default: "INR"
    },
    credits: {
        type: Number
    },
    plan: {
        type: String
    },
    status: {
        type: String,
        enum: ["created", "paid", "failed"],
        default: "created"
    }
}, { timestamps: true });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;