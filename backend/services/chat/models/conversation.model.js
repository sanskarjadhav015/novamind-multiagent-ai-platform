import mongoose from "mongoose";

/**
 * ============================================================================
 * CONVERSATION MONGOOSE SCHEMA & MODEL
 * ============================================================================
 * Fields:
 * - title: Title of the chat thread (defaults to "New Chat", dynamically updated).
 * - userId: ID of the user who owns this conversation.
 * ============================================================================
 */
const conversationSchema = new mongoose.Schema({
    title: {
        type: String,
        default: "New Chat"
    },
    userId: {
        type: String
    }
}, {
    timestamps: true
});

const conversation = mongoose.model("conversation", conversationSchema);
export default conversation;