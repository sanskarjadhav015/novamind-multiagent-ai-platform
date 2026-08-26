import { searchTool } from "../config/tavily.js";
import { deductCredits } from "../utils/deductCredits.js";
import { checkAgentLimit } from "../config/agentLimit.js";

/**
 * ============================================================================
 * 2. SEARCH AGENT (Tavily AI Search Engine)
 * ============================================================================
 * Responsibilities:
 * - Executes live web queries, breaking news searches, and fact lookups.
 * - Extracts top 4 snippets and top 5 curated web images.
 * - In the LangGraph workflow, pipelines the extracted context to the Chat Agent.
 * - Rate limit: 10 req/min | Credit Cost: 5 credits
 * ============================================================================
 */

// Tunables — env-overridable, no redeploy needed to adjust limits.
const MAX_QUERY_LENGTH = Number(process.env.SEARCH_MAX_QUERY_LENGTH) || 1000;
const MAX_SNIPPET_LENGTH = Number(process.env.SEARCH_MAX_SNIPPET_LENGTH) || 300;
const MAX_TITLE_LENGTH = Number(process.env.SEARCH_MAX_TITLE_LENGTH) || 200;
const MAX_RESULTS = Number(process.env.SEARCH_MAX_RESULTS) || 4;
const MAX_IMAGES = Number(process.env.SEARCH_MAX_IMAGES) || 5;
const SEARCH_TIMEOUT_MS = Number(process.env.SEARCH_TIMEOUT_MS) || 15_000;

/**
 * Wraps a promise with a hard timeout so a hung provider can't stall the request.
 */
const withTimeout = (promise, ms, label) =>
    Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        )
    ]);

/**
 * True only for well-formed http(s) URLs, so malformed/unsafe URLs from the
 * search provider don't get passed downstream to the Chat Agent or client.
 */
const isValidHttpUrl = (value) => {
    if (typeof value !== "string" || !value) return false;
    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
};

const emptySearchResults = (query) => ({ query, results: [] });

export const searchAgent = async (state) => {
    const logCtx = { userId: state?.userId, conversationId: state?.conversationId };

    try {
        // 1. Input Validation
        if (!state?.prompt || typeof state.prompt !== "string" || !state.prompt.trim()) {
            return {
                ...state,
                searchResults: emptySearchResults(state?.prompt ?? ""),
                images: [],
                aiResponse: "Please provide something to search for."
            };
        }
        if (state.prompt.length > MAX_QUERY_LENGTH) {
            return {
                ...state,
                searchResults: emptySearchResults(state.prompt),
                images: [],
                aiResponse: `Your search query is too long. Please shorten it to under ${MAX_QUERY_LENGTH} characters.`
            };
        }

        // 2. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "search");

        // 3. Perform Web Search via Tavily (with hard timeout)
        let rawResults;
        try {
            rawResults = await withTimeout(
                searchTool.invoke({ query: state.prompt }),
                SEARCH_TIMEOUT_MS,
                "Web search"
            );
        } catch (searchError) {
            console.error("[Search Agent] Search provider failed:", { ...logCtx, error: searchError.message });
            return {
                ...state,
                searchResults: emptySearchResults(state.prompt),
                images: [],
                aiResponse: "I'm having trouble searching the web right now. Please try again in a moment."
            };
        }

        // 4. Sanitize and Format Results
        const sanitizedResults = (rawResults?.results || [])
            .filter((item) => isValidHttpUrl(item?.url))
            .slice(0, MAX_RESULTS)
            .map((item) => ({
                title: (item.title || "").slice(0, MAX_TITLE_LENGTH),
                url: item.url,
                snippet: (item.content || "").slice(0, MAX_SNIPPET_LENGTH)
            }));

        const images = (rawResults?.images || [])
            .filter((img) => isValidHttpUrl(typeof img === "string" ? img : img?.url))
            .slice(0, MAX_IMAGES);

        const searchResults = { query: state.prompt, results: sanitizedResults };

        // 5. Validate User & Deduct Credits (5 credits)
        if (!state.userId) {
            console.error("[Search Agent] userId is missing. Credits were not deducted.", logCtx);
            return {
                ...state,
                searchResults,
                images
            };
        }

        let creditDeductionFailed = false;
        try {
            await deductCredits(state.userId, "search");
        } catch (creditError) {
            // Results were already fetched successfully — don't throw them away.
            // Log for reconciliation/billing follow-up and pass the results through.
            console.error("[Search Agent] Credit deduction failed after successful search:", {
                ...logCtx,
                error: creditError.message
            });
            creditDeductionFailed = true;
        }

        // 6. Return searchResults & images for downstream Chat Agent
        return {
            ...state,
            searchResults,
            images,
            ...(creditDeductionFailed ? { creditDeductionFailed: true } : {})
        };
    } catch (error) {
        console.error("[Search Agent] Error:", { ...logCtx, error: error.message, stack: error.stack });

        const isRateLimit = /rate limit|too many requests/i.test(error.message ?? "");
        const userMessage = isRateLimit
            ? "You're searching too quickly. Please wait a moment and try again."
            : "Something went wrong while searching. Please try again shortly.";

        return {
            ...state,
            searchResults: emptySearchResults(state?.prompt ?? ""),
            images: [],
            aiResponse: `# ❌ Search Error\n\n${userMessage}`
        };
    }
};