import { getmodel } from "../config/llmModels.js";
import axios from "axios";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getMemory } from "../config/memory.js";
import { checkAgentLimit } from "../config/agentLimit.js";

/**
 * ============================================================================
 * 8. VISION / AI IMAGE GENERATION AGENT (Groq + Pollinations + AWS S3)
 * ============================================================================
 * Responsibilities:
 * - Enhances user requests into high-detail photorealistic image prompts.
 * - Synthesizes the image via Pollinations AI.
 * - Uploads the generated PNG to AWS S3.
 * - Returns markdown with inline image preview and presigned download link.
 * - Rate limit: 5 req/min | Credit Cost: 10 credits
 * ============================================================================
 */
export const visionAgent = async (state) => {
    try {
        // 1. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "vision");

        const llm = await getmodel("image");
        const history = await getMemory(state.conversationId);

        let contextText = "";
        if (history && history.length > 0) {
            const recent = history.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n");
            contextText = `Recent Conversation Context:\n${recent}\n\n`;
        }

        // 2. Refine Prompt into 8K Ultra-Realistic Image Prompt
        const res = await llm.invoke(`
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
`);

        const prompt = res.content.trim();

        // 3. Generate Image via Pollinations AI
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
        const imageRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
        const buffer = Buffer.from(imageRes.data);

        // 4. Upload Image to AWS S3
        const filename = `image-${Date.now()}.png`;
        await uploadToS3(filename, buffer, "image/png");

        // 5. Generate 24-Hour Presigned Download URL
        const downloadUrl = await getFromS3(filename, 24 * 60);

        // 6. Deduct Credits (10 credits)
        if (state.userId) {
            try {
                await deductCredits(state.userId, "vision");
            } catch (creditError) {
                console.error("[Vision Agent] Credit deduction failed:", creditError);
            }
        }

        // 7. Return Response with Image Preview and Download Link
        return {
            ...state,
            aiResponse: `
![Generated Image](${downloadUrl})

📩 [Download image](${downloadUrl})
*Link expires in 24 hours.*
`
        };
    } catch (error) {
        return {
            ...state,
            aiResponse: `# ❌ Error in Vision Agent image generation\n${error.message}`
        };
    }
};