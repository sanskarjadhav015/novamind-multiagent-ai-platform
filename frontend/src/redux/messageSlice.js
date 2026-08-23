import { createSlice } from '@reduxjs/toolkit';

/**
 * ============================================================================
 * MESSAGE & ARTIFACTS REDUX SLICE
 * ============================================================================
 * Manages message stream, active code artifacts, and AI thinking loading state.
 * ============================================================================
 */
const messageSlice = createSlice({
    name: 'message',
    initialState: {
        messages: [],
        artifacts: [],
        isLoading: false
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
            state.isLoading = action.payload;
        }
    }
});

export const { setMessages, addMessage, setArtifacts, setIsLoading } = messageSlice.actions;
export default messageSlice.reducer;