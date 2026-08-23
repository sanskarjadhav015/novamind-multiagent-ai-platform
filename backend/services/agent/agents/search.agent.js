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
export const searchAgent = async (state) => {
    try {
        // 1. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "search");

        // 2. Perform Web Search via Tavily
        const rawResults = await searchTool.invoke({
            query: state.prompt
        });

        // 3. Sanitize and Format Results
        const sanitizedResults = (rawResults?.results || [])
            .slice(0, 4)
            .map((item) => ({
                title: item.title || "",
                url: item.url || "",
                snippet: (item.content || "").slice(0, 300)
            }));

        const images = (rawResults?.images || []).slice(0, 5);

        // 4. Validate User & Deduct Credits (5 credits)
        if (!state.userId) {
            console.error("[Search Agent] userId is missing. Credits were not deducted.");
            return {
                ...state,
                searchResults: {
                    query: state.prompt,
                    results: sanitizedResults
                },
                images
            };
        }

        try {
            await deductCredits(state.userId, "search");
        } catch (creditError) {
            console.error("[Search Agent] Credit deduction failed:", creditError);
            return {
                ...state,
                searchResults: {
                    query: state.prompt,
                    results: []
                },
                images: [],
                aiResponse: "# ⚠️ Search Completed\n\nSearch results were found, but there was a problem processing your credits. Please try again."
            };
        }

        // 5. Return searchResults & images for downstream Chat Agent
        return {
            ...state,
            searchResults: {
                query: state.prompt,
                results: sanitizedResults
            },
            images
        };
    } catch (error) {
        console.error("[Search Agent] Error:", error);
        return {
            ...state,
            searchResults: {
                query: state.prompt,
                results: []
            },
            images: [],
            aiResponse: `# ❌ Search Error\n\n${error.message}`
        };
    }
};