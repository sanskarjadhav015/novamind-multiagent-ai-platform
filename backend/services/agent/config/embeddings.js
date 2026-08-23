import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from "dotenv";

dotenv.config();

/**
 * ============================================================================
 * GOOGLE GENERATIVE AI VECTOR EMBEDDINGS
 * ============================================================================
 * Model: "gemini-embedding-001"
 * Used for transforming chunked PDF documents into dense vector embeddings.
 * ============================================================================
 */
export const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: process.env.GOOGLE_API_KEY
});