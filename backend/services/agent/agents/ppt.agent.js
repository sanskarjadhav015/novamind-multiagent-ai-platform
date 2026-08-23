import { getmodel } from "../config/llmModels.js";
import { generatePpt } from "../utils/generatePpt.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getMemory } from "../config/memory.js";
import { checkAgentLimit } from "../config/agentLimit.js";

/**
 * ============================================================================
 * 7. PRESENTATION (PPTX) GENERATION AGENT (Groq + PptxGenJS + AWS S3)
 * ============================================================================
 * Responsibilities:
 * - Generates structured presentation JSON (7-10 slides with bullet points).
 * - Calls `generatePpt` to assemble widescreen slides with styled cards.
 * - Uploads the .pptx presentation to AWS S3 and returns a 24-hour download link.
 * - Rate limit: 5 req/min | Credit Cost: 10 credits
 * ============================================================================
 */
export const pptAgent = async (state) => {
    try {
        // 1. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "ppt");

        const llm = await getmodel("ppt");
        const history = await getMemory(state.conversationId);

        let contextText = "";
        if (history && history.length > 0) {
            const recent = history.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n");
            contextText = `
Recent Conversation Context:
${recent}

(If the User Request refers to previous topics, e.g., "create a ppt on this", generate the presentation on that subject.)
`;
        }

        // 2. Synthesize Structured Presentation JSON via LLM
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

        const res = await llm.invoke(prompt);

        // 3. Parse JSON Output
        let data;
        try {
            const raw = (res.content ?? "")
                .trim()
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/```\s*$/i, "")
                .trim();

            data = JSON.parse(raw);
        } catch (jsonError) {
            console.error("[PPT Agent] JSON parse failed:", jsonError);
            return {
                ...state,
                aiResponse: "# ❌ Presentation Generation Failed\n\nThe AI returned invalid presentation data. Please try again."
            };
        }

        // 4. Generate PPTX Buffer
        const ppt = await generatePpt(data);
        if (!ppt) {
            throw new Error("Presentation was not generated.");
        }

        const buffer = await ppt.write({
            outputType: "nodebuffer"
        });

        if (!buffer) {
            throw new Error("Failed to create presentation buffer.");
        }

        // 5. Upload PPTX to AWS S3
        const filename = `ppt-${Date.now()}.pptx`;
        await uploadToS3(
            filename,
            buffer,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        );

        // 6. Generate 24-Hour Presigned Download URL
        const downloadUrl = await getFromS3(filename, 24 * 60 * 60);
        if (!downloadUrl) {
            throw new Error("Failed to generate presentation download URL.");
        }

        // 7. Deduct Credits (10 credits)
        if (state.userId) {
            try {
                await deductCredits(state.userId, "ppt");
            } catch (creditError) {
                console.error("[PPT Agent] Credit deduction failed:", creditError);
            }
        }

        // 8. Return Response with Download Link
        return {
            ...state,
            aiResponse: `# 📊 Presentation Generated Successfully

**${data.title}**

📩 [Download PPT](${downloadUrl})

*Link expires in 24 hours.*`
        };
    } catch (error) {
        console.error("[PPT Agent] Error:", error);
        return {
            ...state,
            aiResponse: `# ❌ Error in PPT Agent\n\n${error.message}`
        };
    }
};