import { cert, initializeApp } from "firebase-admin";
import { createRequire } from "module";

/**
 * ============================================================================
 * FIREBASE ADMIN SDK INITIALIZATION
 * ============================================================================
 * Purpose:
 * - Securely verifies Google OAuth ID tokens on the server using service account credentials.
 * ============================================================================
 */
const require = createRequire(import.meta.url);
const serviceAccount = require("../serviceAccountKey.json");

export const app = initializeApp({
    credential: cert(serviceAccount)
});
