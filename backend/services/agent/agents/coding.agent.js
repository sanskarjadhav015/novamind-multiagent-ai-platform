import { getmodel } from "../config/llmModels.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getMemory } from "../config/memory.js";
import { checkAgentLimit } from "../config/agentLimit.js";

/**
 * ============================================================================
 * 3. CODING AGENT (OpenRouter DeepSeek-Chat)
 * ============================================================================
 * Responsibilities:
 * - Generates full-stack multi-file projects (HTML5/CSS3/JavaScript).
 * - Enforces strict JSON output schema: `{"files": [{"name": "...", "content": "..."}]}`.
 * - Packages project into Artifact payload for Monaco Editor & live iframe sandbox.
 * - Handles code reviews, explanations, and debugging queries.
 * - Rate limit: 5 req/min | Credit Cost: 10 credits
 * ============================================================================
 */

// Project-related keywords that indicate multi-file application creation
const PROJECT_KEYWORDS = [
    "website",
    "web page",
    "webpage",
    "landing page",
    "portfolio",
    "app",
    "application",
    "ui",
    "frontend",
    "dashboard",
    "clone",
    "html",
    "css",
    "javascript",
    "game",
    "calculator",
    "todo",
    "blog",
    "e-commerce",
    "store",
    "page",
    "navbar",
    "component"
];

const hasProjectKeyword = (prompt = "") => {
    const text = prompt.toLowerCase();
    return PROJECT_KEYWORDS.some((keyword) => text.includes(keyword));
};

export const codingAgent = async (state) => {
    try {
        // 1. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "coding");

        const intentLlm = await getmodel("intent");
        const llm = await getmodel("coding");
        const history = await getMemory(state.conversationId);

        let contextText = "";
        if (history && history.length > 0) {
            const recent = history.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n");
            contextText = `Recent Conversation Context:\n${recent}\n\n`;
        }

        // 2. Classify intent: Multi-file project generation vs explanation/debugging
        let isProjectRequest = hasProjectKeyword(state.prompt);

        if (!isProjectRequest) {
            const intentRes = await intentLlm.invoke(`
You are an intent classifier for a coding assistant.

Return ONLY ONE of these values:

- CODE_GENERATION: user wants to build a project, website, page, app, UI, or runnable code files.
- CODE_EXPLANATION: user wants an explanation of programming concepts or theories.
- CODE_REVIEW: user wants existing code reviewed.
- DEBUGGING: user wants a bug or error fixed in code.
- OPTIMIZATION: user wants to optimize code performance.

Examples:

"food website" -> CODE_GENERATION
"create a calculator" -> CODE_GENERATION
"portfolio site" -> CODE_GENERATION
"landing page for saas" -> CODE_GENERATION
"explain event loop in nodejs" -> CODE_EXPLANATION
"debug this react error" -> DEBUGGING

User Request:
${state.prompt}

Return ONLY the category name.
`);

            const intent = intentRes.content.trim().toUpperCase();
            if (intent.includes("CODE_GENERATION")) {
                isProjectRequest = true;
            }
        }

        // 3. Multi-File Project Generation Branch
        if (isProjectRequest) {
            const prompt = `
You are NovaMind Coding Agent.

Generate the requested project.

Default stack:
- HTML
- CSS
- JavaScript

Use React / Next.js / Vue ONLY if explicitly requested.

Rules:
- Fully responsive modern UI
- Clean CSS variables
- Use Flexbox/Grid
- Smooth interactions and styling
- Self-contained working code
- Write production-quality code
- Make sure all files work together
- Do not omit important functionality

Return ONLY valid JSON.

Schema:

{
    "files": [
        {
            "name": "index.html",
            "content": "..."
        },
        {
            "name": "style.css",
            "content": "..."
        },
        {
            "name": "script.js",
            "content": "..."
        }
    ]
}

Rules:
- Output must start with {
- Output must end with }
- No markdown
- No explanation
- No extra text outside JSON
- No code fences
${contextText}User Request:
${state.prompt}
`;

            const res = await llm.invoke(prompt);

            // Strip accidental code fences from output
            const raw = (res.content ?? "")
                .trim()
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/```\s*$/i, "")
                .trim();

            let data;
            try {
                data = JSON.parse(raw);
            } catch (e) {
                console.error("[Coding Agent] JSON parse failed:", e.message);
                return {
                    ...state,
                    aiResponse: "Code generation failed — the model returned invalid JSON. Please try again.",
                    artifacts: []
                };
            }

            // Validate generated files structure
            if (!data || !Array.isArray(data.files) || data.files.length === 0) {
                console.error("[Coding Agent] Invalid files returned by model");
                return {
                    ...state,
                    aiResponse: "Code generation failed — no valid files were generated.",
                    artifacts: []
                };
            }

            // Helper to format clean Markdown preview of code files
            const formatCodeResponse = (files, title) => {
                let text = `# ✅ Project Generated Successfully\n\nHere is the source code for **${title}**:\n\n`;
                for (const f of files) {
                    const ext = (f.name || "").split(".").pop()?.toLowerCase() || "";
                    let lang = ext;
                    if (ext === "js" || ext === "jsx") lang = "javascript";
                    else if (ext === "ts" || ext === "tsx") lang = "typescript";
                    else if (ext === "py") lang = "python";
                    else if (ext === "html") lang = "html";
                    else if (ext === "css") lang = "css";
                    else if (ext === "json") lang = "json";
                    
                    text += `### 📄 \`${f.name}\`\n\`\`\`${lang}\n${f.content || ""}\n\`\`\`\n\n`;
                }
                return text.trim();
            };

            const formattedResponse = formatCodeResponse(data.files, state.prompt);

            // Deduct credits (10 credits for coding)
            if (state.userId) {
                try {
                    await deductCredits(state.userId, "coding");
                } catch (creditError) {
                    console.error("[Coding Agent] Credit deduction failed:", creditError);
                }
            }

            // Return project with artifacts bundle
            return {
                ...state,
                aiResponse: formattedResponse,
                artifacts: [
                    {
                        id: Date.now(),
                        type: "Projects",
                        files: data.files,
                        title: state.prompt
                    }
                ]
            };
        }

        // 4. Code Explanation / Debugging / Optimization Branch
        const res = await llm.invoke(`
You are an expert software engineer.

Answer the user's coding query clearly and concisely using Markdown.

Requirements:
- Explain the solution clearly
- Use clean code examples where helpful
- Use proper Markdown
- Use syntax highlighting for code blocks
- If debugging, explain the cause and provide the corrected code
- If reviewing code, identify problems and suggest improvements
- If explaining a concept, provide examples

User Request:
${state.prompt}
`);

        // Deduct credits
        if (state.userId) {
            try {
                await deductCredits(state.userId, "coding");
            } catch (creditError) {
                console.error("[Coding Agent] Credit deduction failed:", creditError);
            }
        }

        return {
            ...state,
            aiResponse: res.content,
            artifacts: []
        };
    } catch (error) {
        console.error("[Coding Agent] Unexpected error:", error);
        return {
            ...state,
            aiResponse: "Something went wrong while processing your coding request. Please try again.",
            artifacts: []
        };
    }
};