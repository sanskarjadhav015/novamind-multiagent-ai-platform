import fs from "fs";
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
 * - Cleans up temp files in `finally` block to prevent disk exhaustion.
 * - Rate limit: 5 req/min | Credit Cost: 10 credits
 * ============================================================================
 */
export const pdfRag = async (state) => {
    let parser = null;
    try {
        // 1. Rate Limit Enforcement
        await checkAgentLimit(state.userId, "pdf");

        if (!state.file?.path || !fs.existsSync(state.file.path)) {
            throw new Error("No PDF file was uploaded or file path is invalid.");
        }

        // 2. Extract Text from PDF Buffer
        const buffer = fs.readFileSync(state.file.path);
        parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        const text = result?.text?.trim();

        if (!text) {
            return {
                ...state,
                aiResponse: "The uploaded PDF appears to be empty or contains scanned images without extractable text."
            };
        }

        // 3. Chunk Text into Overlapping Segments
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200
        });

        const docs = await splitter.createDocuments([text]);
        const collectionName = `pdf-${Date.now()}`;

        // 4. Index Embeddings into Qdrant Vector Store
        const store = await vectorStore(docs, collectionName);

        // 5. Perform Vector Similarity Search (Top 5 Chunks)
        const searchQuery = state.prompt?.trim() || "Summarize the key information in this document.";
        const relevantDocs = await store.similaritySearch(searchQuery, 5);
        const context = relevantDocs.map(d => d.pageContent).join("\n\n");

        // 6. Invoke Grounded LLM
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

        const response = await llm.invoke(messages);

        // 7. Deduct Credits
        if (state.userId) {
            try {
                await deductCredits(state.userId, "pdf");
            } catch (creditError) {
                console.error("[PDF RAG] Credit deduction failed:", creditError);
            }
        }

        return {
            ...state,
            aiResponse: response.content
        };
    } catch (error) {
        console.error("[PDF RAG Agent] Error:", error);
        return {
            ...state,
            aiResponse: `# ❌ PDF Analysis Failed\n\n${error.message}`
        };
    } finally {
        // 8. Resource Cleanup: destroy parser and delete temp file
        if (parser && typeof parser.destroy === "function") {
            try {
                await parser.destroy();
            } catch (destroyError) {
                console.error("[PDF RAG Agent] Failed to destroy parser:", destroyError);
            }
        }
        if (state.file?.path && fs.existsSync(state.file.path)) {
            try {
                fs.unlinkSync(state.file.path);
            } catch (unlinkError) {
                console.error("[PDF RAG Agent] Failed to delete temp file:", unlinkError);
            }
        }
    }
};
