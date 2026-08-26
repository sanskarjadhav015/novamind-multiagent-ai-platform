import { Menu, MessageSquare } from "lucide-react";
import React from "react";
import { useSelector } from "react-redux";

function Nav() {
  const { selectedConversation } = useSelector((s) => s.conversation);
  const { messages } = useSelector((s) => s.message);

  const openSidebar = () => {
    if (typeof window !== "undefined" && window.__openSidebar) window.__openSidebar();
  };

  return (
    <div className="h-14 flex items-center justify-between px-4 shrink-0"
      style={{ background: "#fff", borderBottom: "1px solid #e8e6e1" }}>
      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={openSidebar}
          className="lg:hidden p-2 rounded-lg cursor-pointer border-none transition-colors"
          style={{ background: "transparent", color: "#6b6560" }}
        >
          <Menu size={18} />
        </button>

        {selectedConversation ? (
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare size={14} style={{ color: "#8b5cf6", flexShrink: 0 }} />
            <h1 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-[400px]" style={{ color: "#1a1918" }}>
              {selectedConversation?.title || "New Chat"}
            </h1>
          </div>
        ) : (
          <h1 className="text-sm font-semibold" style={{ color: "#1a1918" }}>NovaMind</h1>
        )}
      </div>

      {/* Right: message count */}
      {selectedConversation && (
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0"
          style={{ background: "#f3f2ef", color: "#6b6560", border: "1px solid #e8e6e1" }}>
          {messages?.length || 0} {messages?.length === 1 ? "msg" : "msgs"}
        </span>
      )}
    </div>
  );
}

export default Nav;