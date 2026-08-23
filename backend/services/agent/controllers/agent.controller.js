import axios from "axios";
import { graph } from "../graph/graph.js";
import { addMessage } from "../config/memory.js";

/**
 * ============================================================================
 * AGENT EXECUTION CONTROLLER
 * ============================================================================
 * Endpoint: POST /chat (Protected via Gateway)
 * Pattern:
 * 1. Invokes the LangGraph state machine FIRST.
 * 2. If execution fails, execution stops immediately without corrupting DB history.
 * 3. Upon successful generation, persists user message, updates Redis memory,
 *    and saves assistant message in parallel via Promise.allSettled().
 * ============================================================================
 */
export const agent = async (req, res, next) => {
    try {
        const { prompt, conversationId, agent } = req.body;
        const file = req.file;
        const userId = req.headers["x-user-id"];

        // 1. Run LangGraph execution workflow
        const result = await graph.invoke({
            prompt,
            conversationId,
            agent,
            userId,
            file
        });

        const userMessageContent = prompt?.trim() || (file ? `[Uploaded file: ${file.originalname}]` : "");

        // 2. Concurrently persist messages to MongoDB and Redis sliding-window memory
        await Promise.allSettled([
            axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
                conversationId,
                role: "user",
                content: userMessageContent
            }),
            addMessage(conversationId, "user", userMessageContent),
            addMessage(conversationId, "assistant", result?.aiResponse || ""),
            axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
                conversationId,
                role: "assistant",
                content: result?.aiResponse || "",
                images: result?.images ?? [],
                artifacts: result?.artifacts ?? []
            })
        ]);

        // 3. Return structured deliverable payload to client
        return res.status(200).json({
            answer: result?.aiResponse,
            images: result?.images ?? [],
            artifacts: result?.artifacts ?? []
        });
    } catch (error) {
        next(error);
    }
};