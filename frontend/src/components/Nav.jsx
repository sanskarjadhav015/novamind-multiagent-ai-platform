import { MessageSquare } from "lucide-react";
import React from "react";
import { useSelector } from "react-redux";

/**
 * ============================================================================
 * NAVIGATION HEADER COMPONENT (`Nav.jsx`)
 * ============================================================================
 * Displays the current conversation title and live message count badge.
 * ============================================================================
 */
function Nav() {
  const { selectedConversation } = useSelector((state) => state.conversation);
  const { messages } = useSelector((state) => state.message);

  if (!selectedConversation) return null;

  return (
    <div className="h-14 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[#090b0f]/80 backdrop-blur-md shrink-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shrink-0">
          <MessageSquare size={13} className="text-indigo-400" />
        </div>
        <h1 className="text-[13.5px] font-semibold text-slate-100 tracking-tight truncate max-w-[280px] sm:max-w-[450px]">
          {selectedConversation?.title || "New Chat"}
        </h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{messages?.length || 0} {messages?.length === 1 ? "msg" : "messages"}</span>
        </div>
      </div>
    </div>
  );
}

export default Nav;
