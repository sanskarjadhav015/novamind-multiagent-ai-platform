import React, { useEffect, useState } from "react";
import { Coins, LogOut, MessageSquare, PanelLeftIcon, PanelRight, Plus, Sparkles, User2 } from "lucide-react";
import { getConversations } from "../features/getConversations";
import { useDispatch, useSelector } from "react-redux";
import { setConversations, setSelectedConversation } from "../redux/conversationslice";
import { setMessages, setArtifacts } from "../redux/messageSlice";
import logOut from "../features/logOut";
import { setUserdata } from "../redux/userSlice";
import BillingDrawer from "./BillingDrawer";

/**
 * ============================================================================
 * SIDEBAR COMPONENT (`SideBar.jsx`)
 * ============================================================================
 * Features:
 * - Collapsible layout supporting both expanded desktop view and mini icon strip.
 * - Real-time thread history listing sorted by recency.
 * - User profile info, remaining credits counter, and Billing Drawer trigger.
 * - Logout handler with clean Redux state purging.
 * ============================================================================
 */
function SideBar() {
    const [collapsed, setCollapsed] = useState(false);
    const [showBilling, setShowBilling] = useState(false);
    const [imageError, setImageError] = useState(false);
    const dispatch = useDispatch();

    const { conversations, selectedConversation } = useSelector(state => state.conversation);
    const { userData } = useSelector(state => state.user);
    const userIdentifier = userData?.userId || userData?._id;

    useEffect(() => {
        setImageError(false);
    }, [userData?.avatar]);

    // Fetch conversation threads on user login
    useEffect(() => {
        const getConv = async () => {
            const data = await getConversations();
            if (Array.isArray(data)) {
                dispatch(setConversations(data));
            }
        };
        if (userIdentifier) {
            getConv();
        }
    }, [userIdentifier, dispatch]);

    // Start a fresh, empty chat
    const handleNewChat = () => {
        dispatch(setSelectedConversation(null));
        dispatch(setMessages([]));
        dispatch(setArtifacts([]));
    };

    const handleSelectConversation = (conv) => {
        dispatch(setSelectedConversation(conv));
    };

    const handleLogout = async () => {
        try {
            await logOut();
        } catch (e) {
            console.error("Logout error:", e);
        }
        dispatch(setUserdata(null));
        dispatch(setSelectedConversation(null));
        dispatch(setConversations([]));
        dispatch(setMessages([]));
        dispatch(setArtifacts([]));
    };

    // ── COLLAPSED VIEW (Mini Strip) ──
    if (collapsed) {
        return (
            <>
                <div className="hidden lg:flex lg:flex-col items-center w-[60px] h-screen bg-[#0d0f15] border-r border-white/[0.06] py-4 gap-2 shrink-0">
                    <button
                        className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1"
                        onClick={() => setCollapsed(false)}
                        title="Expand sidebar"
                    >
                        <PanelRight size={17} />
                    </button>

                    <button
                        className="flex items-center justify-center w-9 h-9 rounded-xl text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all duration-150 cursor-pointer mb-2"
                        onClick={handleNewChat}
                        title="New Chat"
                    >
                        <Plus size={18} />
                    </button>

                    <div className="flex-1 w-full" />

                    {userData && (
                        <div className="shrink-0 mt-auto flex flex-col items-center gap-2 pt-2 border-t border-white/[0.06] w-full">
                            <button
                                onClick={() => setShowBilling(true)}
                                title="Billing & Credits"
                                className="flex items-center justify-center w-9 h-9 rounded-xl border-none bg-transparent text-amber-400 hover:bg-amber-400/10 cursor-pointer transition-colors duration-150"
                            >
                                <Coins size={17} />
                            </button>

                            <button
                                onClick={handleLogout}
                                title="Logout"
                                className="flex items-center justify-center w-9 h-9 rounded-xl border-none bg-transparent text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 cursor-pointer transition-colors duration-150"
                            >
                                <LogOut size={16} />
                            </button>

                            <div className="mt-1">
                                {userData?.avatar && !imageError ? (
                                    <img
                                        className="w-8 h-8 rounded-xl object-cover border border-indigo-500/30 ring-2 ring-indigo-500/10"
                                        src={userData.avatar}
                                        alt="Avatar"
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center border border-white/[0.08]">
                                        <User2 size={15} className="text-slate-400" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <BillingDrawer
                    open={showBilling}
                    onClose={() => setShowBilling(false)}
                />
            </>
        );
    }

    // ── EXPANDED VIEW (Full Sidebar) ──
    return (
        <>
            {/* Mobile backdrop overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
                onClick={() => setCollapsed(true)}
            />

            <aside className="fixed lg:static inset-y-0 left-0 z-50 w-[275px] h-screen shrink-0 bg-[#0d0f15] border-r border-white/[0.06] flex flex-col">
                {/* Header Brand */}
                <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/30">
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <span className="text-[15px] font-bold text-white tracking-tight">
                            NovaMind
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {userData?.plan || "free"}
                        </span>
                    </div>

                    <button
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                        onClick={() => setCollapsed(true)}
                        title="Collapse sidebar"
                    >
                        <PanelLeftIcon size={16} />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="p-3 shrink-0">
                    <button
                        className="w-full flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 rounded-xl py-2.5 px-4 border-none cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all duration-150 shadow-md shadow-indigo-500/20"
                        onClick={handleNewChat}
                    >
                        <Plus size={16} />
                        New Chat
                    </button>
                </div>

                {/* Recents Header */}
                <div className="px-4 pt-2 pb-1.5 flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                        Recent Chats
                    </span>
                    <span className="text-[10px] font-medium text-slate-600">
                        {conversations?.length || 0}
                    </span>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {(!conversations || conversations.length === 0) ? (
                        <div className="py-8 text-center">
                            <MessageSquare size={22} className="mx-auto text-slate-600 mb-2 opacity-50" />
                            <p className="text-xs text-slate-500">No chats yet</p>
                        </div>
                    ) : (
                        conversations.map((conv, i) => {
                            const isActive = selectedConversation?._id === conv?._id;
                            return (
                                <button
                                    key={conv?._id || i}
                                    onClick={() => handleSelectConversation(conv)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                                        isActive
                                            ? "bg-indigo-500/12 border-indigo-500/25 text-white shadow-xs"
                                            : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                                    }`}
                                >
                                    <div className={`flex items-center justify-center shrink-0 w-6 h-6 rounded-lg ${isActive ? "bg-indigo-500/20 text-indigo-400" : "bg-white/[0.04] text-slate-500"}`}>
                                        <MessageSquare size={12} />
                                    </div>
                                    <span className={`text-[12.5px] truncate flex-1 ${isActive ? "font-medium text-white" : "text-slate-300"}`}>
                                        {conv?.title || "New Chat"}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer User Card */}
                <div className="p-3 border-t border-white/[0.06] bg-[#0b0d12] shrink-0">
                    {userData ? (
                        <div className="flex items-center gap-2.5 rounded-xl p-2 bg-white/[0.02] border border-white/[0.04]">
                            <div className="relative shrink-0">
                                {userData?.avatar && !imageError ? (
                                    <img
                                        className="w-8 h-8 rounded-lg object-cover border border-indigo-500/30"
                                        src={userData.avatar}
                                        alt="Avatar"
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center border border-white/[0.08]">
                                        <User2 size={14} className="text-slate-400" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] font-semibold text-slate-200 truncate leading-tight">
                                    {userData?.name || "User"}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                    <Coins size={11} className="text-amber-400" />
                                    <span>{userData?.credits ?? 0} credits</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={() => setShowBilling(true)}
                                    title="Billing & Upgrade"
                                    className="flex items-center justify-center w-7 h-7 rounded-lg border-none bg-transparent text-amber-400 hover:bg-amber-400/10 cursor-pointer transition-colors duration-150"
                                >
                                    <Coins size={14} />
                                </button>
                                <button
                                    onClick={handleLogout}
                                    title="Logout"
                                    className="flex items-center justify-center w-7 h-7 rounded-lg border-none bg-transparent text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 cursor-pointer transition-colors duration-150"
                                >
                                    <LogOut size={14} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-1">
                            <span className="text-xs text-slate-500">Not logged in</span>
                        </div>
                    )}
                </div>

                <BillingDrawer
                    open={showBilling}
                    onClose={() => setShowBilling(false)}
                />
            </aside>
        </>
    );
}

export default SideBar;
