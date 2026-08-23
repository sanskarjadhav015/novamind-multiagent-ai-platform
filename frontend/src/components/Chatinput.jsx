import { Code2, File, FileText, FileTextIcon, Globe, ImageIcon, MessagesSquare, Mic, Paperclip, Presentation, Send, X, ZapIcon } from 'lucide-react';
import React, { useState, useRef, useEffect } from "react";
import sendMessage from '../features/sendMessage';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage, setArtifacts, setIsLoading } from '../redux/messageSlice';
import { createConversation } from '../features/createConversation';
import { addConversation, setConvTitle, setSelectedConversation } from '../redux/conversationslice';
import { updateConversation } from '../features/updateConversation';
import getCurrentUser from '../features/getCurrentUser';
import { setUserdata } from '../redux/userSlice';

/**
 * ============================================================================
 * CHAT INPUT COMPONENT (`Chatinput.jsx`)
 * ============================================================================
 * Features:
 * - Multi-agent selector pill bar (Auto, Chat, Coding, PDF, PPT, Vision, Search).
 * - Multi-modal file attachment with preview (PDF documents & images).
 * - Real-time continuous speech-to-text via browser Web Speech API.
 * - Dynamic conversation creation and auto-title generation on first message.
 * ============================================================================
 */
function Chatinput() {
    const [value, setValue] = useState("");
    const [selectedAgent, setSelectedAgent] = useState("auto");
    const [loading, setLoading] = useState(false);
    const { selectedConversation } = useSelector(state => state.conversation);
    const dispatch = useDispatch();
    const [selectedFile, setSelectedFile] = useState(null);
    const fileRef = useRef(null);
    const [listening, setListening] = useState(false);
    const recongnitionRef = useRef(null);

    // Cleanup SpeechRecognition on unmount
    useEffect(() => {
        return () => {
            if (recongnitionRef.current) {
                recongnitionRef.current.stop();
            }
        };
    }, []);

    // Web Speech API Microphone Toggle
    const toggleMic = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (listening) {
            if (recongnitionRef.current) {
                recongnitionRef.current.stop();
            }
            setListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.lang = "en-US";
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                setListening(true);
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                setListening(false);
            };

            recognition.onend = () => {
                setListening(false);
            };

            recongnitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error("Failed to start speech recognition:", err);
            setListening(false);
        }
    };

    // Primary Message Submit Handler
    const handleSendMessage = async () => {
        if (loading) return;
        if (!value.trim() && !selectedFile) return;

        let conversation = selectedConversation;

        // Auto-create conversation if none is active
        if (!conversation) {
            const conv = await createConversation();
            dispatch(setSelectedConversation(conv));
            dispatch(addConversation(conv));
            conversation = conv;
        }

        // Set initial conversation title based on user query
        if (conversation?.title === "New Chat") {
            const cleanTitle = (value.trim() || selectedFile?.name || "Chat").slice(0, 40);
            await updateConversation({ id: conversation?._id, title: cleanTitle });
            dispatch(setConvTitle({ conversationId: conversation?._id, title: cleanTitle }));
        }

        const formData = new FormData();
        formData.append("prompt", value.trim());
        formData.append("conversationId", conversation?._id);
        formData.append("agent", selectedAgent);
        if (selectedFile) {
            formData.append("file", selectedFile);
        }

        const userMsgContent = value.trim() || (selectedFile ? `[Uploaded: ${selectedFile.name}]` : "");
        dispatch(addMessage({ role: "user", content: userMsgContent }));
        
        setValue("");
        setSelectedFile(null);
        setLoading(true);
        dispatch(setIsLoading(true));

        try {
            const data = await sendMessage(formData);
            dispatch(setArtifacts(data?.artifacts || []));
            dispatch(addMessage({ role: "assistant", content: data?.answer, images: data?.images }));

            // Refresh user credits in Redux store
            const userProfile = await getCurrentUser();
            if (userProfile) {
                dispatch(setUserdata(userProfile));
            }
        } finally {
            setLoading(false);
            dispatch(setIsLoading(false));
        }
    };

    const agents = [
        { id: "auto", icon: ZapIcon, label: "Auto" },
        { id: "chat", icon: MessagesSquare, label: "Chat" },
        { id: "coding", icon: Code2, label: "Coding" },
        { id: "pdf", icon: FileText, label: "PDF" },
        { id: "ppt", icon: Presentation, label: "PPT" },
        { id: "vision", icon: ImageIcon, label: "Vision" },
        { id: "search", icon: Globe, label: "Search" }
    ];

    return (
        <div className="w-full px-4 md:px-8 pb-5 pt-2 bg-[#090b0f] shrink-0">
            <div className="max-w-4xl mx-auto flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#11131b]/95 p-3 shadow-xl backdrop-blur-md focus-within:border-indigo-500/40 focus-within:shadow-indigo-500/10 transition-all duration-200">
                
                {/* Multi-Agent Selector Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 px-1">
                    {agents.map((agent) => {
                        const isActive = selectedAgent === agent.id;
                        const Icon = agent.icon;

                        return (
                            <button
                                key={agent.id}
                                type="button"
                                onClick={() => setSelectedAgent(agent.id)}
                                className={`
                                    flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                                    transition-all duration-150 cursor-pointer border
                                    ${isActive
                                        ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-sm shadow-indigo-500/30"
                                        : "bg-white/[0.03] text-slate-400 border-white/[0.05] hover:bg-white/[0.07] hover:text-slate-200"
                                    }
                                `}
                            >
                                <Icon size={12} className={isActive ? "text-white" : "text-slate-500"} />
                                <span>{agent.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Attached File Preview Card */}
                {selectedFile && (
                    <div className="mx-1 my-1">
                        <div className="inline-flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2">
                            {selectedFile.type === "application/pdf" ? (
                                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                                    <FileTextIcon size={15} />
                                </div>
                            ) : selectedFile.type.startsWith("image/") ? (
                                <img
                                    src={URL.createObjectURL(selectedFile)}
                                    alt="Preview"
                                    className="h-8 w-8 rounded-lg object-cover border border-white/10"
                                />
                            ) : (
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                    <File size={15} />
                                </div>
                            )}

                            <div className="min-w-0 pr-2">
                                <p className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">
                                    {selectedFile?.name}
                                </p>
                                <p className="text-[10.5px] text-indigo-300/70">
                                    {Math.ceil(selectedFile.size / 1024)} KB
                                </p>
                            </div>

                            <button
                                type="button"
                                className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer border-none"
                                onClick={() => {
                                    setSelectedFile(null);
                                    if (fileRef.current) fileRef.current.value = "";
                                }}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Input Text Area */}
                <textarea
                    rows={2}
                    placeholder={loading ? "Generating response..." : "Ask anything, generate full projects, or attach documents..."}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if ((value.trim() || selectedFile) && !loading) handleSendMessage();
                        }
                    }}
                    value={value}
                    disabled={loading}
                    className="w-full resize-none bg-transparent px-2 pt-1 outline-none text-[13.5px] leading-relaxed text-slate-100 placeholder:text-slate-500 scrollbar-hide disabled:opacity-50"
                />

                {/* Bottom Control Bar */}
                <div className="flex items-center justify-between px-1 pt-1">
                    <div className="flex items-center gap-1.5">
                        <input
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            ref={fileRef}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setSelectedFile(file);
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer border-none"
                            onClick={() => {
                                if (fileRef.current) {
                                    fileRef.current.value = "";
                                    fileRef.current.click();
                                }
                            }}
                            title="Attach PDF or Image"
                        >
                            <Paperclip size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={toggleMic}
                            className={`flex items-center justify-center w-8 h-8 rounded-xl transition-colors cursor-pointer border-none ${
                                listening
                                    ? "text-rose-400 bg-rose-500/20 hover:bg-rose-500/30 animate-pulse"
                                    : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                            }`}
                            title={listening ? "Stop Recording" : "Use Microphone"}
                        >
                            <Mic size={16} />
                        </button>
                    </div>

                    {/* Send CTA Button */}
                    <button
                        type="button"
                        disabled={(!value.trim() && !selectedFile) || loading}
                        onClick={handleSendMessage}
                        className={`
                            flex items-center justify-center w-8 h-8 rounded-xl border-none cursor-pointer
                            transition-all duration-150
                            ${(value.trim() || selectedFile) && !loading
                                ? "bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:opacity-90 active:scale-95"
                                : "bg-white/[0.04] text-slate-600 cursor-not-allowed"
                            }
                        `}
                    >
                        {loading ? (
                            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send size={14} />
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}

export default Chatinput;
