import { createSlice } from '@reduxjs/toolkit';

/**
 * ============================================================================
 * MESSAGE & ARTIFACTS REDUX SLICE
 * ============================================================================
 * Manages message stream, active code artifacts, active conversation,
 * and scoped AI loading state per conversation ID.
 * ============================================================================
 */
const messageSlice = createSlice({
    name: 'message',
    initialState: {
        messages: [],
        artifacts: [],
        isLoading: false,
        loadingConversationId: null, // Scoped to specific active generating thread
        activeConversationId: null
    },
    reducers: {
        setMessages: (state, action) => {
            state.messages = action.payload;
        },
        addMessage: (state, action) => {
            state.messages.push(action.payload);
        },
        setArtifacts: (state, action) => {
            state.artifacts = action.payload;
        },
        setIsLoading: (state, action) => {
            if (typeof action.payload === 'object' && action.payload !== null) {
                state.isLoading = Boolean(action.payload.isLoading);
                state.loadingConversationId = action.payload.conversationId || null;
            } else {
                state.isLoading = Boolean(action.payload);
                if (!action.payload) {
                    state.loadingConversationId = null;
                }
            }
        },
        setActiveConversationId: (state, action) => {
            state.activeConversationId = action.payload;
        }
    }
});

export const { setMessages, addMessage, setArtifacts, setIsLoading, setActiveConversationId } = messageSlice.actions;
export default messageSlice.reducer;