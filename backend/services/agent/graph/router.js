import { getmodel } from "../config/llmModels.js";

/**
 * ============================================================================
 * DYNAMIC HYBRID ROUTING ENGINE (`router.js`)
 * ============================================================================
 * Routing Hierarchy:
 * 1. Attachment Interceptor (Deterministic 0ms):
 *    - PDF file attached -> routes immediately to `pdfRag`.
 *    - Image file attached -> routes immediately to `imageAnalyzer`.
 * 2. Explicit Client Override:
 *    - If client selected a specific agent (e.g. "coding", "ppt"), routes directly.
 * 3. Heuristic Regex Keyword Fast-Path (<1ms):
 *    - Matches keyword clusters for Greetings, DSA, Websites, PDFs, PPTs, Images, Search.
 *    - Eliminates LLM latency and cost for ~70% of standard user requests.
 * 4. Zero-Shot Semantic LLM Classification Fallback:
 *    - Invokes lightweight Groq model with temperature 0 and max 5 tokens.
 * ============================================================================
 */

const VALID_AGENTS = ["chat", "search", "coding", "pdf", "ppt", "vision", "pdfRag", "imageAnalyzer"];

const sanitizeAgent = (raw = "") => {
    const cleaned = raw.toLowerCase().replace(/[^a-z]/g, "").trim();
    return VALID_AGENTS.includes(cleaned) ? cleaned : "chat";
};

// --- Heuristic keyword dictionaries -------------------------------------------

const PDF_KEYWORDS = [
    "pdf", "generate pdf", "create pdf", "make pdf", "download pdf",
    "pdf on", "pdf of", "pdf report", "export pdf"
];

const PPT_KEYWORDS = [
    "ppt", "pptx", "powerpoint", "presentation", "slide deck", "slides on",
    "generate ppt", "create ppt", "make ppt", "presentation on", "slides for"
];

const VISION_KEYWORDS = [
    "generate image", "create image", "make an image", "draw a", "draw an",
    "paint a", "picture of", "photo of", "image of", "illustration of",
    "generate picture", "generate dog", "generate cat", "generate photo",
    "render image", "generate art"
];

const WEBSITE_KEYWORDS = [
    "website", "web page", "webpage", "landing page", "portfolio site", "portfolio website",
    "app", "application", "ui", "frontend", "front-end", "component",
    "dashboard", "form", "clone of", "html", "css", "react", "next.js",
    "tailwind", "responsive", "navbar", "homepage", "signup page",
    "login page", "e-commerce", "web app", "food website", "calculator app",
    "todo app", "weather app"
];

const SEARCH_KEYWORDS = [
    "latest news", "current events", "who is", "who was", "what happened to",
    "stock price", "weather in", "latest updates", "recent updates", "with images",
    "search for", "search web", "look up", "tell me about"
];

const DSA_KEYWORDS = [
    "dsa", "algorithm", "leetcode", "hackerrank", "gfg", "complexity",
    "time complexity", "space complexity", "given an array", "given a string",
    "given a linked list", "two sum", "container with most water",
    "binary search", "sliding window", "recursion", "dynamic programming",
    "dp problem", "graph traversal", "bfs", "dfs", "sort the array",
    "reverse a linked list", "subarray", "permutations", "combinations",
    "backtracking", "greedy", "leetcode style"
];

const GREETING_KEYWORDS = [
    "hi", "hello", "hey", "hola", "namaste", "good morning", "good afternoon",
    "good evening", "how are you", "who are you", "what can you do", "help me",
    "thanks", "thank you", "bye", "goodbye", "tell me a joke"
];

const containsAny = (text, keywords) =>
    keywords.some(k => text.includes(k));

/**
 * Deterministic fast-path keyword evaluation
 * Returns "pdf" | "ppt" | "vision" | "coding" | "search" | "chat" | null
 */
const heuristicOverride = (rawPrompt) => {
    const text = rawPrompt.toLowerCase().trim();

    // 0. Quick exact greetings (instant 0ms routing)
    if (GREETING_KEYWORDS.includes(text) || text.length <= 4) return "chat";

    // 1. Explicit document & media creation keywords
    if (containsAny(text, PDF_KEYWORDS)) return "pdf";
    if (containsAny(text, PPT_KEYWORDS)) return "ppt";
    if (containsAny(text, VISION_KEYWORDS)) return "vision";

    // 2. Websites, UIs, and runnable apps go to Coding Agent (live preview)
    if (containsAny(text, WEBSITE_KEYWORDS)) return "coding";

    // 3. Live search queries
    if (containsAny(text, SEARCH_KEYWORDS)) return "search";

    // 4. DSA / Algorithm problem solving goes to Chat Agent
    if (containsAny(text, DSA_KEYWORDS) || containsAny(text, GREETING_KEYWORDS)) return "chat";

    return null; // No strong deterministic signal — let the LLM decide
};

/**
 * Main LangGraph Router Node
 * Evaluates state and determines the destination agent.
 */
export const router = async (state) => {
    // 1. Attachment-based deterministic routing
    if (state.file?.mimetype === "application/pdf") {
        console.log("[Router] PDF file detected -> routing to pdfRag");
        return { ...state, agent: "pdfRag" };
    }

    if (state.file?.mimetype?.startsWith("image/")) {
        console.log("[Router] Image file detected -> routing to imageAnalyzer");
        return { ...state, agent: "imageAnalyzer" };
    }

    if (!state?.prompt) {
        console.warn("[Router] Missing state.prompt, defaulting to chat");
        return { ...state, agent: "chat" };
    }

    // 2. Manual explicit agent selection by client
    const normalizedAgent = state.agent ? state.agent.toLowerCase().trim() : "auto";
    if (normalizedAgent && normalizedAgent !== "auto") {
        const resolved = VALID_AGENTS.includes(normalizedAgent) ? normalizedAgent : "chat";
        console.log(`[Router] Manual agent: "${state.agent}" → resolved: "${resolved}"`);
        return { ...state, agent: resolved };
    }

    // 3. Fast-path deterministic heuristic before calling LLM
    const heuristic = heuristicOverride(state.prompt);
    if (heuristic) {
        console.log(`[Router] Heuristic match → "${heuristic}"`);
        return { ...state, agent: heuristic };
    }

    // 4. Zero-shot LLM semantic classification prompt
    const prompt = `You are an intelligent agent router. Classify the user query into exactly one agent.

Agents:
- chat: DSA/algorithm problems, LeetCode-style questions, plain code snippets,
  code explanations, casual conversation, personal advice, quick math.
  Use chat when the user wants plain text/code answers with NO visual UI artifacts.
- search: current events, news, real-world entities, "latest...", fact lookups, queries asking for images/details.
- coding: building/creating a WEBSITE, APP, UI, PAGE, COMPONENT, or any multi-file project
  with HTML/CSS/JS that produces a live visual preview.
  "food website", "code for portfolio website", "build me a calculator app" ALL go to coding.
- pdf: generating PDFs or downloadable document files.
- ppt: generating PowerPoint presentations or slide outlines.
- vision: explicit requests to generate or create a new AI image/art.

Examples:
Query: "hi there" -> chat
Query: "code for linked list in C++" -> chat
Query: "write code to solve two sum problem" -> chat
Query: "reverse a linked list in python" -> chat
Query: "explain time complexity of merge sort" -> chat
Query: "what's the latest news on AI" -> search
Query: "tell me about salman khan with images" -> search
Query: "food website" -> coding
Query: "code for food blog website" -> coding
Query: "build me a portfolio website" -> coding
Query: "create a landing page for a saas product" -> coding
Query: "make a todo app with react" -> coding
Query: "make me a pdf report on nodejs" -> pdf
Query: "create a ppt on machine learning" -> ppt
Query: "generate an image of a dog on a car" -> vision

Respond with exactly one word from: chat, search, coding, pdf, ppt, vision.
No punctuation, no explanation.

User Query:
${state.prompt}`;

    try {
        const llm = await getmodel("router");
        const response = await llm.invoke(prompt, {
            temperature: 0,
            maxTokens: 5
        });

        const resolved = sanitizeAgent(response.content ?? "");
        console.log(`[Router] LLM raw: "${(response.content ?? "").trim()}" → resolved: "${resolved}"`);

        return { ...state, agent: resolved };
    } catch (err) {
        console.error("[Router] LLM invocation failed, defaulting to chat:", err);
        return { ...state, agent: "chat" };
    }
};