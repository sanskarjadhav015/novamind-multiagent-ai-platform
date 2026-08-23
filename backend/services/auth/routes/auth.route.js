import express from "express";
import { deductCredits, login, Logout, updateUserPayment } from "../controllers/auth.controller.js";

const router = express.Router();

/**
 * ============================================================================
 * AUTH SERVICE ROUTES
 * ============================================================================
 */
router.post("/login", login);
router.get("/logout", Logout);
router.post("/update-plan", updateUserPayment);
router.post("/deduct-credits", deductCredits);

export default router;