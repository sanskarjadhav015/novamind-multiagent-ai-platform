import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

/**
 * ============================================================================
 * CHAT CONTROLLER
 * ============================================================================
 */

/**
 * Endpoint: POST /create-conversation
 * Creates a new conversation record in MongoDB scoped to `x-user-id`.
 */
export const createConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const conversation = await Conversation.create({
            userId: userId
        });
        return res.status(200).json(conversation);
    } catch (error) {
        return res.status(500).json({ message: `create conversation error ${error}` });
    }
};

/**
 * Endpoint: GET /get-conversations
 * Retrieves all conversations for the authenticated user, sorted by most recent.
 */
export const getConversations = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const conversations = await Conversation.find({
            userId: userId
        }).sort({ updatedAt: -1 });

        return res.status(200).json(conversations);
    } catch (error) {
        return res.status(500).json({ message: `get conversation error ${error}` });
    }
};

/**
 * Endpoint: POST /update-conversation
 * Updates the title of a conversation thread.
 */
export const updateConversation = async (req, res) => {
    try {
        const { id, title } = req.body;
        const conversation = await Conversation.findByIdAndUpdate(id, {
            title
        }, { new: true });

        return res.status(200).json(conversation);
    } catch (error) {
        return res.status(500).json({ message: `update conversation error ${error}` });
    }
};

/**
 * Endpoint: POST /save-message
 * Persists a message (role: user/assistant) along with any attached images or artifacts.
 */
export const saveMessage = async (req, res) => {
    try {
        const { conversationId, role, content, images, artifacts } = req.body;
        const message = await Message.create({
            conversationId,
            content,
            role,
            images,
            artifacts
        });
        return res.status(200).json(message);
    } catch (error) {
        return res.status(500).json({ message: `save message error ${error}` });
    }
};

/**
 * Endpoint: GET /get-messages/:conversationId
 * Returns the complete message history for a specific conversation.
 */
export const getMessages = async (req, res) => {
    try {
        const messages = await Message.find({
            conversationId: req.params.conversationId
        });
        return res.status(200).json(messages);
    } catch (error) {
        return res.status(500).json({ message: `get message error ${error}` });
    }
};
