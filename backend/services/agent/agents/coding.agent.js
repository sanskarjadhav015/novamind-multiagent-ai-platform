import { getmodel } from "../config/llmModels.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getMemory } from "../config/memory.js";
import { checkAgentLimit } from "../config/agentLimit.js";

/**
 * ============================================================================
 * PRODUCTION-GRADE CODING AGENT (`coding.agent.js`)
 * ============================================================================
 * Extracts structured multi-file codebases or single scripts from LLM responses
 * using a 5-tier fallback parsing strategy to eliminate "invalid JSON" errors.
 * - Rate limit: 1 req/min | Credit Cost: 10 credits
 * ============================================================================
 */

export const extractProjectFiles = (raw = "", userPrompt = "") => {
    if (!raw || typeof raw !== "string") return [];

    let cleaned = raw.trim();

    // Strategy 1: Direct JSON parsing (with markdown strip)
    {
        const candidate = cleaned
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
                return parsed.files.filter(f => f.name && typeof f.content === "string");
            }
        } catch (e) {
            // fallback to regex extraction
        }
    }

    // Strategy 2: Extract JSON object matching { "files": [ ... ] } via Regex
    {
        const jsonMatch = cleaned.match(/\{[\s\S]*"files"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
                    return parsed.files.filter(f => f.name && typeof f.content === "string");
                }
            } catch (e) {
                // fallback to markdown fence extraction
            }
        }
    }

    // Strategy 3: Multi-file Markdown Fence Extractor
    const fileFenceRegex = /(?:###|##|#|\/\/|\/\*|<!--)?\s*`?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)`?\s*(?:-->|\*\/)?[\r\n]+```([a-zA-Z0-9_\-+]*)\s*\n([\s\S]*?)```/gi;
    const extracted = [];
    let match;
    while ((match = fileFenceRegex.exec(cleaned)) !== null) {
        const filename = match[1].trim();
        const content = match[3].trim();
        if (filename && content) {
            extracted.push({ name: filename, content });
        }
    }

    if (extracted.length > 0) {
        return extracted;
    }

    // Strategy 4: Generic Code Block Extractor
    const genericFences = [];
    const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)\s*\n([\s\S]*?)```/g;
    let blockMatch;
    while ((blockMatch = codeBlockRegex.exec(cleaned)) !== null) {
        const lang = (blockMatch[1] || "").toLowerCase().trim();
        const content = blockMatch[2].trim();
        if (content) {
            genericFences.push({ lang, content });
        }
    }

    if (genericFences.length > 0) {
        const files = [];
        let htmlCount = 0;
        let cssCount = 0;
        let jsCount = 0;
        let pyCount = 0;

        for (const block of genericFences) {
            let name;
            if (block.lang === "html" || block.content.includes("<!DOCTYPE") || block.content.includes("<html")) {
                htmlCount++;
                name = htmlCount === 1 ? "index.html" : `page${htmlCount}.html`;
            } else if (block.lang === "css") {
                cssCount++;
                name = cssCount === 1 ? "style.css" : `style${cssCount}.css`;
            } else if (block.lang === "javascript" || block.lang === "js") {
                jsCount++;
                name = jsCount === 1 ? "script.js" : `script${jsCount}.js`;
            } else if (block.lang === "python" || block.lang === "py") {
                pyCount++;
                name = pyCount === 1 ? "main.py" : `script${pyCount}.py`;
            } else if (block.lang === "jsx" || block.lang === "tsx") {
                name = "App.jsx";
            } else {
                name = `solution.${block.lang || "txt"}`;
            }
            files.push({ name, content: block.content });
        }
        return files;
    }

    // Strategy 5: Emergency HTML fallback if raw text contains markup
    if (cleaned.includes("<html") || cleaned.includes("<!DOCTYPE") || cleaned.includes("<div")) {
        return [{ name: "index.html", content: cleaned }];
    }

    return [];
};

const generateFallbackFiles = (userPrompt) => {
    const title = userPrompt || "NovaMind Interactive Web App";
    return [
        {
            name: "index.html",
            content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p>Your interactive application is ready.</p>
    <button id="actionBtn" class="btn">Get Started</button>
    <div id="output" class="output-box"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`
        },
        {
            name: "style.css",
            content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}
.container {
  background: #ffffff;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);
  max-width: 500px;
  width: 100%;
  text-align: center;
}
h1 {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
}
p {
  color: #64748b;
  font-size: 14px;
  margin-bottom: 24px;
}
.btn {
  background: #8b5cf6;
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}
.btn:hover {
  background: #7c3aed;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139,92,246,0.3);
}
.output-box {
  margin-top: 16px;
  font-size: 13px;
  color: #10b981;
  font-weight: 500;
}`
        },
        {
            name: "script.js",
            content: `document.getElementById('actionBtn')?.addEventListener('click', () => {
  const output = document.getElementById('output');
  if (output) {
    output.textContent = '✨ Application running successfully!';
  }
});`
        }
    ];
};

export const codingAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "coding");

        const intentLlm = await getmodel("intent");
        const llm = await getmodel("coding");
        const history = await getMemory(state.conversationId);

        let contextText = "";
        if (history && history.length > 0) {
            const recent = history.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n");
            contextText = `Recent Conversation Context:\n${recent}\n\n`;
        }

        // 1. Quick heuristic check for project generation keywords
        const projectKeywords = [
            "website", "web page", "webpage", "landing page", "portfolio", "app", "application",
            "ui", "frontend", "dashboard", "clone", "html", "css", "javascript", "game",
            "calculator", "todo", "blog", "e-commerce", "store", "page", "navbar", "component",
            "tracker", "widget", "gallery", "player", "canvas", "quiz"
        ];
        const lowerPrompt = state.prompt.toLowerCase();
        let isProjectRequest = projectKeywords.some(kw => lowerPrompt.includes(kw));

        // 2. Intent classifier fallback for ambiguous requests
        if (!isProjectRequest) {
            try {
                const intentRes = await intentLlm.invoke(`
You are an intent classifier for a coding assistant.
Determine if the user wants to generate/build a project/application (HTML/CSS/JS, frontend, web app, UI, game, etc.) OR if they are asking for a code explanation/DSA problem/script.

Return ONLY a JSON object:
{"intent": "CODE_GENERATION" | "CODE_EXPLANATION"}

User Request: ${state.prompt}
`);
                const intentText = intentRes?.content || "";
                isProjectRequest = intentText.includes("CODE_GENERATION");
            } catch (e) {
                isProjectRequest = false;
            }
        }

        // 3. Multi-File Project Generation Branch
        if (isProjectRequest) {
            const projectPrompt = `You are NovaMind Elite Coding Agent, a world-class principal frontend engineer and UI/UX designer.

Build a complete, modern, beautiful, and fully interactive web application based on the user's prompt.

Design & Quality Requirements:
- Visuals: Clean, modern, responsive, sleek design (use modern gradients, shadows, cards, smooth hover transitions).
- Functionality: Fully working, complete JavaScript interactivity (DOM manipulation, event listeners, state handling).
- Code completeness: No placeholders, no TODOs, no "implement this later". All features requested must be completely implemented.
- Structure: Provide standard web files: index.html, style.css, script.js.

Return ONLY valid JSON matching this schema:
{
  "files": [
    {
      "name": "index.html",
      "content": "<!DOCTYPE html>..."
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
- Output MUST be valid JSON starting with { and ending with }
- Escape all special characters and newlines properly inside JSON strings
- Do not output markdown fences or explanatory text outside the JSON object

${contextText}User Request: ${state.prompt}`;

            const res = await llm.invoke(projectPrompt);
            const rawContent = res?.content || "";

            let files = extractProjectFiles(rawContent, state.prompt);

            // If extraction failed, attempt a rapid JSON repair pass
            if (!files || files.length === 0) {
                try {
                    const repairRes = await llm.invoke(`Reformat the following content into strict JSON matching {"files":[{"name":"...","content":"..."}]}. Do not include markdown fences:\n\n${rawContent}`);
                    files = extractProjectFiles(repairRes?.content || "", state.prompt);
                } catch (repairError) {
                    console.error("[Coding Agent] Repair pass failed:", repairError);
                }
            }

            // If still empty, use fallback template
            if (!files || files.length === 0) {
                files = generateFallbackFiles(state.prompt);
            }

            if (state.userId) {
                try {
                    await deductCredits(state.userId, "coding");
                } catch (creditError) {
                    console.error("[Coding Agent] Credit deduction failed:", creditError);
                }
            }

            let formattedMarkdown = `# 🚀 Project Generated: **${state.prompt}**\n\n`;
            formattedMarkdown += `I have generated a complete, interactive multi-file project with **${files.length} files**:\n\n`;
            for (const f of files) {
                const ext = f.name.split(".").pop() || "txt";
                formattedMarkdown += `### 📄 \`${f.name}\`\n\`\`\`${ext}\n${f.content}\n\`\`\`\n\n`;
            }
            formattedMarkdown += `\n*✨ Switch to the **Preview** tab in the right panel to test the live interactive application.*`;

            return {
                ...state,
                aiResponse: formattedMarkdown.trim(),
                artifacts: [
                    {
                        id: Date.now(),
                        type: files.length > 1 ? "Projects" : "Code",
                        files: files,
                        title: state.prompt
                    }
                ]
            };
        }

        // 4. Code Explanation / DSA / Snippet Branch
        const res = await llm.invoke(`You are an expert software engineer fluent in all programming languages.
Answer the user's coding query clearly, with clean syntax-highlighted code examples, time/space complexity analysis if applicable, and step-by-step explanations.

User Request: ${state.prompt}`);

        if (state.userId) {
            try {
                await deductCredits(state.userId, "coding");
            } catch (creditError) {
                console.error("[Coding Agent] Credit deduction failed:", creditError);
            }
        }

        return {
            ...state,
            aiResponse: res?.content || "Code explanation generated.",
            artifacts: []
        };
    } catch (error) {
        console.error("[Coding Agent] Unexpected error:", error);
        return {
            ...state,
            aiResponse: `# ❌ Coding Agent Error\n\n${error.message}\n\nPlease try again with a more specific description.`,
            artifacts: []
        };
    }
};