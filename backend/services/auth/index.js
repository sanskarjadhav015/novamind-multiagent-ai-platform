import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import router from "./routes/auth.route.js";

// Load environment variables (.env)
dotenv.config();

const port = process.env.PORT || 5001;
const app = express();

/**
 * ============================================================================
 * AUTHENTICATION & USER MANAGEMENT MICROSERVICE (Port 5001)
 * ============================================================================
 * Responsibilities:
 * - Firebase Google OAuth ID Token verification.
 * - MongoDB User CRUD (Users, Plans, Credits).
 * - Redis session creation & cookie issuance (7-day TTL).
 * - Centralized credit ledger and deduction endpoint.
 * ============================================================================
 */

app.use(express.json());
app.use("/", router);

// Health check endpoint
app.get("/", (req, res) => {
    res.json({ message: "hello from auth" });
});

// Start Auth Server & Connect to MongoDB
app.listen(port, () => {
    console.log(`auth service started at ${port}`);
    connectDb();
});