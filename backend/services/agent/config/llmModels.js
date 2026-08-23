import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenRouter } from "@langchain/openrouter";

/**
 * ============================================================================
 * MULTI-MODEL LLM PROVIDER REGISTRY (`llmModels.js`)
 * ============================================================================
 * Model Strategy:
 * - Groq (openai/gpt-oss-120b): Low-latency router, chat, and document synthesis (>300 tok/s).
 * - OpenRouter (DeepSeek-Chat): Multi-file code generation and structured JSON exports.
 * - Google Gemini (gemini-3.6-flash): Multimodal vision OCR and document RAG grounding.
 * ============================================================================
 */

// Groq low-latency reasoning model
const groq = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY
});

// DeepSeek-Chat coding model via OpenRouter
const openrouter = new ChatOpenRouter({
    model: "deepseek/deepseek-chat",
    temperature: 0,
    maxTokens: 16000,
    apiKey: process.env.OPENROUTER_API_KEY
});

// Google Gemini Multimodal Vision & RAG model
const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    apiKey: process.env.GOOGLE_API_KEY
});

/**
 * Resolves the optimal LLM instance for a given agent task.
 * @param {string} agent - Target agent name
 */
export const getmodel = async (agent) => {
    switch (agent) {
        case "coding":
            return openrouter;
        case "imageAnalyzer":
            return gemini;
        case "pdfRag":
        case "pdf-rag":
        case "chat":
        case "search":
        case "image":
        case "vision":
        case "pdf":
        case "ppt":
        case "router":
        case "intent":
        default:
            return groq;
    }
};