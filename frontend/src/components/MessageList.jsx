import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import MessageBubble from "./messagebubble";
import LoadingAnimation from "./LoadingAnimation";
import { Code2, FileText, Globe, Sparkles } from "lucide-react";
import { motion } from "motion/react";

/**
 * ============================================================================
 * MESSAGE LIST COMPONENT (`MessageList.jsx`)
 * ============================================================================
 * Renders:
 * - Default zero-state Welcome Hero with capability cards when no messages exist.
 * - Chronological MessageBubble list with automated smooth scrolling to bottom.
 * - LoadingAnimation indicator when `isLoading` is true.
 * ============================================================================
 */
function MessageList() {
  const { messages, isLoading } = useSelector((state) => state.message);
  const bottomRef = useRef(null);

  // Auto scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const capabilityCards = [
    {
      icon: Code2,
      tag: "Coding Agent",
      title: "Interactive Web Project",
      desc: "Generate complete HTML, CSS & JS apps with live preview"
    },
    {
      icon: Sparkles,
      tag: "Vision Agent",
      title: "AI Image Generation",
      desc: "Create photorealistic imagery from detailed prompts"
    },
    {
      icon: FileText,
      tag: "PDF / RAG",
      title: "Document Intelligence",
      desc: "Analyze and query PDF reports with vector search"
    },
    {
      icon: Globe,
      tag: "Search Agent",
      title: "Web Research",
      desc: "Synthesize real-time data and web sources"
    }
  ];

  return (
    <div
      className="flex-1 h-full overflow-y-auto px-4 md:px-8 py-6
      [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* ── Zero-state Welcome Hero ── */}
      {(!messages || messages?.length === 0) && !isLoading ? (
        <div className="h-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center px-4 py-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4"
          >
            {/* NovaMind Brand Logo */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Sparkles size={20} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                NovaMind
              </h1>
            </div>

            {/* Capability Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-4 text-left">
              {capabilityCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] p-4 transition-all duration-200 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 cursor-default"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform duration-200">
                        <Icon size={12} />
                      </div>
                      <span className="text-[10.5px] font-semibold text-indigo-300 uppercase tracking-wider">
                        {card.tag}
                      </span>
                    </div>
                    <h3 className="text-[13px] font-semibold text-slate-200 group-hover:text-white">
                      {card.title}
                    </h3>
                    <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                      {card.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      ) : (
        /* ── Active Conversation Stream ── */
        <div className="max-w-4xl mx-auto space-y-6">
          {messages?.map((msg, i) => (
            <div key={msg?._id || i}>
              <MessageBubble
                role={msg?.role}
                content={msg?.content}
                images={msg?.images || []}
              />
            </div>
          ))}
          {isLoading && <LoadingAnimation />}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

export default MessageList;