import { randomUUID } from "crypto";
import axios from "axios";
import { getmodel } from "../config/llmModels.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getMemory } from "../config/memory.js";
import { checkAgentLimit } from "../config/agentLimit.js";

/**
 * ============================================================================
 * 8. VISION / AI IMAGE GENERATION AGENT (Groq / Gemini + Pollinations + AWS S3)
 * ============================================================================
 * Responsibilities:
 * - Enhances user requests into high-detail photorealistic image prompts.
 * - Synthesizes the image via Pollinations AI.
 * - Uploads the generated PNG to AWS S3.
 * - Returns markdown with inline image preview and presigned download link.
 * - Rate limit: 5 req/min | Credit Cost: 10 credits
 * ============================================================================
 */

// Tunables — env-overridable, no redeploy needed to adjust limits.
const MAX_PROMPT_LENGTH = Number(process.env.VISION_MAX_PROMPT_LENGTH) || 2000;
// Pollinations builds the image prompt into a URL — cap the refined prompt so
// the request URL doesn't hit server/proxy URL-length limits.
const MAX_REFINED_PROMPT_LENGTH = Number(process.env.VISION_MAX_REFINED_PROMPT_LENGTH) || 1500;
const MAX_IMAGE_BYTES = Number(process.env.VISION_MAX_IMAGE_BYTES) || 15 * 1024 * 1024; // 15MB
const LLM_TIMEOUT_MS = Number(process.env.VISION_LLM_TIMEOUT_MS) || 30_000;
const IMAGE_GEN_TIMEOUT_MS = Number(process.env.VISION_IMAGE_GEN_TIMEOUT_MS) || 60_000;
const S3_UPLOAD_TIMEOUT_MS = Number(process.env.VISION_S3_TIMEOUT_MS) || 30_000;
const PRESIGNED_URL_TTL_SECONDS = 24 * 60 * 60; // 24 hours, in seconds

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

export const visionAgent = async (state) => {
    const logCtx = { userId: state?.userId, conversationId: state?.conversationId };

    try {
        // 1. Input Validation
        if (!state?.prompt || typeof state.prompt !== "string" || !state.prompt.trim()) {
            return {
                ...state,
                aiResponse: "Please describe the image you'd like me to generate."
            };
        }
        if (state.prompt.length > MAX_PROMPT_LENGTH) {
            return {
                ...state,
                aiResponse: `Your prompt is too long. Please shorten it to under ${MAX_PROMPT_LENGTH} characters.`
            };
        }

        // 2. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "vision");

        // 3. Resolve LLM & Fetch Recent Conversation Context
        const llm = await getmodel("image");
        const history = await getMemory(state.conversationId);

        let contextText = "";
        if (history && history.length > 0) {
            const recent = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join("\n");
            contextText = `Recent Conversation Context:\n${recent}\n\n`;
        }

        // 4. Refine Prompt into an Ultra-Realistic Image Prompt
        let res;
        try {
            res = await withTimeout(
                llm.invoke(`
You are an elite AI image prompt engineer.
Convert the user request into a detailed image generation prompt.

Requirements:
- Cinematic lighting
- Professional composition
- Ultra-realistic details
- High detail textures
- High resolution
- Realistic shadows and reflections
- Accurate color grading
- Depth of field effects
- Dynamic range optimization
- Stunning visual storytelling

Return only the image prompt.

${contextText}User Request: ${state.prompt}
`),
                LLM_TIMEOUT_MS,
                "Image prompt refinement"
            );
        } catch (invokeError) {
            console.error("[Vision Agent] Prompt refinement failed:", { ...logCtx, error: invokeError.message });
            return {
                ...state,
                aiResponse: "I'm having trouble preparing this image right now. Please try again in a moment."
            };
        }

        let refinedPrompt = extractText(res?.content);
        if (!refinedPrompt) {
            // Fall back to the raw user prompt rather than failing outright.
            refinedPrompt = state.prompt;
        }
        if (refinedPrompt.length > MAX_REFINED_PROMPT_LENGTH) {
            refinedPrompt = refinedPrompt.slice(0, MAX_REFINED_PROMPT_LENGTH);
        }

        // 5. Generate Image via Pollinations AI (timeout + size cap)
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(refinedPrompt)}`;
        let buffer;
        try {
            const imageRes = await axios.get(imageUrl, {
                responseType: "arraybuffer",
                timeout: IMAGE_GEN_TIMEOUT_MS,
                maxContentLength: MAX_IMAGE_BYTES,
                maxBodyLength: MAX_IMAGE_BYTES,
                validateStatus: (status) => status === 200
            });

            const contentType = imageRes.headers?.["content-type"] || "";
            if (!contentType.startsWith("image/")) {
                throw new Error(`Unexpected content-type from image provider: ${contentType || "unknown"}`);
            }

            buffer = Buffer.from(imageRes.data);
            if (!buffer.length) {
                throw new Error("Image provider returned an empty response.");
            }
        } catch (genError) {
            console.error("[Vision Agent] Image generation failed:", { ...logCtx, error: genError.message });
            return {
                ...state,
                aiResponse: "I couldn't generate an image right now. Please try again in a moment."
            };
        }

        // 6. Upload Image to AWS S3 (collision-safe, non-enumerable filename)
        const filename = `image-${state.userId ?? "anon"}-${Date.now()}-${randomUUID()}.png`;
        let downloadUrl;
        try {
            await withTimeout(uploadToS3(filename, buffer, "image/png"), S3_UPLOAD_TIMEOUT_MS, "S3 upload");
            // NOTE: original code passed `24 * 60` (24 minutes) here while telling
            // the user "expires in 24 hours" — fixed to the true 24-hour TTL below.
            downloadUrl = await withTimeout(
                getFromS3(filename, PRESIGNED_URL_TTL_SECONDS),
                S3_UPLOAD_TIMEOUT_MS,
                "Presigned URL generation"
            );
            if (!downloadUrl) {
                throw new Error("Failed to generate image download URL.");
            }
        } catch (storageError) {
            console.error("[Vision Agent] Storage step failed:", { ...logCtx, filename, error: storageError.message });
            return {
                ...state,
                aiResponse: "# ❌ Image Generation Failed\n\nThe image was created but couldn't be saved. Please try again."
            };
        }

        // 7. Deduct Credits (image already generated & stored — never discard the result on billing failure)
        let creditDeductionFailed = false;
        if (state.userId) {
            try {
                await deductCredits(state.userId, "vision");
            } catch (creditError) {
                console.error("[Vision Agent] Credit deduction failed after successful generation:", {
                    ...logCtx,
                    error: creditError.message
                });
                creditDeductionFailed = true;
            }
        } else {
            console.error("[Vision Agent] userId is missing. Credits were not deducted.", logCtx);
        }

        // 8. Return Response with Image Preview and Download Link
        return {
            ...state,
            aiResponse: `
![Generated Image](${downloadUrl})

📩 [Download image](${downloadUrl})
*Link expires in 24 hours.*
`,
            ...(creditDeductionFailed ? { creditDeductionFailed: true } : {})
        };
    } catch (error) {
        console.error("[Vision Agent] Error:", { ...logCtx, error: error.message, stack: error.stack });

        const isRateLimit = /rate limit|too many requests/i.test(error.message ?? "");
        const userMessage = isRateLimit
            ? "You're generating images too quickly. Please wait a moment and try again."
            : "Something went wrong while generating your image. Please try again shortly.";

        return {
            ...state,
            aiResponse: `# ❌ Error in Vision Agent image generation\n\n${userMessage}`
        };
    }
};