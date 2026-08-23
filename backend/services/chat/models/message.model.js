import mongoose from "mongoose";

/**
 * ============================================================================
 * MESSAGE & ARTIFACT MONGOOSE SCHEMAS
 * ============================================================================
 * Supports text responses, generated images gallery, and multi-file code artifacts.
 * ============================================================================
 */

// Sub-schema for individual files inside a multi-file project artifact
const fileSchema = new mongoose.Schema({
    name: String,
    content: String
}, {
    _id: false
});

// Sub-schema for interactive code artifacts (Monaco + live iframe preview)
const artifactsSchema = new mongoose.Schema({
    id: Number,
    type: String,
    title: String,
    files: [fileSchema]
}, {
    _id: false
});

// Primary Message schema
const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation"
    },
    role: {
        type: String,
        enum: ["user", "assistant"]
    },
    content: String,
    images: [String],
    artifacts: [artifactsSchema]
}, {
    timestamps: true
});

const Message = mongoose.model("message", messageSchema);
export default Message;