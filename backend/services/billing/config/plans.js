/**
 * ============================================================================
 * SUBSCRIPTION PLANS & CREDIT CONFIGURATION
 * ============================================================================
 * Defines available pricing tiers, amounts (in INR), and credit allocations.
 * ============================================================================
 */
export const PLANS = {
    free: {
        id: "free",
        name: "Free",
        amount: "0",
        credits: 100,
        validity: 30 // days
    },
    starter: {
        id: "starter",
        name: "starter",
        amount: "159",
        credits: 600,
        validity: 30 // days
    },
    pro: {
        id: "pro",
        name: "pro",
        amount: "500",
        credits: 1000,
        validity: 30 // days
    }
};