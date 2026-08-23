import { signInWithPopup } from "firebase/auth";
import api from "../utils/axios";
import { auth, googleProvider } from "../utils/firebase";
import { FcGoogle } from "react-icons/fc";
import { useDispatch, useSelector } from "react-redux";
import { setUserdata } from "./redux/userSlice";
import SideBar from "./components/SideBar.jsx";
import ChatArea from "./components/ChatArea.jsx";
import Artifact from "./components/Artifact.jsx";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";

/**
 * ============================================================================
 * MAIN WORKSPACE CONTAINER (`home.jsx`)
 * ============================================================================
 * Coordinates:
 * - Left SideBar (Chat history, credits, new chat).
 * - Central ChatArea (Messages and input).
 * - Right Artifact Panel (Live Monaco code editor & interactive iframe sandbox).
 * - Authentication modal for users who are not yet logged in.
 * ============================================================================
 */
function Home() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [loggingIn, setLoggingIn] = useState(false);

  // Send Firebase OAuth ID Token to backend auth service
  const handleGoogleLogin = async (token) => {
    try {
      const { data } = await api.post("/api/auth/login", { token });
      dispatch(setUserdata(data));
    } catch (error) {
      console.error("Login backend error:", error);
    }
  };

  // Google OAuth Popup Trigger
  const googleLogin = async () => {
    try {
      setLoggingIn(true);
      const data = await signInWithPopup(auth, googleProvider);
      const token = await data.user.getIdToken();
      await handleGoogleLogin(token);
    } catch (error) {
      console.error("Google Auth error:", error);
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="h-screen w-screen min-w-0 flex bg-[#090b0f] text-slate-100 overflow-hidden">
      <SideBar />
      <ChatArea />
      <Artifact />

      {/* ── Google Authentication Overlay ── */}
      <AnimatePresence>
        {!userData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-[390px] relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0e1118]/90 p-8 shadow-2xl backdrop-blur-2xl"
            >
              {/* Ambient Glow */}
              <div className="absolute -top-20 -left-20 w-44 h-44 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col gap-6">
                {/* Brand Header */}
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 p-0.5 shadow-lg shadow-indigo-500/25">
                    <div className="w-full h-full bg-[#0e1118] rounded-[14px] flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Welcome to NovaMind
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Next-Gen Multi-Agent AI Workspace
                    </p>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2.5 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
                  {[
                    "8 Specialized Autonomous Agents",
                    "Live Code Sandbox & Interactive Preview",
                    "Document & PDF Vector RAG Engine"
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                      <CheckCircle2 size={14} className="text-indigo-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Google Sign In Button */}
                <button
                  disabled={loggingIn}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-gray-900 font-semibold text-sm shadow-md hover:bg-slate-100 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-60"
                  onClick={googleLogin}
                >
                  {loggingIn ? (
                    <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FcGoogle size={20} />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-500">
                  By signing in, you agree to our Terms & Privacy Policy.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Home;