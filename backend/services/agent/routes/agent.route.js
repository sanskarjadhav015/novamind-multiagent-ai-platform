import express from "express";
import { agent } from "../controllers/agent.controller.js";
import multer from "../config/multer.js";

const router = express.Router();

/**
 * ============================================================================
 * AGENT SERVICE ROUTES
 * ============================================================================
 * POST /chat - Ingests prompt, optional file attachment, and triggers LangGraph.
 * ============================================================================
 */
router.post("/chat", multer.single("file"), agent);

export default router;