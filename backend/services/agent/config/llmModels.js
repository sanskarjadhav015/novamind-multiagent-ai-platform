import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenRouter } from "@langchain/openrouter";

/**
 * ============================================================================
 * MULTI-PROVIDER LLM REGISTRY WITH AUTOMATIC CASCADING FAILOVER (`llmModels.js`)
 * ============================================================================
 *
 * High-Availability Architecture:
 * - Automatically falls back to secondary/tertiary providers if the primary
 *   experiences 401 Unauthorized, 429 Rate Limits, 500/503 Downtime, or Network Timeouts.
 * - Providers with missing/placeholder API keys are excluded at startup instead
 *   of being included and failing on every request.
 * - Every provider gets a hard request timeout so a hung provider can't stall
 *   the whole fallback chain.
 *
 * Provider Priority Matrices:
 * 1. Default / Chat / Router / Intent / Search / Vision Prompt:
 *    Primary: Groq (ultra-low latency) -> Fallback 1: Gemini 3.6 Flash -> Fallback 2: OpenRouter DeepSeek
 * 2. Coding Agent:
 *    Primary: OpenRouter DeepSeek (specialized code) -> Fallback 1: Gemini 3.6 Flash -> Fallback 2: Groq
 * 3. PDF RAG & Document Grounding:
 *    Primary: Gemini 3.6 Flash (grounded RAG) -> Fallback 1: Groq -> Fallback 2: OpenRouter
 * 4. Image Analyzer (Multimodal OCR / Vision):
 *    Primary: Gemini 3.6 Flash (native multimodal) -> Fallback 1: OpenRouter
 * ============================================================================
 */

const DEFAULT_TIMEOUT_MS = Number(process.env.LLM_REQUEST_TIMEOUT_MS) || 30_000;
const DEFAULT_MAX_RETRIES = Number(process.env.LLM_MAX_RETRIES) || 1;

// ─── 0. Key Validation Helpers ──────────────────────────────────────────────

/**
 * Returns true only if a real-looking API key is configured.
 * Prevents providers from silently entering the fallback chain with a
 * "dummy-key" that will fail on every single request.
 */
const hasValidKey = (envVar) => {
    const value = process.env[envVar];
    return Boolean(value && value.trim().length > 0 && value !== "dummy-key");
};

// ─── 1. Provider Initializers (Safe with fallback guards) ───────────────────

export const createGroqModel = () => {
    if (!hasValidKey("GROQ_API_KEY")) {
        console.warn("[LLM Init] Skipping Groq: GROQ_API_KEY not configured.");
        return null;
    }
    try {
        return new ChatGroq({
            model: "openai/gpt-oss-120b",
            apiKey: process.env.GROQ_API_KEY,
            temperature: 0.2,
            maxRetries: DEFAULT_MAX_RETRIES,
            timeout: DEFAULT_TIMEOUT_MS
        });
    } catch (e) {
        console.warn("[LLM Init] Groq initialization failed:", e.message);
        return null;
    }
};

export const createGeminiModel = () => {
    if (!hasValidKey("GOOGLE_API_KEY")) {
        console.warn("[LLM Init] Skipping Gemini: GOOGLE_API_KEY not configured.");
        return null;
    }
    try {
        return new ChatGoogleGenerativeAI({
            model: "gemini-3.6-flash",
            apiKey: process.env.GOOGLE_API_KEY,
            temperature: 0.2,
            maxRetries: DEFAULT_MAX_RETRIES,
            timeout: DEFAULT_TIMEOUT_MS
        });
    } catch (e) {
        console.warn("[LLM Init] Gemini initialization failed:", e.message);
        return null;
    }
};

export const createOpenRouterModel = () => {
    if (!hasValidKey("OPENROUTER_API_KEY")) {
        console.warn("[LLM Init] Skipping OpenRouter: OPENROUTER_API_KEY not configured.");
        return null;
    }
    try {
        return new ChatOpenRouter({
            model: "deepseek/deepseek-chat",
            apiKey: process.env.OPENROUTER_API_KEY,
            temperature: 0.2,
            maxTokens: 32000,
            maxRetries: DEFAULT_MAX_RETRIES,
            timeout: DEFAULT_TIMEOUT_MS
        });
    } catch (e) {
        console.warn("[LLM Init] OpenRouter initialization failed:", e.message);
        return null;
    }
};

// Singleton model instances (null if that provider isn't configured)
const groq = createGroqModel();
const gemini = createGeminiModel();
const openrouter = createOpenRouterModel();

/**
 * Builds a resilient Runnable chain with cascading fallbacks.
 * @param {Array} chain - Ordered list of models to try [primary, fallback1, fallback2]
 * @param {string} chainName - For diagnostics/logging only.
 */
const buildFallbackChain = (chain, chainName) => {
    const validModels = chain.filter(Boolean);

    if (validModels.length === 0) {
        // Fail loudly at startup rather than on the first user request.
        throw new Error(
            `[LLM Init] No valid LLM providers configured for chain "${chainName}". ` +
            `Check that at least one of GROQ_API_KEY, GOOGLE_API_KEY, OPENROUTER_API_KEY is set.`
        );
    }

    if (validModels.length < chain.length) {
        console.warn(
            `[LLM Init] Chain "${chainName}" is running with ${validModels.length}/${chain.length} providers ` +
            `(missing providers were excluded due to absent API keys).`
        );
    }

    if (validModels.length === 1) {
        return validModels[0];
    }

    const [primary, ...fallbacks] = validModels;
    return primary.withFallbacks({ fallbacks });
};

// ─── 2. Cascading Failover Chains by Agent Role ─────────────────────────────

// Chat, Router, Intent, Search, PPT, PDF, Vision Prompts
// Groq (Fast) -> Gemini 3.6 Flash -> OpenRouter DeepSeek
const defaultChain = buildFallbackChain([groq, gemini, openrouter], "default");

// Coding Agent
// OpenRouter DeepSeek (Coding) -> Gemini 3.6 Flash (1M Context) -> Groq
const codingChain = buildFallbackChain([openrouter, gemini, groq], "coding");

// Multimodal Vision OCR & Image Inspection
// Gemini 3.6 Flash (Multimodal) -> OpenRouter
const visionChain = buildFallbackChain([gemini, openrouter], "vision");

// PDF RAG Grounding
// Gemini 3.6 Flash (Context Grounding) -> Groq -> OpenRouter
const ragChain = buildFallbackChain([gemini, groq, openrouter], "pdfRag");

// ─── 3. Agent -> Chain Lookup ────────────────────────────────────────────────

const AGENT_CHAIN_MAP = {
    coding: codingChain,
    imageAnalyzer: visionChain,
    pdfRag: ragChain,
    "pdf-rag": ragChain,
    chat: defaultChain,
    search: defaultChain,
    image: defaultChain,
    vision: defaultChain,
    pdf: defaultChain,
    ppt: defaultChain,
    router: defaultChain,
    intent: defaultChain
};

/**
 * Resolves the optimal failover-enabled LLM instance for a given agent task.
 * @param {string} agent - Target agent name
 * @returns {Promise<Runnable>} Failover-equipped LangChain Runnable
 */
export const getmodel = async (agent) => {
    return AGENT_CHAIN_MAP[agent] ?? defaultChain;
};

/**
 * Reports which providers are actually configured, for startup diagnostics
 * or a /health endpoint. Never throws.
 */
export const getProviderHealth = () => ({
    groq: Boolean(groq),
    gemini: Boolean(gemini),
    openrouter: Boolean(openrouter)
});

export default getmodel;