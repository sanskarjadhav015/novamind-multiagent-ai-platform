import { randomUUID } from "crypto";
import { getmodel } from "../config/llmModels.js";
import { generatePpt } from "../utils/generatePpt.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getMemory } from "../config/memory.js";
import { checkAgentLimit } from "../config/agentLimit.js";

/**
 * ============================================================================
 * 7. PRESENTATION (PPTX) GENERATION AGENT (Groq / Gemini + PptxGenJS + AWS S3)
 * ============================================================================
 * Responsibilities:
 * - Generates structured presentation JSON (7-10 slides with bullet points).
 * - Calls `generatePpt` to assemble widescreen slides with styled cards.
 * - Uploads the .pptx presentation to AWS S3 and returns a 24-hour download link.
 * - Rate limit: 1 req/min | Credit Cost: 10 credits
 * ============================================================================
 */

// Tunables — env-overridable, no redeploy needed to adjust limits.
const MAX_PROMPT_LENGTH = Number(process.env.PPT_MAX_PROMPT_LENGTH) || 4000;
const LLM_TIMEOUT_MS = Number(process.env.PPT_LLM_TIMEOUT_MS) || 45_000;
const PPT_GENERATION_TIMEOUT_MS = Number(process.env.PPT_GENERATION_TIMEOUT_MS) || 20_000;
const PPT_WRITE_TIMEOUT_MS = Number(process.env.PPT_WRITE_TIMEOUT_MS) || 15_000;
const S3_UPLOAD_TIMEOUT_MS = Number(process.env.PPT_S3_TIMEOUT_MS) || 30_000;
const PRESIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

/**
 * Extracts plain text from a LangChain response, which can be a string or
 * an array of content blocks.
 */
const extractText = (content) => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .map((block) => (typeof block === "string" ? block : block?.text ?? ""))
            .filter(Boolean)
            .join("\n")
            .trim();
    }
    return "";
};

/**
 * Wraps a promise with a hard timeout so a hung call can't stall the request.
 */
const withTimeout = (promise, ms, label) =>
    Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        )
    ]);

/**
 * Pulls the JSON object out of a raw LLM response, tolerating code fences
 * or stray text the model may still emit despite instructions not to.
 */
const extractJsonPayload = (raw) => {
    let text = raw.trim();

    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        text = text.slice(firstBrace, lastBrace + 1);
    }

    return JSON.parse(text);
};

/**
 * Validates the presentation JSON has the shape generatePpt expects, so a
 * malformed LLM output fails with a clear message instead of crashing (or
 * silently producing a broken deck) deep inside PptxGenJS.
 */
const validatePresentationShape = (data) => {
    if (!data || typeof data !== "object") return "Presentation data is not an object.";
    if (typeof data.title !== "string" || !data.title.trim()) return "Missing or invalid presentation title.";
    if (!Array.isArray(data.slides) || data.slides.length === 0) return "Missing or empty slide list.";

    for (const [i, slide] of data.slides.entries()) {
        if (!slide || typeof slide !== "object") return `Slide ${i} is not an object.`;
        if (typeof slide.title !== "string" || !slide.title.trim()) return `Slide ${i} is missing a title.`;
        if (!Array.isArray(slide.points) || slide.points.length === 0) return `Slide ${i} has no points.`;
        if (!slide.points.every((p) => typeof p === "string")) return `Slide ${i} has non-string points.`;
    }

    return null; // valid
};

export const pptAgent = async (state) => {
    const logCtx = { userId: state?.userId, conversationId: state?.conversationId };

    try {
        // 1. Input Validation
        if (!state?.prompt || typeof state.prompt !== "string" || !state.prompt.trim()) {
            return {
                ...state,
                aiResponse: "Please describe what you'd like the presentation to be about."
            };
        }
        if (state.prompt.length > MAX_PROMPT_LENGTH) {
            return {
                ...state,
                aiResponse: `Your request is too long. Please shorten it to under ${MAX_PROMPT_LENGTH} characters.`
            };
        }

        // 2. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "ppt");

        // 3. Resolve LLM & Fetch Recent Conversation Context
        const llm = await getmodel("ppt");
        const history = await getMemory(state.conversationId);

        let contextText = "";
        if (history && history.length > 0) {
            const recent = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join("\n");
            contextText = `
Recent Conversation Context:
${recent}

(If the User Request refers to previous topics, e.g., "create a ppt on this", generate the presentation on that subject.)
`;
        }

        // 4. Synthesize Structured Presentation JSON via LLM
        const prompt = `
You are a Professional Presentation Designer.

Return ONLY valid JSON.

Format:

{
    "title": "Presentation Title",
    "subtitle": "Subtitle or Overview",
    "slides": [
        {
            "title": "Slide Title",
            "points": [
                "Point 1",
                "Point 2",
                "Point 3"
            ]
        }
    ]
}

Rules:
- Generate exactly 7-10 slides.
- Each slide should have 3-5 concise bullet points.
- No markdown.
- No explanation.
- No code block.
- Return ONLY JSON.
- Make the presentation professional and informative.
- Ensure the JSON is valid.

${contextText}

User Request:
${state.prompt}
`;

        let res;
        try {
            res = await withTimeout(llm.invoke(prompt), LLM_TIMEOUT_MS, "Presentation content generation");
        } catch (invokeError) {
            console.error("[PPT Agent] LLM invocation failed:", { ...logCtx, error: invokeError.message });
            return {
                ...state,
                aiResponse: "I'm having trouble drafting this presentation right now. Please try again in a moment."
            };
        }

        const rawText = extractText(res?.content);
        if (!rawText) {
            console.warn("[PPT Agent] Empty response from LLM.", logCtx);
            return {
                ...state,
                aiResponse: "# ❌ Presentation Generation Failed\n\nThe AI didn't return any content. Please try again."
            };
        }

        // 5. Parse & Validate JSON Output
        let data;
        try {
            data = extractJsonPayload(rawText);
        } catch (jsonError) {
            console.error("[PPT Agent] JSON parse failed:", { ...logCtx, error: jsonError.message });
            return {
                ...state,
                aiResponse: "# ❌ Presentation Generation Failed\n\nThe AI returned invalid presentation data. Please try again."
            };
        }

        const shapeError = validatePresentationShape(data);
        if (shapeError) {
            console.error("[PPT Agent] Presentation shape invalid:", { ...logCtx, shapeError });
            return {
                ...state,
                aiResponse: "# ❌ Presentation Generation Failed\n\nThe AI returned an incomplete presentation. Please try again."
            };
        }

        // 6. Generate PPTX Buffer
        let ppt;
        try {
            ppt = await withTimeout(generatePpt(data), PPT_GENERATION_TIMEOUT_MS, "Presentation assembly");
        } catch (genError) {
            console.error("[PPT Agent] Presentation assembly failed:", { ...logCtx, error: genError.message });
            return {
                ...state,
                aiResponse: "# ❌ Presentation Generation Failed\n\nWe couldn't assemble the presentation. Please try again."
            };
        }
        if (!ppt) {
            console.error("[PPT Agent] generatePpt returned no presentation object.", logCtx);
            return {
                ...state,
                aiResponse: "# ❌ Presentation Generation Failed\n\nWe couldn't assemble the presentation. Please try again."
            };
        }

        let buffer;
        try {
            buffer = await withTimeout(
                ppt.write({ outputType: "nodebuffer" }),
                PPT_WRITE_TIMEOUT_MS,
                "Presentation buffer write"
            );
        } catch (writeError) {
            console.error("[PPT Agent] Buffer write failed:", { ...logCtx, error: writeError.message });
            return {
                ...state,
                aiResponse: "# ❌ Presentation Generation Failed\n\nWe couldn't finalize the presentation file. Please try again."
            };
        }
        if (!buffer) {
            console.error("[PPT Agent] write() returned no buffer.", logCtx);
            return {
                ...state,
                aiResponse: "# ❌ Presentation Generation Failed\n\nWe couldn't finalize the presentation file. Please try again."
            };
        }

        // 7. Upload PPTX to AWS S3 (collision-safe, non-enumerable filename)
        const filename = `ppt-${state.userId ?? "anon"}-${Date.now()}-${randomUUID()}.pptx`;
        let downloadUrl;
        try {
            await withTimeout(
                uploadToS3(
                    filename,
                    buffer,
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                ),
                S3_UPLOAD_TIMEOUT_MS,
                "S3 upload"
            );
            downloadUrl = await withTimeout(
                getFromS3(filename, PRESIGNED_URL_TTL_SECONDS),
                S3_UPLOAD_TIMEOUT_MS,
                "Presigned URL generation"
            );
            if (!downloadUrl) {
                throw new Error("Failed to generate presentation download URL.");
            }
        } catch (storageError) {
            console.error("[PPT Agent] Storage step failed:", { ...logCtx, filename, error: storageError.message });
            return {
                ...state,
                aiResponse: "# ❌ Presentation Generation Failed\n\nThe presentation was created but couldn't be saved. Please try again."
            };
        }

        // 8. Deduct Credits (presentation already generated & stored — never discard the result on billing failure)
        let creditDeductionFailed = false;
        if (state.userId) {
            try {
                await deductCredits(state.userId, "ppt");
            } catch (creditError) {
                console.error("[PPT Agent] Credit deduction failed after successful generation:", {
                    ...logCtx,
                    error: creditError.message
                });
                creditDeductionFailed = true;
            }
        } else {
            console.error("[PPT Agent] userId is missing. Credits were not deducted.", logCtx);
        }

        // 9. Return Response with Download Link
        return {
            ...state,
            aiResponse: `# 📊 Presentation Generated Successfully

**${data.title}**

📩 [Download PPT](${downloadUrl})

*Link expires in 24 hours.*`,
            ...(creditDeductionFailed ? { creditDeductionFailed: true } : {})
        };
    } catch (error) {
        console.error("[PPT Agent] Error:", { ...logCtx, error: error.message, stack: error.stack });

        const isRateLimit = /rate limit|too many requests/i.test(error.message ?? "");
        const userMessage = isRateLimit
            ? "You're generating presentations too quickly. Please wait a moment and try again."
            : "Something went wrong while generating your presentation. Please try again shortly.";

        return {
            ...state,
            aiResponse: `# ❌ Error in PPT Agent\n\n${userMessage}`
        };
    }
};