import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getmodel } from "../config/llmModels.js";
import fs from "fs/promises";
import { existsSync } from "fs";
import { deductCredits } from "../utils/deductCredits.js";
import { checkAgentLimit } from "../config/agentLimit.js";

/**
 * ============================================================================
 * 4. IMAGE ANALYZER & OCR AGENT (Google Gemini 3.6 Flash)
 * ============================================================================
 * Responsibilities:
 * - Ingests uploaded image files (.png, .jpg, .webp).
 * - Converts image buffer into base64 payload for Gemini multimodal inspection.
 * - Performs OCR, diagram explanation, flowchart breakdown, and visual Q&A.
 * - Always cleans up temp files in `finally` block to prevent disk exhaustion.
 * - Rate limit: 5 req/min | Credit Cost: 10 credits
 * ============================================================================
 */

// Tunables — env-overridable, no redeploy needed to adjust limits.
const MAX_IMAGE_BYTES = Number(process.env.IMAGE_MAX_BYTES) || 8 * 1024 * 1024; // 8MB
const MAX_PROMPT_LENGTH = Number(process.env.IMAGE_MAX_PROMPT_LENGTH) || 4000;
const LLM_TIMEOUT_MS = Number(process.env.IMAGE_LLM_TIMEOUT_MS) || 45_000;

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
]);

/**
 * Extracts plain text from a LangChain response, which can be a string or
 * an array of content blocks (e.g. [{ type: "text", text: "..." }, ...]).
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
 * Best-effort temp file cleanup — never throws, just logs.
 */
const cleanupTempFile = async (filePath, logCtx) => {
    if (!filePath) return;
    try {
        if (existsSync(filePath)) {
            await fs.unlink(filePath);
        }
    } catch (unlinkError) {
        console.error("[Image Analyzer] Failed to delete temp file:", { ...logCtx, error: unlinkError.message });
    }
};

export const imageAnalyzer = async (state) => {
    const logCtx = { userId: state?.userId, conversationId: state?.conversationId };
    const filePath = state?.file?.path;

    try {
        // 1. Input Validation
        if (!filePath) {
            return {
                ...state,
                aiResponse: "No image file was provided. Please upload an image to analyze."
            };
        }
        if (!existsSync(filePath)) {
            console.error("[Image Analyzer] File path does not exist on disk.", { ...logCtx, filePath });
            return {
                ...state,
                aiResponse: "The uploaded image could not be found. Please try uploading it again."
            };
        }

        const mimetype = state.file.mimetype || "";
        if (!ALLOWED_MIME_TYPES.has(mimetype)) {
            return {
                ...state,
                aiResponse: `Unsupported image format${mimetype ? ` (${mimetype})` : ""}. Please upload a JPEG, PNG, WEBP, or GIF image.`
            };
        }

        const stats = await fs.stat(filePath);
        if (stats.size > MAX_IMAGE_BYTES) {
            return {
                ...state,
                aiResponse: `Image is too large (${(stats.size / (1024 * 1024)).toFixed(1)}MB). Please upload an image under ${(MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(0)}MB.`
            };
        }

        if (state.prompt && state.prompt.length > MAX_PROMPT_LENGTH) {
            return {
                ...state,
                aiResponse: `Your question is too long. Please shorten it to under ${MAX_PROMPT_LENGTH} characters.`
            };
        }

        // 2. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "image");

        // 3. Resolve LLM & Load Image (async, non-blocking)
        const llm = await getmodel("imageAnalyzer");
        const imageBuffer = await fs.readFile(filePath);
        const base64Image = imageBuffer.toString("base64");

        // 4. Multimodal Message Assembly
        const messages = [
            new SystemMessage(
                `You are Novamind image analyzer Agent.
Rules:
- Analyze only the uploaded image.
- Answer the user's question accurately.
- If text exists in the image, extract it.
- If charts or tables exist, explain them.
- If something is unclear, state it clearly.
- Use clean and helpful Markdown formatting.
- Do not hallucinate.`
            ),
            new HumanMessage({
                content: [
                    {
                        type: "text",
                        text: state.prompt || "Analyze this image and describe what you see in detail."
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${mimetype};base64,${base64Image}`
                        }
                    }
                ]
            })
        ];

        // 5. Multimodal Inference (with hard timeout)
        let response;
        try {
            response = await withTimeout(llm.invoke(messages), LLM_TIMEOUT_MS, "Image analysis LLM invocation");
        } catch (invokeError) {
            console.error("[Image Analyzer] LLM invocation failed:", { ...logCtx, error: invokeError.message });
            return {
                ...state,
                aiResponse: "I'm having trouble analyzing this image right now. Please try again in a moment."
            };
        }

        const responseText = extractText(response?.content);

        if (!responseText) {
            console.warn("[Image Analyzer] Empty response from LLM.", logCtx);
            return {
                ...state,
                aiResponse: "Sorry, I couldn't analyze this image. Please try again."
            };
        }

        // 6. Deduct Credits (response already generated — never discard it on billing failure)
        let creditDeductionFailed = false;
        if (state.userId) {
            try {
                await deductCredits(state.userId, "vision");
            } catch (creditError) {
                console.error("[Image Analyzer] Credit deduction failed after successful analysis:", {
                    ...logCtx,
                    error: creditError.message
                });
                creditDeductionFailed = true;
            }
        } else {
            console.error("[Image Analyzer] userId is missing. Credits were not deducted.", logCtx);
        }

        return {
            ...state,
            aiResponse: responseText,
            ...(creditDeductionFailed ? { creditDeductionFailed: true } : {})
        };
    } catch (error) {
        console.error("[Image Analyzer] Error:", { ...logCtx, error: error.message, stack: error.stack });

        const isRateLimit = /rate limit|too many requests/i.test(error.message ?? "");
        const userMessage = isRateLimit
            ? "You're sending image requests too quickly. Please wait a moment and try again."
            : "Something went wrong while analyzing your image. Please try again shortly.";

        return {
            ...state,
            aiResponse: `# ❌ Image Analysis Failed\n\n${userMessage}`
        };
    } finally {
        // 7. Cleanup temp file from disk (always, regardless of outcome)
        await cleanupTempFile(filePath, logCtx);
    }
};