import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getmodel } from "../config/llmModels.js";
import fs from "fs";
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
export const imageAnalyzer = async (state) => {
    try {
        // 1. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "image");

        const llm = await getmodel("imageAnalyzer");
        const imageBuffer = fs.readFileSync(state.file.path);
        const base64Image = imageBuffer.toString("base64");

        // 2. Multimodal Message Assembly
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
                            url: `data:${state.file.mimetype || "image/jpeg"};base64,${base64Image}`
                        }
                    }
                ]
            })
        ];

        // 3. Multimodal Inference
        const response = await llm.invoke(messages);

        // 4. Deduct Credits
        if (state.userId) {
            try {
                await deductCredits(state.userId, "vision");
            } catch (creditError) {
                console.error("[Image Analyzer] Credit deduction failed:", creditError);
            }
        }

        return {
            ...state,
            aiResponse: response.content
        };
    } catch (error) {
        console.error("[Image Analyzer] Error:", error);
        return {
            ...state,
            aiResponse: `# ❌ Image Analysis Failed\n\n${error.message}`
        };
    } finally {
        // 5. Cleanup temp file from disk
        if (state.file?.path && fs.existsSync(state.file.path)) {
            try {
                fs.unlinkSync(state.file.path);
            } catch (unlinkError) {
                console.error("[Image Analyzer] Failed to delete temp file:", unlinkError);
            }
        }
    }
};