import "dotenv/config";
import express from "express";
import connectDb from "./config/db.js";
import router from "./routes/billing.route.js";

const port = process.env.PORT || 8004;
const app = express();

/**
 * ============================================================================
 * BILLING & PAYMENT MICROSERVICE (Port 5003 / 8004)
 * ============================================================================
 * Responsibilities:
 * - Razorpay order creation and payment link generation.
 * - Server-side HMAC SHA-256 cryptographic signature verification.
 * - Payment persistence and inter-service plan upgrade triggers.
 * ============================================================================
 */

app.use(express.json());
app.use("/", router);

// Health check endpoint
app.get("/", (req, res) => {
    res.json({ message: "hello from billing" });
});

// Start Billing Server & Connect to MongoDB
app.listen(port, () => {
    console.log(`billing service started at ${port}`);
    connectDb();
});