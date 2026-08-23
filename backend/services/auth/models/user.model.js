import mongoose from "mongoose";

/**
 * ============================================================================
 * USER MONGOOSE SCHEMA & MODEL
 * ============================================================================
 * Fields:
 * - firebaseUid: Unique Firebase identifier from Google OAuth.
 * - name, email, avatar: Basic user profile details.
 * - plan: Subscription tier ("free", "starter", "pro").
 * - credits: Current available balance of credits for agent tasks.
 * - totalCredits: Total credits allocated for the current billing cycle.
 * - planExpiresAt: Plan expiration timestamp.
 * ============================================================================
 */
const userSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        unique: true
    },
    name: String,
    email: String,
    avatar: String,
    plan: {
        type: String,
        default: "free"
    },
    credits: {
        type: Number,
        default: 100
    },
    totalCredits: {
        type: Number,
        default: 100
    },
    planExpiresAt: Date
}, {
    timestamps: true
});

const User = mongoose.model("User", userSchema);
export default User;