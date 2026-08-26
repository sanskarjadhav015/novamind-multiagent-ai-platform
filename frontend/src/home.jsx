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

function Home() {
  const { userData } = useSelector((s) => s.user);
  const dispatch = useDispatch();
  const [loggingIn, setLoggingIn] = useState(false);

  const handleGoogleLogin = async (token) => {
    try {
      const { data } = await api.post("/api/auth/login", { token });
      dispatch(setUserdata(data));
    } catch (e) { console.error(e); }
  };

  const googleLogin = async () => {
    try {
      setLoggingIn(true);
      const data = await signInWithPopup(auth, googleProvider);
      const token = await data.user.getIdToken();
      await handleGoogleLogin(token);
    } catch (e) { console.error(e); }
    finally { setLoggingIn(false); }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: "#f9f8f6" }}>
      <SideBar />
      <ChatArea />
      <Artifact />

      <AnimatePresence>
        {!userData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(25,24,22,0.5)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
              className="w-full max-w-sm rounded-2xl p-8"
              style={{ background: "#fff", border: "1px solid #e8e6e1", boxShadow: "0 24px 64px rgba(0,0,0,0.12)" }}
            >
              {/* Logo */}
              <div className="flex flex-col items-center gap-4 mb-6">
                <motion.div
                  className="logo-float w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "#8b5cf6" }}
                >
                  <Sparkles size={22} color="white" />
                </motion.div>
                <div className="text-center">
                  <h2 className="text-xl font-bold logo-text">NovaMind</h2>
                  <p className="text-sm mt-1" style={{ color: "#6b6560" }}>Multi-Agent AI Workspace</p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2.5 mb-6 p-4 rounded-xl" style={{ background: "#f9f8f6", border: "1px solid #e8e6e1" }}>
                {["8 Specialized Autonomous Agents", "Live Code Sandbox & Preview", "PDF & Document Intelligence"].map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm" style={{ color: "#4a4844" }}>
                    <CheckCircle2 size={14} style={{ color: "#8b5cf6", flexShrink: 0 }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Google button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={loggingIn}
                onClick={googleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-60"
                style={{ background: "#fff", border: "1.5px solid #e8e6e1", color: "#1a1918", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                {loggingIn
                  ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "#ccc", borderTopColor: "#8b5cf6" }} />
                  : <><FcGoogle size={20} /><span>Continue with Google</span></>}
              </motion.button>

              <p className="text-xs text-center mt-4" style={{ color: "#9c9590" }}>
                By signing in you agree to our Terms & Privacy Policy.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Home;