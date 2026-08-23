import "dotenv/config";
import express from "express";
import connectDb from "./config/db.js";
import router from "./routes/agent.route.js";

const port = process.env.PORT || 5004;
const app = express();

/**
 * ============================================================================
 * AGENT INTELLIGENCE & ORCHESTRATION MICROSERVICE (Port 5004)
 * ============================================================================
 * Responsibilities:
 * - Hosts the LangGraph StateGraph state machine orchestrator.
 * - Houses all 8 specialized autonomous agents.
 * - Handles multipart file uploads (PDF RAG, Image OCR / Vision).
 * - Centralized error handling and rate limit status forwarding.
 * ============================================================================
 */

// Body parsers with 50MB payload limits for file & base64 transfers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Agent routes
app.use("/", router);

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error("Agent Service Error:", err);

    if (err.status) {
        return res.status(err.status).json(err.data || { message: err.message });
    }
    return res.status(500).json({ message: `agent error: ${err.message || err}` });
});

// Health check endpoint
app.get("/", (req, res) => {
    res.json({ message: "hello from agent" });
});

// Start Agent Server & Connect to DB
app.listen(port, () => {
    console.log(`agent service started at ${port}`);
    connectDb();
});