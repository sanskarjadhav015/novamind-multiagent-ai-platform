import fs from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { vectorStore } from "../config/vectorDb.js";
import { getmodel } from "../config/llmModels.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { deductCredits } from "../utils/deductCredits.js";
import { checkAgentLimit } from "../config/agentLimit.js";

/**
 * ============================================================================
 * 6. PDF VECTOR RAG AGENT (LangChain + Qdrant + Gemini Embeddings)
 * ============================================================================
 * Responsibilities:
 * - Parses text from uploaded PDF attachments using pdf-parse.
 * - Recursively chunks text (chunkSize: 1000, overlap: 200).
 * - Generates high-dimensional vector embeddings and indexes into Qdrant Vector DB.
 * - Executes cosine similarity search to retrieve top 5 most relevant chunks.
 * - Injects context into Gemini 3.6 with strict hallucination-resistant guardrails.
 * - Cleans up temp files AND the ephemeral vector collection in `finally`.
 * - Rate limit: 1 req/min | Credit Cost: 10 credits
 * ============================================================================
 */

// Tunables — env-overridable, no redeploy needed to adjust limits.
const MAX_PDF_BYTES = Number(process.env.PDFRAG_MAX_BYTES) || 20 * 1024 * 1024; // 20MB
const MAX_PROMPT_LENGTH = Number(process.env.PDFRAG_MAX_PROMPT_LENGTH) || 2000;
const MAX_TEXT_CHARS = Number(process.env.PDFRAG_MAX_TEXT_CHARS) || 400_000; // ~ caps embedding cost on huge PDFs
const TOP_K = Number(process.env.PDFRAG_TOP_K) || 5;
const PARSE_TIMEOUT_MS = Number(process.env.PDFRAG_PARSE_TIMEOUT_MS) || 30_000;
const INDEX_TIMEOUT_MS = Number(process.env.PDFRAG_INDEX_TIMEOUT_MS) || 45_000;
const SEARCH_TIMEOUT_MS = Number(process.env.PDFRAG_SEARCH_TIMEOUT_MS) || 15_000;
const LLM_TIMEOUT_MS = Number(process.env.PDFRAG_LLM_TIMEOUT_MS) || 45_000;

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
 * Best-effort cleanup of the ephemeral per-request Qdrant collection.
 *
 * IMPORTANT: `vectorStore()` creates a brand-new collection on every call
 * (`collectionName` is unique per request) but the original code never
 * deleted it. Since each collection is used for exactly one query and then
 * abandoned, this is an unbounded storage leak — every PDF upload permanently
 * grows the Qdrant instance.
 *
 * This helper tries the common shapes a LangChain vector store wrapper might
 * expose for collection deletion. The exact method depends on what
 * `../config/vectorDb.js` returns, which wasn't provided — verify against
 * your actual implementation and wire in the real deletion call if none of
 * these match, e.g. `qdrantClient.deleteCollection(collectionName)`.
 */
const cleanupVectorCollection = async (store, collectionName, logCtx) => {
    if (!store || !collectionName) return;
    try {
        if (typeof store.delete === "function") {
            await store.delete({ deleteAll: true });
        } else if (typeof store.deleteCollection === "function") {
            await store.deleteCollection(collectionName);
        } else if (typeof store.client?.deleteCollection === "function") {
            await store.client.deleteCollection(collectionName);
        } else {
            console.warn(
                "[PDF RAG] No known deletion method found on vector store — " +
                "collection may not have been cleaned up. Verify vectorDb.js API.",
                { ...logCtx, collectionName }
            );
        }
    } catch (cleanupError) {
        console.error("[PDF RAG] Failed to clean up vector collection:", {
            ...logCtx,
            collectionName,
            error: cleanupError.message
        });
    }
};

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
        console.error("[PDF RAG] Failed to delete temp file:", { ...logCtx, error: unlinkError.message });
    }
};

export const pdfRag = async (state) => {
    const logCtx = { userId: state?.userId, conversationId: state?.conversationId };
    const filePath = state?.file?.path;

    let parser = null;
    let store = null;
    let collectionName = null;

    try {
        // 1. Input Validation
        if (!filePath || !existsSync(filePath)) {
            return {
                ...state,
                aiResponse: "No PDF file was uploaded, or the file could not be found. Please try uploading it again."
            };
        }

        const mimetype = state.file.mimetype || "";
        if (mimetype && mimetype !== "application/pdf") {
            return {
                ...state,
                aiResponse: `Unsupported file type (${mimetype}). Please upload a PDF document.`
            };
        }

        const stats = await fs.stat(filePath);
        if (stats.size > MAX_PDF_BYTES) {
            return {
                ...state,
                aiResponse: `PDF is too large (${(stats.size / (1024 * 1024)).toFixed(1)}MB). Please upload a file under ${(MAX_PDF_BYTES / (1024 * 1024)).toFixed(0)}MB.`
            };
        }

        if (state.prompt && state.prompt.length > MAX_PROMPT_LENGTH) {
            return {
                ...state,
                aiResponse: `Your question is too long. Please shorten it to under ${MAX_PROMPT_LENGTH} characters.`
            };
        }

        // 2. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "pdf");

        // 3. Extract Text from PDF (async read, timeout-guarded parse)
        const buffer = await fs.readFile(filePath);
        parser = new PDFParse({ data: buffer });

        let result;
        try {
            result = await withTimeout(parser.getText(), PARSE_TIMEOUT_MS, "PDF text extraction");
        } catch (parseError) {
            console.error("[PDF RAG] PDF parsing failed:", { ...logCtx, error: parseError.message });
            return {
                ...state,
                aiResponse: "We couldn't read this PDF — it may be corrupted, encrypted, or in an unsupported format."
            };
        }

        let text = result?.text?.trim();
        if (!text) {
            return {
                ...state,
                aiResponse: "The uploaded PDF appears to be empty or contains scanned images without extractable text."
            };
        }

        const truncated = text.length > MAX_TEXT_CHARS;
        if (truncated) {
            text = text.slice(0, MAX_TEXT_CHARS);
            console.warn("[PDF RAG] Document text truncated for indexing.", { ...logCtx, originalLength: result.text.length });
        }

        // 4. Chunk Text into Overlapping Segments
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200
        });

        const docs = await splitter.createDocuments([text]);

        // Collision-safe, non-enumerable collection name.
        collectionName = `pdf-${state.userId ?? "anon"}-${Date.now()}-${randomUUID()}`;

        // 5. Index Embeddings into Qdrant Vector Store
        try {
            store = await withTimeout(vectorStore(docs, collectionName), INDEX_TIMEOUT_MS, "Vector indexing");
        } catch (indexError) {
            console.error("[PDF RAG] Vector indexing failed:", { ...logCtx, error: indexError.message });
            return {
                ...state,
                aiResponse: "We couldn't process this PDF for search. Please try again in a moment."
            };
        }

        // 6. Perform Vector Similarity Search (Top-K Chunks)
        const searchQuery = state.prompt?.trim() || "Summarize the key information in this document.";

        let relevantDocs;
        try {
            relevantDocs = await withTimeout(store.similaritySearch(searchQuery, TOP_K), SEARCH_TIMEOUT_MS, "Similarity search");
        } catch (searchError) {
            console.error("[PDF RAG] Similarity search failed:", { ...logCtx, error: searchError.message });
            return {
                ...state,
                aiResponse: "We couldn't search this PDF's contents. Please try again."
            };
        }

        const context = (relevantDocs ?? []).map((d) => d.pageContent).join("\n\n");

        // 7. Invoke Grounded LLM
        const llm = await getmodel("pdfRag");

        const messages = [
            new SystemMessage(
                `You are NovaMind PDF Assistant.
Rules:
- Answer ONLY from the uploaded PDF context provided.
- If the answer cannot be determined from the context, state clearly: "I couldn't find this information in the uploaded PDF."
- Provide clear, well-structured answers using Markdown.
- Do not hallucinate or guess facts.`
            ),
            new HumanMessage(
                `Context from uploaded PDF:
${context || text.slice(0, 4000)}

User Query:
${searchQuery}`
            )
        ];

        let response;
        try {
            response = await withTimeout(llm.invoke(messages), LLM_TIMEOUT_MS, "PDF RAG LLM invocation");
        } catch (invokeError) {
            console.error("[PDF RAG] LLM invocation failed:", { ...logCtx, error: invokeError.message });
            return {
                ...state,
                aiResponse: "I'm having trouble answering from this PDF right now. Please try again in a moment."
            };
        }

        const responseText = extractText(response?.content);
        if (!responseText) {
            console.warn("[PDF RAG] Empty response from LLM.", logCtx);
            return {
                ...state,
                aiResponse: "Sorry, I couldn't generate an answer from this PDF. Please try again."
            };
        }

        // 8. Deduct Credits (answer already generated — never discard it on billing failure)
        let creditDeductionFailed = false;
        if (state.userId) {
            try {
                await deductCredits(state.userId, "pdf");
            } catch (creditError) {
                console.error("[PDF RAG] Credit deduction failed after successful analysis:", {
                    ...logCtx,
                    error: creditError.message
                });
                creditDeductionFailed = true;
            }
        } else {
            console.error("[PDF RAG] userId is missing. Credits were not deducted.", logCtx);
        }

        return {
            ...state,
            aiResponse: truncated
                ? `${responseText}\n\n*Note: this PDF was large, so only the first portion was analyzed.*`
                : responseText,
            ...(creditDeductionFailed ? { creditDeductionFailed: true } : {})
        };
    } catch (error) {
        console.error("[PDF RAG Agent] Error:", { ...logCtx, error: error.message, stack: error.stack });

        const isRateLimit = /rate limit|too many requests/i.test(error.message ?? "");
        const userMessage = isRateLimit
            ? "You're sending PDF requests too quickly. Please wait a moment and try again."
            : "Something went wrong while analyzing your PDF. Please try again shortly.";

        return {
            ...state,
            aiResponse: `# ❌ PDF Analysis Failed\n\n${userMessage}`
        };
    } finally {
        // 9. Resource Cleanup: destroy parser, delete vector collection, delete temp file
        if (parser && typeof parser.destroy === "function") {
            try {
                await parser.destroy();
            } catch (destroyError) {
                console.error("[PDF RAG Agent] Failed to destroy parser:", { ...logCtx, error: destroyError.message });
            }
        }
        await cleanupVectorCollection(store, collectionName, logCtx);
        await cleanupTempFile(filePath, logCtx);
    }
};