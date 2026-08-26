import { randomUUID } from "crypto";
import { getmodel } from "../config/llmModels.js";
import { generatePdf } from "../utils/generatePdf.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getMemory } from "../config/memory.js";
import { checkAgentLimit } from "../config/agentLimit.js";

/**
 * ============================================================================
 * 5. PDF GENERATION AGENT (Groq / Gemini + PDFKit + AWS S3)
 * ============================================================================
 * Responsibilities:
 * - Generates structured document JSON from natural language requests.
 * - Streams structured data into PDFKit to compile a styled A4 PDF document.
 * - Uploads the PDF to AWS S3 and returns a 24-hour presigned download link.
 * - Rate limit: 1 req/min | Credit Cost: 10 credits
 * ============================================================================
 */

// Tunables — env-overridable, no redeploy needed to adjust limits.
const MAX_PROMPT_LENGTH = Number(process.env.PDF_MAX_PROMPT_LENGTH) || 4000;
const LLM_TIMEOUT_MS = Number(process.env.PDF_LLM_TIMEOUT_MS) || 45_000;
const PDF_GENERATION_TIMEOUT_MS = Number(process.env.PDF_GENERATION_TIMEOUT_MS) || 20_000;
const S3_UPLOAD_TIMEOUT_MS = Number(process.env.PDF_S3_TIMEOUT_MS) || 30_000;
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

    // Strip common code-fence wrappers first.
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    // If there's still leading/trailing prose, isolate the outermost {...}.
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        text = text.slice(firstBrace, lastBrace + 1);
    }

    return JSON.parse(text);
};

/**
 * Validates the document JSON has the shape generatePdf expects, so a
 * malformed LLM output fails with a clear message instead of crashing
 * (or silently producing a broken PDF) deep inside PDFKit.
 */
const validateDocumentShape = (data) => {
    if (!data || typeof data !== "object") return "Document data is not an object.";
    if (typeof data.title !== "string" || !data.title.trim()) return "Missing or invalid document title.";
    if (!Array.isArray(data.sections) || data.sections.length === 0) return "Missing or empty document sections.";

    for (const [i, section] of data.sections.entries()) {
        if (!section || typeof section !== "object") return `Section ${i} is not an object.`;
        if (typeof section.heading !== "string" || !section.heading.trim()) return `Section ${i} is missing a heading.`;
        if (!Array.isArray(section.points) || section.points.length === 0) return `Section ${i} has no points.`;
        if (!section.points.every((p) => typeof p === "string")) return `Section ${i} has non-string points.`;
    }

    return null; // valid
};

export const pdfAgent = async (state) => {
    const logCtx = { userId: state?.userId, conversationId: state?.conversationId };

    try {
        // 1. Input Validation
        if (!state?.prompt || typeof state.prompt !== "string" || !state.prompt.trim()) {
            return {
                ...state,
                aiResponse: "Please describe what you'd like the PDF to be about."
            };
        }
        if (state.prompt.length > MAX_PROMPT_LENGTH) {
            return {
                ...state,
                aiResponse: `Your request is too long. Please shorten it to under ${MAX_PROMPT_LENGTH} characters.`
            };
        }

        // 2. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "pdf");

        // 3. Resolve LLM & Fetch Recent Conversation Context
        const llm = await getmodel("pdf");
        const history = await getMemory(state.conversationId);

        let contextText = "";
        if (history && history.length > 0) {
            const recent = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join("\n");
            contextText = `
Recent Conversation Context:
${recent}

(If the User Request refers to previous topics, e.g., "create a pdf on this", generate the PDF about that subject.)
`;
        }

        // 4. Synthesize Structured Document JSON via LLM
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

        let res;
        try {
            res = await withTimeout(llm.invoke(prompt), LLM_TIMEOUT_MS, "PDF content generation");
        } catch (invokeError) {
            console.error("[PDF Agent] LLM invocation failed:", { ...logCtx, error: invokeError.message });
            return {
                ...state,
                aiResponse: "I'm having trouble drafting this document right now. Please try again in a moment."
            };
        }

        const rawText = extractText(res?.content);
        if (!rawText) {
            console.warn("[PDF Agent] Empty response from LLM.", logCtx);
            return {
                ...state,
                aiResponse: "# ❌ PDF Generation Failed\n\nThe AI didn't return any content. Please try again."
            };
        }

        // 5. Parse & Validate JSON Output
        let data;
        try {
            data = extractJsonPayload(rawText);
        } catch (jsonError) {
            console.error("[PDF Agent] JSON parse failed:", { ...logCtx, error: jsonError.message });
            return {
                ...state,
                aiResponse: "# ❌ PDF Generation Failed\n\nThe AI returned invalid document data. Please try again."
            };
        }

        const shapeError = validateDocumentShape(data);
        if (shapeError) {
            console.error("[PDF Agent] Document shape invalid:", { ...logCtx, shapeError });
            return {
                ...state,
                aiResponse: "# ❌ PDF Generation Failed\n\nThe AI returned an incomplete document. Please try again."
            };
        }

        // 6. Compile PDF Buffer with PDFKit
        let pdfBuffer;
        try {
            pdfBuffer = await withTimeout(generatePdf(data), PDF_GENERATION_TIMEOUT_MS, "PDF compilation");
        } catch (genError) {
            console.error("[PDF Agent] PDF generation failed:", { ...logCtx, error: genError.message });
            return {
                ...state,
                aiResponse: "# ❌ PDF Generation Failed\n\nWe couldn't compile the document. Please try again."
            };
        }
        if (!pdfBuffer) {
            console.error("[PDF Agent] generatePdf returned no buffer.", logCtx);
            return {
                ...state,
                aiResponse: "# ❌ PDF Generation Failed\n\nWe couldn't compile the document. Please try again."
            };
        }

        // 7. Upload PDF to AWS S3 (collision-safe, non-enumerable filename)
        const filename = `pdf-${state.userId ?? "anon"}-${Date.now()}-${randomUUID()}.pdf`;
        let downloadUrl;
        try {
            await withTimeout(uploadToS3(filename, pdfBuffer, "application/pdf"), S3_UPLOAD_TIMEOUT_MS, "S3 upload");
            downloadUrl = await withTimeout(
                getFromS3(filename, PRESIGNED_URL_TTL_SECONDS),
                S3_UPLOAD_TIMEOUT_MS,
                "Presigned URL generation"
            );
            if (!downloadUrl) {
                throw new Error("Failed to generate PDF download URL.");
            }
        } catch (storageError) {
            console.error("[PDF Agent] Storage step failed:", { ...logCtx, filename, error: storageError.message });
            return {
                ...state,
                aiResponse: "# ❌ PDF Generation Failed\n\nThe document was created but couldn't be saved. Please try again."
            };
        }

        // 8. Deduct Credits (document already generated & stored — never discard the result on billing failure)
        let creditDeductionFailed = false;
        if (state.userId) {
            try {
                await deductCredits(state.userId, "pdf");
            } catch (creditError) {
                console.error("[PDF Agent] Credit deduction failed after successful generation:", {
                    ...logCtx,
                    error: creditError.message
                });
                creditDeductionFailed = true;
            }
        } else {
            console.error("[PDF Agent] userId is missing. Credits were not deducted.", logCtx);
        }

        // 9. Return Response with Download Link
        return {
            ...state,
            aiResponse: `# ✅ PDF Generated Successfully

**${data.title}**

📩 [Download PDF](${downloadUrl})

*Link expires in 24 hours.*`,
            ...(creditDeductionFailed ? { creditDeductionFailed: true } : {})
        };
    } catch (error) {
        console.error("[PDF Agent] Error:", { ...logCtx, error: error.message, stack: error.stack });

        const isRateLimit = /rate limit|too many requests/i.test(error.message ?? "");
        const userMessage = isRateLimit
            ? "You're generating documents too quickly. Please wait a moment and try again."
            : "Something went wrong while generating your document. Please try again shortly.";

        return {
            ...state,
            aiResponse: `# ❌ Error in PDF Agent\n\n${userMessage}`
        };
    }
};