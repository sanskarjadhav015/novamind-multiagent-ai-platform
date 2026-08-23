import { createSlice } from '@reduxjs/toolkit';

/**
 * ============================================================================
 * USER REDUX SLICE
 * ============================================================================
 * Manages authenticated user state (name, email, avatar, plan, credits).
 * ============================================================================
 */
const userSlice = createSlice({
    name: 'user',
    initialState: {
        userData: null,
    },
    reducers: {
        setUserdata: (state, action) => {
            state.userData = action.payload;
        }
    }
});

export const { setUserdata } = userSlice.actions;
export default userSlice.reducer;