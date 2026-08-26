import { Code2, File, FileText, FileTextIcon, Globe, ImageIcon, MessagesSquare, Mic, Paperclip, Presentation, Send, X, ZapIcon } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import sendMessage from "../features/sendMessage";
import { useDispatch, useSelector, useStore } from "react-redux";
import { addMessage, setArtifacts, setIsLoading } from "../redux/messageSlice";
import { createConversation } from "../features/createConversation";
import { addConversation, setConvTitle, setSelectedConversation } from "../redux/conversationslice";
import { updateConversation } from "../features/updateConversation";
import getCurrentUser from "../features/getCurrentUser";
import { setUserdata } from "../redux/userSlice";
import { motion, AnimatePresence } from "motion/react";

function Chatinput() {
  const [value, setValue] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("auto");
  const [loading, setLoading] = useState(false);
  const { selectedConversation } = useSelector((s) => s.conversation);
  const dispatch = useDispatch();
  const store = useStore();
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  useEffect(() => () => { if (recRef.current) recRef.current.stop(); }, []);

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported."); return; }
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    try {
      const r = new SR();
      r.lang = "en-US"; r.continuous = false; r.interimResults = false;
      r.onstart = () => setListening(true);
      r.onresult = (e) => setValue((p) => p ? p + " " + e.results[0][0].transcript : e.results[0][0].transcript);
      r.onerror = () => setListening(false);
      r.onend = () => setListening(false);
      recRef.current = r; r.start();
    } catch { setListening(false); }
  };

  const handleSend = async () => {
    if (loading || (!value.trim() && !selectedFile)) return;
    let conv = selectedConversation;

    if (!conv) {
      const c = await createConversation();
      dispatch(setSelectedConversation(c));
      dispatch(addConversation(c));
      conv = c;
    }

    const targetConvId = conv._id;

    if (conv?.title === "New Chat") {
      const t = (value.trim() || selectedFile?.name || "Chat").slice(0, 40);
      await updateConversation({ id: conv._id, title: t });
      dispatch(setConvTitle({ conversationId: conv._id, title: t }));
    }

    const fd = new FormData();
    fd.append("prompt", value.trim());
    fd.append("conversationId", targetConvId);
    fd.append("agent", selectedAgent);
    if (selectedFile) fd.append("file", selectedFile);

    const userContent = value.trim() || (selectedFile ? "[Uploaded: " + selectedFile.name + "]" : "");
    dispatch(addMessage({ role: "user", content: userContent }));

    setValue("");
    setSelectedFile(null);
    setLoading(true);
    dispatch(setIsLoading({ isLoading: true, conversationId: targetConvId }));

    try {
      const data = await sendMessage(fd);
      
      // Check if user is still on the conversation where message was sent
      const currentSelected = store.getState().conversation.selectedConversation;
      const isStillOnSameConv = currentSelected?._id === targetConvId;

      if (isStillOnSameConv && data) {
        if (data.artifacts && data.artifacts.length > 0) {
          dispatch(setArtifacts(data.artifacts));
        }
        dispatch(addMessage({ role: "assistant", content: data.answer, images: data.images }));
      }

      const up = await getCurrentUser();
      if (up) dispatch(setUserdata(up));
    } catch (err) {
      console.error("[ChatInput] Send error:", err);
    } finally {
      setLoading(false);
      dispatch(setIsLoading({ isLoading: false, conversationId: null }));
    }
  };

  const agents = [
    { id: "auto",    icon: ZapIcon,        label: "Auto" },
    { id: "chat",    icon: MessagesSquare, label: "Chat" },
    { id: "coding",  icon: Code2,          label: "Code" },
    { id: "pdf",     icon: FileText,       label: "PDF" },
    { id: "ppt",     icon: Presentation,   label: "PPT" },
    { id: "vision",  icon: ImageIcon,      label: "Vision" },
    { id: "search",  icon: Globe,          label: "Search" },
  ];

  const hasContent = value.trim() || selectedFile;

  return (
    <div className="px-4 md:px-6 pb-5 pt-2 shrink-0" style={{ background: "#f9f8f6" }}>
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl p-3 transition-all"
          style={{ background: "#fff", border: "1.5px solid #e8e6e1", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>

          {/* Agent pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-0.5" style={{ scrollbarWidth: "none" }}>
            {agents.map(({ id, icon: Icon, label }) => {
              const active = selectedAgent === id;
              return (
                <button key={id} type="button" onClick={() => setSelectedAgent(id)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold cursor-pointer border-none transition-all"
                  style={active
                    ? { background: "#8b5cf6", color: "#fff" }
                    : { background: "#f3f2ef", color: "#6b6560" }
                  }>
                  <Icon size={11} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* File preview */}
          <AnimatePresence>
            {selectedFile && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="mt-2 mx-0.5">
                <div className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl"
                  style={{ background: "#f3f2ef", border: "1px solid #e8e6e1" }}>
                  {selectedFile.type === "application/pdf"
                    ? <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }}><FileTextIcon size={13} style={{ color: "#dc2626" }} /></div>
                    : selectedFile.type.startsWith("image/")
                    ? <img src={URL.createObjectURL(selectedFile)} alt="preview" className="h-7 w-7 rounded-lg object-cover" />
                    : <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#f3f0ff" }}><File size={13} style={{ color: "#8b5cf6" }} /></div>
                  }
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold truncate max-w-[180px]" style={{ color: "#1a1918" }}>{selectedFile.name}</p>
                    <p className="text-[10.5px]" style={{ color: "#9c9590" }}>{Math.ceil(selectedFile.size / 1024)} KB</p>
                  </div>
                  <button type="button" onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer border-none transition-all"
                    style={{ background: "#e8e6e1", color: "#6b6560" }}>
                    <X size={11} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <textarea
            rows={2}
            placeholder={loading ? "Generating response..." : "Message NovaMind..."}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (hasContent && !loading) handleSend(); } }}
            value={value}
            disabled={loading}
            className="w-full resize-none bg-transparent px-1 pt-2 text-[14px] leading-relaxed placeholder:text-gray-400 disabled:opacity-50"
            style={{ color: "#1a1918", fontFamily: "inherit" }}
          />

          {/* Controls */}
          <div className="flex items-center justify-between px-0.5 pt-1">
            <div className="flex items-center gap-1">
              <input type="file" accept=".pdf,image/*" className="hidden" ref={fileRef}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }} />
              <button type="button" title="Attach file" onClick={() => { if (fileRef.current) { fileRef.current.value = ""; fileRef.current.click(); } }}
                className="flex items-center justify-center w-8 h-8 rounded-xl cursor-pointer border-none transition-all"
                style={{ background: "transparent", color: "#9c9590" }}>
                <Paperclip size={15} />
              </button>
              <button type="button" onClick={toggleMic} title={listening ? "Stop" : "Mic"}
                className="flex items-center justify-center w-8 h-8 rounded-xl cursor-pointer border-none transition-all"
                style={{ background: listening ? "#fef2f2" : "transparent", color: listening ? "#dc2626" : "#9c9590" }}>
                <Mic size={15} />
              </button>
            </div>

            <motion.button
              type="button"
              disabled={!hasContent || loading}
              onClick={handleSend}
              whileHover={hasContent && !loading ? { scale: 1.06 } : {}}
              whileTap={hasContent && !loading ? { scale: 0.94 } : {}}
              className="flex items-center justify-center w-8 h-8 rounded-xl border-none cursor-pointer transition-all"
              style={hasContent && !loading
                ? { background: "#8b5cf6", color: "#fff" }
                : { background: "#f3f2ef", color: "#c4c0b8", cursor: "not-allowed" }
              }>
              {loading
                ? <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#c4b5fd", borderTopColor: "transparent" }} />
                : <Send size={14} />}
            </motion.button>
          </div>
        </div>
        <p className="text-center text-[11px] mt-2" style={{ color: "#c4c0b8" }}>
          NovaMind can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
}

export default Chatinput;