import { StateGraph } from "@langchain/langgraph";
import { agentState } from "./state.js";
import { router } from "./router.js";
import { chatAgent } from "../agents/chat.agent.js";
import { searchAgent } from "../agents/search.agent.js";
import { codingAgent } from "../agents/coding.agent.js";
import { pdfAgent } from "../agents/pdf.agent.js";
import { pptAgent } from "../agents/ppt.agent.js";
import { visionAgent } from "../agents/vision.agent.js";
import { pdfRag } from "../agents/pdfRag.agent.js";
import { imageAnalyzer } from "../agents/imageAnalyzer.agent.js";

/**
 * ============================================================================
 * LANGGRAPH WORKFLOW DEFINITION (`graph.js`)
 * ============================================================================
 * Graph Topology:
 * - __start__ -> router
 * - router -> (conditional edge based on state.agent):
 *   - chat -> __end__
 *   - search -> chat -> __end__ (Pipelined context flow)
 *   - coding -> __end__
 *   - pdf -> __end__
 *   - ppt -> __end__
 *   - vision -> __end__
 *   - pdfRag -> __end__
 *   - imageAnalyzer -> __end__
 * ============================================================================
 */

const workflow = new StateGraph(agentState);

// Register agent nodes
workflow.addNode("router", router);
workflow.addNode("chat", chatAgent);
workflow.addNode("search", searchAgent);
workflow.addNode("coding", codingAgent);
workflow.addNode("pdf", pdfAgent);
workflow.addNode("ppt", pptAgent);
workflow.addNode("vision", visionAgent);
workflow.addNode("pdfRag", pdfRag);
workflow.addNode("imageAnalyzer", imageAnalyzer);

// Start edge: Ingress to Router
workflow.addEdge("__start__", "router");

// Dynamic conditional branching from Router to target agent
workflow.addConditionalEdges("router", (state) => {
    switch (state.agent) {
        case "chat":
            return "chat";
        case "search":
            return "search";
        case "coding":
            return "coding";
        case "pdf":
            return "pdf";
        case "ppt":
            return "ppt";
        case "vision":
            return "vision";
        case "pdfRag":
            return "pdfRag";
        case "imageAnalyzer":
            return "imageAnalyzer";
        default:
            return "chat";
    }
}, {
    chat: "chat",
    search: "search",
    coding: "coding",
    pdf: "pdf",
    ppt: "ppt",
    vision: "vision",
    pdfRag: "pdfRag",
    imageAnalyzer: "imageAnalyzer"
});

// Pipelined edge: Search results are fed directly into the Chat Agent for grounded synthesis
workflow.addEdge("search", "chat");

// Terminal execution edges
workflow.addEdge("chat", "__end__");
workflow.addEdge("coding", "__end__");
workflow.addEdge("pdf", "__end__");
workflow.addEdge("ppt", "__end__");
workflow.addEdge("vision", "__end__");
workflow.addEdge("pdfRag", "__end__");
workflow.addEdge("imageAnalyzer", "__end__");

// Compile compiled state machine executable
export const graph = workflow.compile();