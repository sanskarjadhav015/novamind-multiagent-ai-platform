import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings } from "./embeddings.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * ============================================================================
 * QDRANT VECTOR DATABASE HELPER
 * ============================================================================
 * Creates an ephemeral vector store from document chunks using Gemini embeddings.
 * Used by the PDF RAG Agent for cosine similarity search over uploaded documents.
 * ============================================================================
 * @param {Array} docs - Array of LangChain Document objects
 * @param {string} collectionName - Unique collection identifier (e.g. `pdf-${timestamp}`)
 */
export const vectorStore = async (docs, collectionName) => {
    return await QdrantVectorStore.fromDocuments(docs, embeddings, {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName
    });
};
