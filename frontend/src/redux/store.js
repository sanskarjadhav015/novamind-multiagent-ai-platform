import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import conversationReducer from './conversationslice';
import messageReducer from './messageSlice';

/**
 * ============================================================================
 * REDUX TOOLKIT GLOBAL STORE
 * ============================================================================
 * Slices:
 * - user: Authenticated user profile, plan, and credit balance.
 * - conversation: Active chat threads, selection, and titles.
 * - message: Messages in active chat, live code artifacts, loading spinners.
 * ============================================================================
 */
export const store = configureStore({
    reducer: {
        user: userReducer,
        conversation: conversationReducer,
        message: messageReducer
    },
    devTools: true,
});