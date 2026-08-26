import React, { useEffect, useState } from "react";
import { Coins, LogOut, MessageSquare, Plus, Sparkles, User2, X, Menu } from "lucide-react";
import { getConversations } from "../features/getConversations";
import { useDispatch, useSelector } from "react-redux";
import { setConversations, setSelectedConversation } from "../redux/conversationslice";
import { setMessages, setArtifacts } from "../redux/messageSlice";
import logOut from "../features/logOut";
import { setUserdata } from "../redux/userSlice";
import BillingDrawer from "./BillingDrawer";
import { motion, AnimatePresence } from "motion/react";

function SideBar() {
  const [open, setOpen] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dispatch = useDispatch();
  const { conversations, selectedConversation } = useSelector((s) => s.conversation);
  const { userData } = useSelector((s) => s.user);
  const uid = userData?.userId || userData?._id;

  useEffect(() => { setImageError(false); }, [userData?.avatar]);

  useEffect(() => {
    const load = async () => {
      const data = await getConversations();
      if (Array.isArray(data)) dispatch(setConversations(data));
    };
    if (uid) load();
  }, [uid, dispatch]);

  const newChat = () => {
    dispatch(setSelectedConversation(null));
    dispatch(setMessages([]));
    dispatch(setArtifacts([]));
    setOpen(false);
  };

  const selectConv = (conv) => {
    dispatch(setSelectedConversation(conv));
    setOpen(false);
  };

  const handleLogout = async () => {
    try { await logOut(); } catch (e) {}
    dispatch(setUserdata(null));
    dispatch(setSelectedConversation(null));
    dispatch(setConversations([]));
    dispatch(setMessages([]));
    dispatch(setArtifacts([]));
    setOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid #e8e6e1" }}>
        <div className="flex items-center gap-2.5">
          <motion.div
            className="logo-float w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "#8b5cf6" }}
          >
            <Sparkles size={15} color="white" />
          </motion.div>
          <div>
            <span className="text-[15px] font-bold logo-text">NovaMind</span>
            {userData?.plan && (
              <span className="ml-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                style={{ background: "#f3f0ff", color: "#8b5cf6", border: "1px solid #ddd6fe" }}>
                {userData.plan}
              </span>
            )}
          </div>
        </div>
        {/* Close button on mobile */}
        <button onClick={() => setOpen(false)} className="lg:hidden p-1 rounded-lg cursor-pointer border-none"
          style={{ background: "transparent", color: "#6b6560" }}>
          <X size={18} />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 py-3">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={newChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold cursor-pointer border-none transition-all"
          style={{ background: "#8b5cf6", color: "#fff" }}
        >
          <Plus size={15} />
          New Chat
        </motion.button>
      </div>

      {/* Recents label */}
      <div className="px-4 pt-1 pb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#9c9590" }}>
          Recent Chats
        </span>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {(!conversations || conversations.length === 0) ? (
          <div className="py-8 text-center">
            <MessageSquare size={20} className="mx-auto mb-2" style={{ color: "#c8c4bc" }} />
            <p className="text-xs" style={{ color: "#9c9590" }}>No chats yet</p>
          </div>
        ) : (
          conversations.map((conv, i) => {
            const isActive = selectedConversation?._id === conv?._id;
            return (
              <button
                key={conv?._id || i}
                onClick={() => selectConv(conv)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer border-none text-sm"
                style={isActive
                  ? { background: "#f3f0ff", color: "#5b21b6", borderLeft: "3px solid #8b5cf6" }
                  : { background: "transparent", color: "#4a4844", borderLeft: "3px solid transparent" }}
              >
                <MessageSquare size={13} style={{ color: isActive ? "#8b5cf6" : "#b8b4ac", flexShrink: 0 }} />
                <span className="truncate text-[13px]">{conv?.title || "New Chat"}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-3" style={{ borderTop: "1px solid #e8e6e1" }}>
        {userData ? (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: "#f3f2ef" }}>
            <div className="shrink-0">
              {userData?.avatar && !imageError
                ? <img src={userData.avatar} alt="Avatar" onError={() => setImageError(true)}
                    className="w-8 h-8 rounded-xl object-cover" style={{ border: "1.5px solid #e8e6e1" }} />
                : <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#e8e6e1" }}>
                    <User2 size={14} style={{ color: "#6b6560" }} />
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold truncate" style={{ color: "#1a1918" }}>{userData?.name || "User"}</p>
              <p className="text-[11px] flex items-center gap-1" style={{ color: "#9c9590" }}>
                <Coins size={10} style={{ color: "#d97706" }} />
                <span style={{ color: "#d97706", fontWeight: 600 }}>{userData?.credits ?? 0}</span>
                <span> credits</span>
              </p>
            </div>
            <div className="flex gap-0.5">
              <button onClick={() => setShowBilling(true)} title="Billing" className="p-1.5 rounded-lg cursor-pointer border-none transition-all"
                style={{ background: "transparent", color: "#d97706" }}>
                <Coins size={13} />
              </button>
              <button onClick={handleLogout} title="Logout" className="p-1.5 rounded-lg cursor-pointer border-none transition-all"
                style={{ background: "transparent", color: "#9c9590" }}>
                <LogOut size={13} />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-center" style={{ color: "#9c9590" }}>Not signed in</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] h-screen shrink-0"
        style={{ background: "#f3f2ef", borderRight: "1px solid #e8e6e1" }}>
        <SidebarContent />
        <BillingDrawer open={showBilling} onClose={() => setShowBilling(false)} />
      </aside>

      {/* Mobile hamburger button — shown in Nav, but we expose a global toggle here */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: "rgba(0,0,0,0.35)" }}
              onClick={() => setOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col lg:hidden"
              style={{ background: "#f3f2ef", borderRight: "1px solid #e8e6e1" }}
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Expose toggle via custom event so Nav can open it */}
      <div id="sidebar-toggle-ref" data-open={open} style={{ display: "none" }} />
      <BillingDrawer open={showBilling} onClose={() => setShowBilling(false)} />

      {/* Global open function via ref */}
      {React.createElement("span", {
        ref: (el) => {
          if (el) el.openSidebar = () => setOpen(true);
          if (typeof window !== "undefined") window.__openSidebar = () => setOpen(true);
        },
        style: { display: "none" }
      })}
    </>
  );
}

export default SideBar;