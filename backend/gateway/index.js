import express from "express";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import { getCurrentUser } from "./controllers/user.controller.js";
import protect from "./middleware/auth.middleware.js";
import { proxyWithHeader } from "./utils/proxyWithHeader.js";

// Load environment variables (.env)
dotenv.config();

const port = process.env.PORT || 5000;
const app = express();

/**
 * ============================================================================
 * NOVA MIND API GATEWAY SERVICE
 * ============================================================================
 * Role:
 * - Single public-facing ingress / entry point for the NovaMind microservices.
 * - Handles CORS with frontend credentials support.
 * - Parses HTTP-only cookies for distributed session verification via Redis.
 * - Injects authenticated user context (x-user-id) to downstream services.
 * ============================================================================
 */

// 1. Cross-Origin Resource Sharing (CORS) setup
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// 2. HTTP Request Logger (Dev format)
app.use(morgan("dev"));

// 3. Cookie parser for extracting session UUIDs
app.use(cookieParser());

/**
 * ----------------------------------------------------------------------------
 * REVERSE PROXY ROUTING
 * ----------------------------------------------------------------------------
 * - /api/auth    -> Auth Service (public endpoints like Google OAuth login)
 * - /api/chat    -> Chat Service (protected: requires valid Redis session)
 * - /api/agent   -> Agent Service (protected: LangGraph AI execution engine)
 * - /api/billing -> Billing Service (protected: Razorpay order & verification)
 * ----------------------------------------------------------------------------
 */

// Auth routes proxy (allows large payloads up to 50MB for profile assets)
app.use("/api/auth", proxy(process.env.AUTH_SERVICE, { limit: "50mb" }));

// Protected microservices proxies with automatic x-user-id header injection
app.use("/api/chat", protect, proxyWithHeader(process.env.CHAT_SERVICE));
app.use("/api/agent", protect, proxyWithHeader(process.env.AGENT_SERVICE));
app.use("/api/billing", protect, proxyWithHeader(process.env.BILLING_SERVICE));

// Endpoint to retrieve active authenticated user's session profile
app.get("/api/me", protect, getCurrentUser);

// Health check endpoint
app.get("/", (req, res) => {
    res.json({ message: "hello from Gateway" });
});

// Start Gateway Server
app.listen(port, () => {
    console.log(`Gateway started at ${port}`);
});
