import { TavilySearch } from "@langchain/tavily";

/**
 * ============================================================================
 * TAVILY AI WEB SEARCH TOOL
 * ============================================================================
 * Configured for real-time web research queries, fetching top 5 search snippets
 * and curated web images.
 * ============================================================================
 */
export const searchTool = new TavilySearch({
    maxResults: 5,
    topic: "general",
    includeImages: true
});