import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/**
 * ============================================================================
 * FIREBASE CLIENT SDK INITIALIZATION (Frontend)
 * ============================================================================
 * Powers client-side Google OAuth popup login (`signInWithPopup`).
 * ============================================================================
 */
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "novamind-529f2.firebaseapp.com",
    projectId: "novamind-529f2",
    storageBucket: "novamind-529f2.firebasestorage.app",
    messagingSenderId: "942884081260",
    appId: "1:942884081260:web:458beb27a722dac2eb1249",
    measurementId: "G-VKQT6EJDM0"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();