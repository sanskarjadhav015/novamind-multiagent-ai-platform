import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import MessageBubble from "./messagebubble";
import LoadingAnimation from "./LoadingAnimation";
import { Code2, FileText, Globe, Sparkles, Zap, Brain, ImageIcon, Presentation } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function MessageList() {
  const { messages, isLoading, loadingConversationId } = useSelector((s) => s.message);
  const { selectedConversation } = useSelector((s) => s.conversation);
  const bottomRef = useRef(null);

  const currentConvId = selectedConversation?._id || "new";
  const shouldShowLoading = isLoading && (!loadingConversationId || loadingConversationId === currentConvId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, shouldShowLoading]);

  const cards = [
    { icon: Code2,       tag: "Coding",   title: "Web Projects",          desc: "Generate full HTML/CSS/JS apps with live preview" },
    { icon: ImageIcon,   tag: "Vision",   title: "Image Generation",      desc: "Create images from text prompts" },
    { icon: FileText,    tag: "PDF/RAG",  title: "Document Intelligence", desc: "Analyze and query PDFs with vector search" },
    { icon: Globe,       tag: "Search",   title: "Web Research",          desc: "Synthesize real-time data from the web" },
    { icon: Brain,       tag: "Chat",     title: "Conversation",          desc: "Multi-turn intelligent dialogue" },
    { icon: Presentation,tag: "PPT",      title: "Presentations",         desc: "Auto-generate slide decks" },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 md:px-6 py-6">
      {(!messages || messages.length === 0) && !shouldShowLoading ? (
        <div className="h-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-5 w-full"
          >
            {/* Logo */}
            <div className="flex flex-col items-center gap-3">
              <motion.div
                className="logo-float w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "#8b5cf6", boxShadow: "0 8px 24px rgba(139,92,246,0.25)" }}
              >
                <Sparkles size={26} color="white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold logo-text">NovaMind</h1>
                <p className="text-sm mt-1" style={{ color: "#9c9590" }}>What do you want to build today?</p>
              </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mt-2 text-left">
              {cards.map((c, i) => {
                const Icon = c.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="p-4 rounded-xl cursor-default transition-all"
                    style={{ background: "#fff", border: "1px solid #e8e6e1" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c4b5fd"; e.currentTarget.style.background = "#faf9ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e8e6e1"; e.currentTarget.style.background = "#fff"; }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#f3f0ff" }}>
                        <Icon size={12} style={{ color: "#8b5cf6" }} />
                      </div>
                      <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "#8b5cf6" }}>{c.tag}</span>
                    </div>
                    <p className="text-[13px] font-semibold" style={{ color: "#1a1918" }}>{c.title}</p>
                    <p className="text-[11.5px] mt-0.5 leading-snug" style={{ color: "#9c9590" }}>{c.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence>
            {messages?.map((msg, i) => (
              <motion.div
                key={msg?._id || i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageBubble role={msg?.role} content={msg?.content} images={msg?.images || []} />
              </motion.div>
            ))}
          </AnimatePresence>
          {shouldShowLoading && <LoadingAnimation />}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

export default MessageList;