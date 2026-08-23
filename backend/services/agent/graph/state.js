import { Annotation } from "@langchain/langgraph";

/**
 * ============================================================================
 * LANGGRAPH AGENT STATE ANNOTATION SCHEMA (`agentState`)
 * ============================================================================
 * Central typed state passed across nodes in the LangGraph workflow:
 * - prompt: Raw user input text string
 * - aiResponse: Synthesized Markdown / plain text response from the agent
 * - agent: Target agent selected by the router node
 * - conversationId: Active chat thread identifier
 * - searchResults: Structured web search data (query & sanitized snippet items)
 * - images: Array of image URLs (generated or retrieved from web search)
 * - artifacts: Multi-file project bundles (for Monaco Editor & live iframe)
 * - userId: Authenticated user ID for credit deduction
 * - file: Uploaded multipart file metadata & temporary disk path
 * ============================================================================
 */
export const agentState = Annotation.Root({
    prompt: Annotation(),
    aiResponse: Annotation(),
    agent: Annotation(),
    conversationId: Annotation(),
    searchResults: Annotation(),
    images: Annotation(),
    artifacts: Annotation(),
    userId: Annotation(),
    file: Annotation()
});