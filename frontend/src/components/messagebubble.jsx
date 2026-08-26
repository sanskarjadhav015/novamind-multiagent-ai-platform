import { Check, Copy, ExternalLink, XIcon } from "lucide-react";
import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SyntaxHighlighter from "react-syntax-highlighter";
import { githubGist } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { motion, AnimatePresence } from "motion/react";

function MessageBubble({ role, content, images }) {
  const isUser = role === "user";
  const [lightBox, setLightBox] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  let codeCount = 0;

  const copyText = async (text, setter) => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.focus(); t.select(); document.execCommand("copy"); document.body.removeChild(t);
      }
      setter(true); setTimeout(() => setter(false), 2000);
    } catch {}
  };

  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start") + " my-1 group"}>
      <div className="break-words overflow-hidden text-[13.5px] leading-relaxed"
        style={isUser ? {
          maxWidth: "75%",
          background: "#8b5cf6",
          color: "#fff",
          borderRadius: "18px 18px 4px 18px",
          padding: "10px 16px"
        } : {
          width: "100%",
          maxWidth: "100%",
          background: "#fff",
          color: "#1a1918",
          borderRadius: "4px 18px 18px 18px",
          border: "1px solid #e8e6e1",
          padding: "14px 18px"
        }}>

        {/* Images */}
        {images && images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.map((img, i) => (
              <img key={i} src={img} onClick={() => setLightBox(img)} loading="lazy"
                onError={(e) => e.currentTarget.remove()}
                className="w-40 h-28 object-cover rounded-xl cursor-zoom-in"
                style={{ border: isUser ? "1.5px solid rgba(255,255,255,0.3)" : "1.5px solid #e8e6e1" }} />
            ))}
          </div>
        )}

        <Markdown remarkPlugins={[remarkGfm]} components={{
          h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 pb-1.5" style={{ color: isUser ? "#fff" : "#1a1918", borderBottom: "1px solid " + (isUser ? "rgba(255,255,255,0.2)" : "#e8e6e1") }}>{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-1.5" style={{ color: isUser ? "#fff" : "#1a1918" }}>{children}</h2>,
          h3: ({ children }) => <h3 className="text-[15px] font-semibold mt-2.5 mb-1" style={{ color: isUser ? "rgba(255,255,255,0.9)" : "#5b21b6" }}>{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words leading-relaxed">{children}</p>,
          blockquote: ({ children }) => <blockquote className="pl-3.5 py-1.5 my-2 italic"
            style={{ borderLeft: "3px solid " + (isUser ? "rgba(255,255,255,0.4)" : "#8b5cf6"), color: isUser ? "rgba(255,255,255,0.8)" : "#6b6560" }}>{children}</blockquote>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
          table: ({ children }) => <div className="overflow-x-auto my-3 rounded-xl" style={{ border: "1px solid #e8e6e1" }}>
            <table className="min-w-full text-left text-xs">{children}</table></div>,
          th: ({ children }) => <th className="px-3.5 py-2.5 font-semibold uppercase tracking-wider text-[11px]"
            style={{ background: "#f9f8f6", color: "#1a1918", borderBottom: "1px solid #e8e6e1" }}>{children}</th>,
          td: ({ children }) => <td className="px-3.5 py-2" style={{ borderTop: "1px solid #f3f2ef", color: "#4a4844" }}>{children}</td>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-0.5 underline underline-offset-2 transition-colors"
            style={{ color: isUser ? "rgba(255,255,255,0.9)" : "#7c3aed" }}>{children}<ExternalLink size={11} /></a>,
          code: ({ className, children }) => {
            const val = String(children).trim();
            if (!className) return <code className="px-1.5 py-0.5 rounded-md font-mono text-[12.5px]"
              style={{ background: isUser ? "rgba(255,255,255,0.15)" : "#f3f0ff", color: isUser ? "#fff" : "#7c3aed" }}>{val}</code>;
            const idx = codeCount++;
            const lang = className?.replace("language-", "");
            return (
              <div className="my-3 overflow-hidden rounded-xl" style={{ border: "1px solid #e8e6e1" }}>
                <div className="flex items-center justify-between px-3.5 py-2" style={{ background: "#f9f8f6", borderBottom: "1px solid #e8e6e1" }}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
                    </div>
                    <span className="text-[10.5px] font-mono font-semibold uppercase tracking-wider" style={{ color: "#6b6560" }}>{lang || "code"}</span>
                  </div>
                  <button type="button" onClick={() => copyText(val, (v) => setCopiedIdx(v ? idx : null))}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg cursor-pointer border-none transition-all font-medium"
                    style={copiedIdx === idx
                      ? { background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac" }
                      : { background: "#fff", color: "#6b6560", border: "1px solid #e8e6e1" }}>
                    {copiedIdx === idx ? <><Check size={11} /><span>Copied!</span></> : <><Copy size={11} /><span>Copy</span></>}
                  </button>
                </div>
                <SyntaxHighlighter language={lang} style={githubGist} wrapLongLines showLineNumbers
                  customStyle={{ margin: 0, padding: "14px 16px", background: "#fff", fontSize: "12.5px", fontFamily: "JetBrains Mono, monospace" }}
                  lineNumberStyle={{ color: "#d4d0c8", fontSize: "11px" }}>
                  {val}
                </SyntaxHighlighter>
              </div>
            );
          },
          img: ({ src, alt }) => src ? <img src={src} alt={alt} onClick={() => setLightBox(src)} loading="lazy"
            onError={(e) => e.currentTarget.remove()}
            className="rounded-xl max-h-80 object-contain my-2 cursor-zoom-in"
            style={{ border: "1px solid #e8e6e1" }} /> : null,
        }}>{content}</Markdown>

        {!isUser && content && (
          <div className="flex items-center justify-end mt-2 pt-2" style={{ borderTop: "1px solid #f3f2ef" }}>
            <button type="button" onClick={() => copyText(content, setCopiedMsg)}
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-xl cursor-pointer border-none transition-all font-medium"
              style={copiedMsg
                ? { background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac" }
                : { background: "#f9f8f6", color: "#9c9590", border: "1px solid #e8e6e1" }}>
              {copiedMsg ? <><Check size={11} /><span>Copied</span></> : <><Copy size={11} /><span>Copy</span></>}
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightBox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
            onClick={() => setLightBox(null)}>
            <button className="absolute top-5 right-5 p-2.5 rounded-full cursor-pointer border-none"
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
              onClick={() => setLightBox(null)}><XIcon size={20} /></button>
            <motion.img initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              src={lightBox} alt="Preview" onClick={(e) => e.stopPropagation()}
              className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain"
              style={{ border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MessageBubble;