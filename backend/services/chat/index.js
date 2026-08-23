import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import router from "./routes/chat.routes.js";

// Load environment variables (.env)
dotenv.config();

const port = process.env.PORT || 5002;
const app = express();

/**
 * ============================================================================
 * CHAT & HISTORY MICROSERVICE (Port 5002)
 * ============================================================================
 * Responsibilities:
 * - Conversation lifecycle (create, retrieve user threads, rename title).
 * - Message & Polymorphic Artifact persistence.
 * - History API for retrieving messages per conversation.
 * ============================================================================
 */

app.use(express.json());
app.use("/", router);

// Health check endpoint
app.get("/", (req, res) => {
    res.json({ message: "hello from chat" });
});

// Start Chat Server & Connect to MongoDB
app.listen(port, () => {
    console.log(`chat service started at ${port}`);
    connectDb();
});