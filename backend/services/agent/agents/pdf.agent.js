import { getmodel } from "../config/llmModels.js";
import { generatePdf } from "../utils/generatePdf.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getMemory } from "../config/memory.js";
import { checkAgentLimit } from "../config/agentLimit.js";

/**
 * ============================================================================
 * 5. PDF GENERATION AGENT (Groq + PDFKit + AWS S3)
 * ============================================================================
 * Responsibilities:
 * - Generates structured document JSON from natural language requests.
 * - Streams structured data into PDFKit to compile a styled A4 PDF document.
 * - Uploads the PDF to AWS S3 and returns a 24-hour presigned download link.
 * - Rate limit: 5 req/min | Credit Cost: 10 credits
 * ============================================================================
 */
export const pdfAgent = async (state) => {
    try {
        // 1. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "pdf");

        const llm = await getmodel("pdf");
        const history = await getMemory(state.conversationId);

        let contextText = "";
        if (history && history.length > 0) {
            const recent = history.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n");
            contextText = `
Recent Conversation Context:
${recent}

(If the User Request refers to previous topics, e.g., "create a pdf on this", generate the PDF about that subject.)
`;
        }

        // 2. Synthesize Structured Document JSON via LLM
        const prompt = `
You are an expert document writer.

Return ONLY valid JSON.
Do NOT return markdown.
Do NOT return code fences.
Do NOT return any text outside JSON.

Structure:

{
    "title": "",
    "subtitle": "",
    "sections": [
        {
            "heading": "",
            "points": []
        }
    ]
}

Requirements:
- Generate 4-8 sections.
- Each section should contain 3-5 concise bullet points.
- Make the content informative and well structured.
- Keep the language professional.
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
            console.error("[PDF Agent] JSON parse failed:", jsonError);
            return {
                ...state,
                aiResponse: "# ❌ PDF Generation Failed\n\nThe AI returned invalid document data. Please try again."
            };
        }

        // 4. Compile PDF Buffer with PDFKit
        const pdfBuffer = await generatePdf(data);
        if (!pdfBuffer) {
            throw new Error("PDF buffer was not generated.");
        }

        // 5. Upload PDF to AWS S3
        const filename = `pdf-${Date.now()}.pdf`;
        await uploadToS3(filename, pdfBuffer, "application/pdf");

        // 6. Generate 24-Hour Presigned Download URL
        const downloadUrl = await getFromS3(filename, 24 * 60 * 60);
        if (!downloadUrl) {
            throw new Error("Failed to generate PDF download URL.");
        }

        // 7. Deduct Credits (10 credits)
        if (state.userId) {
            try {
                await deductCredits(state.userId, "pdf");
            } catch (creditError) {
                console.error("[PDF Agent] Credit deduction failed:", creditError);
            }
        }

        // 8. Return Response with Download Link
        return {
            ...state,
            aiResponse: `# ✅ PDF Generated Successfully

**${data.title}**

📩 [Download PDF](${downloadUrl})

*Link expires in 24 hours.*`
        };
    } catch (error) {
        console.error("[PDF Agent] Error:", error);
        return {
            ...state,
            aiResponse: `# ❌ Error in PDF Agent\n\n${error.message}`
        };
    }
};