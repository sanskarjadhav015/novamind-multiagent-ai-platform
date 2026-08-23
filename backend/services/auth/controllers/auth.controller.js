import { getAuth } from "firebase-admin/auth";
import { app } from "../config/firebase.js";
import User from "../models/user.model.js";
import redis from "../../../shared/redis/redis.js";
import crypto from "crypto";

/**
 * ============================================================================
 * AUTH CONTROLLER
 * ============================================================================
 */

/**
 * Endpoint: POST /login
 * - Verifies Firebase Google ID token from frontend.
 * - Finds or creates User in MongoDB.
 * - Generates cryptographically secure session UUID.
 * - Caches session data in Redis with 7-day TTL.
 * - Sets secure HTTP-only cookie on response.
 */
export const login = async (req, res) => {
    try {
        const { token } = req.body;
        const decoded = await getAuth(app).verifyIdToken(token);
        
        let user = await User.findOne({
            firebaseUid: decoded.uid
        });

        if (!user) {
            user = await User.create({
                firebaseUid: decoded.uid,
                name: decoded.name,
                email: decoded.email,
                avatar: decoded.picture
            });
        }

        // Generate session UUID and store in Redis with 7 days TTL (604800s)
        const sessionId = crypto.randomUUID();
        await redis.set(`user-session-${user?._id}`, sessionId);
        await redis.set(`session-${sessionId}`, JSON.stringify({
            userId: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            plan: user.plan,
            credits: user.credits,
            totalCredits: user.totalCredits,
            planExpiresAt: user.planExpiresAt
        }), "EX", 7 * 24 * 60 * 60);

        // Set HTTP-only cookie
        res.cookie("session", sessionId, {
            httpOnly: true,
            secure: false, // Set to true if running under strict HTTPS domain
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: `login error: ${error.message}` });
    }
};

/**
 * Endpoint: GET /logout
 * - Deletes the session key from Redis.
 * - Clears the session cookie on client.
 */
export const Logout = async (req, res) => {
    try {
        const sessionId = req.cookies?.session;
        if (sessionId) {
            await redis.del(`session-${sessionId}`);
        }

        res.clearCookie("session");
        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        return res.status(500).json({ message: `logout error: ${error.message}` });
    }
};

/**
 * Endpoint: POST /update-plan (Internal Inter-Service Call)
 * - Invoked by Billing Service upon successful Razorpay payment verification.
 * - Updates user plan tier, increments credits, and refreshes the Redis session cache.
 */
export const updateUserPayment = async (req, res) => {
    try {
        const { plan, credits, userId } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        user.plan = plan;
        user.credits += credits;
        user.totalCredits += credits;
        user.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await user.save();

        // Synchronize active Redis session so changes take effect immediately without relogin
        const sessionId = await redis.get(`user-session-${user?._id}`);
        if (sessionId) {
            await redis.set(`session-${sessionId}`, JSON.stringify({
                userId: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                plan: user.plan,
                credits: user.credits,
                totalCredits: user.totalCredits,
                planExpiresAt: user.planExpiresAt
            }), "EX", 7 * 24 * 60 * 60);
        }

        return res.status(200).json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ message: `update user payment error: ${error.message}` });
    }
};

/**
 * Endpoint: POST /deduct-credits (Internal Inter-Service Call)
 * - Invoked by Agent Service upon successful task execution.
 * - Deducts credits according to the agent cost matrix.
 * - Synchronizes active Redis session cache.
 */
export const deductCredits = async (req, res) => {
    try {
        const { userId, agent } = req.body;
        
        // Agent Credit Cost Matrix
        const COST = {
            chat: 1,
            search: 5,
            coding: 10,
            pdf: 10,
            ppt: 10,
            vision: 10
        };

        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ message: "user not found" });
        }
        
        const requiredCredits = COST[agent] || 1;
        if (user.credits < requiredCredits) {
            return res.status(400).json({ message: "Not enough credits" });
        }

        user.credits -= requiredCredits;
        await user.save();

        // Synchronize active Redis session
        const sessionId = await redis.get(`user-session-${user?._id}`);
        if (sessionId) {
            await redis.set(`session-${sessionId}`, JSON.stringify({
                userId: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                plan: user.plan,
                credits: user.credits,
                totalCredits: user.totalCredits,
                planExpiresAt: user.planExpiresAt
            }), "EX", 7 * 24 * 60 * 60);
        }

        return res.status(200).json({ success: true, credits: user.credits });
    } catch (error) {
        return res.status(500).json({ message: `deduct credits error ${error.message}` });
    }
};