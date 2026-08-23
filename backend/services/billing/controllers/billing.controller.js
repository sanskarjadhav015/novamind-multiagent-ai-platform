import crypto from "crypto";
import axios from "axios";
import { PLANS } from "../config/plans.js";
import razorpay from "../config/razorpay.js";
import Payment from "../models/payment.model.js";

/**
 * ============================================================================
 * BILLING CONTROLLER
 * ============================================================================
 */

/**
 * Endpoint: POST /create
 * - Validates the requested plan name against available tiers.
 * - Creates a Razorpay Order via `razorpay.orders.create()`.
 * - Records a pending Payment document in MongoDB.
 * - Returns order ID and currency to the frontend checkout modal.
 */
export const createOrder = async (req, res) => {
    try {
        const { plan } = req.body;
        const userId = req.headers["x-user-id"];
        const selectedPlan = PLANS[plan];

        if (!selectedPlan) {
            return res.status(404).json({ message: "plan not found" });
        }

        // Create Razorpay Order (amount in paise: amount * 100)
        const order = await razorpay.orders.create({
            amount: selectedPlan.amount * 100,
            currency: "INR",
            receipt: `receipt-${Date.now()}`
        });

        // Save initial payment record
        await Payment.create({
            userId,
            orderId: order.id,
            amount: selectedPlan.amount,
            credits: selectedPlan.credits,
            plan: selectedPlan.id,
            currency: order.currency,
            status: "created"
        });

        return res.status(200).json({ order, plan: selectedPlan });
    } catch (error) {
        return res.status(500).json({ message: `create order error ${error}` });
    }
};

/**
 * Endpoint: POST /verify
 * - Cryptographically verifies Razorpay payment signature using HMAC SHA-256.
 * - Updates payment record status to "paid".
 * - Calls Auth Service `/update-plan` to credit user account and update Redis session.
 */
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // 1. Generate expected HMAC SHA-256 signature
        const generateSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        // 2. Cryptographic signature check
        if (generateSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Payment Verification failed" });
        }

        // 3. Find and update Payment document in DB
        const payment = await Payment.findOne({ orderId: razorpay_order_id });

        if (!payment) {
            return res.status(404).json({ message: "Payment Not found" });
        }
        payment.status = "paid";
        payment.paymentId = razorpay_payment_id;
        await payment.save();

        // 4. Notify Auth Service to apply plan upgrade and add credits
        const authRes = await axios.post(`${process.env.AUTH_SERVICE}/update-plan`, {
            userId: payment.userId,
            plan: payment.plan,
            credits: payment.credits
        });

        return res.status(200).json({
            success: true,
            message: "Payment Verified",
            user: authRes.data?.user
        });
    } catch (error) {
        return res.status(500).json({ message: `Payment verification error: ${error.message || error}` });
    }
};