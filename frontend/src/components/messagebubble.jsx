import { Check, Copy, ExternalLink, XIcon } from 'lucide-react';
import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

/**
 * ============================================================================
 * MESSAGE BUBBLE COMPONENT (`messagebubble.jsx`)
 * ============================================================================
 * Features:
 * - Rich GitHub-Flavored Markdown rendering (`react-markdown` + `remark-gfm`).
 * - Syntax-highlighted code blocks with Mac-style headers and individual copy buttons.
 * - Image asset gallery with interactive full-screen Lightbox modal.
 * - One-click whole-message copying for AI responses.
 * ============================================================================
 */
function MessageBubble({ role, content, images }) {
  const isUser = role === "user";
  const [lightBox, setLightBox] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Copy full message content
  const copyMessage = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content || '');
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = content || '';
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedMessage(true);
      setTimeout(() => {
        setCopiedMessage(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  // Copy individual code snippet block
  const copyCode = async (code, blockIndex) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedIndex(blockIndex);
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  let codeBlockCount = 0;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2 group`}>
      <div
        className={`
          ${isUser 
            ? "w-fit max-w-[92vw] md:max-w-[72%] bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white rounded-2xl rounded-tr-xs shadow-md shadow-indigo-500/10 px-4.5 py-3" 
            : "w-full max-w-[96%] md:max-w-[92%] bg-[#10131b]/95 text-slate-200 rounded-2xl rounded-tl-xs border border-white/[0.06] shadow-sm px-5 py-4"
          }
          break-words overflow-hidden leading-relaxed text-[13.5px]
        `}
      >
        {/* Uploaded or Generated Images Gallery */}
        {images && images.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            {images.map((img, i) => (
              <div key={i} className="relative group/img overflow-hidden rounded-xl border border-white/10">
                <img
                  src={img}
                  onClick={() => setLightBox(img)}
                  loading="lazy"
                  alt="Generated or uploaded asset"
                  onError={(e) => e.currentTarget.remove()}
                  className="w-48 h-32 object-cover cursor-zoom-in group-hover/img:scale-105 transition-transform duration-200"
                />
              </div>
            ))}
          </div>
        )}

        {/* Markdown Renderer with Custom Components */}
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl font-bold text-white mt-4 mb-2 tracking-tight border-b border-white/[0.08] pb-1.5">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold text-white mt-3.5 mb-2 tracking-tight">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-[15px] font-semibold text-indigo-300 mt-3 mb-1.5">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="mb-2.5 last:mb-0 whitespace-pre-wrap break-words leading-relaxed">{children}</p>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-3 border-indigo-500/60 bg-indigo-500/5 px-3.5 py-2 my-2.5 rounded-r-lg text-slate-300 italic">
                {children}
              </blockquote>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 space-y-1 my-2 text-slate-300">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 space-y-1 my-2 text-slate-300">{children}</ol>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-3 rounded-xl border border-white/[0.08]">
                <table className="min-w-full text-left text-xs divide-y divide-white/[0.08]">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="bg-white/[0.04] px-3.5 py-2.5 font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-3.5 py-2 border-t border-white/[0.04] text-slate-300">
                {children}
              </td>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 inline-flex items-center gap-1 font-medium transition-colors"
              >
                {children}
                <ExternalLink size={12} />
              </a>
            ),
            code: ({ className, children }) => {
              const value = String(children).trim();

              if (!className) {
                return (
                  <code className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-indigo-300 font-mono text-[12.5px] border border-white/[0.04]">
                    {value}
                  </code>
                );
              }

              const blockIndex = codeBlockCount++;
              const isCopied = copiedIndex === blockIndex;
              const language = className?.replace("language-", "");

              return (
                <div className="my-3.5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e14] shadow-md">
                  {/* Code Block Header with Mac-style window controls */}
                  <div className="flex items-center justify-between bg-[#151821] border-b border-white/[0.08] px-3.5 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 mr-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="uppercase text-[11px] font-mono font-semibold tracking-wider text-slate-400">
                        {language || "code"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all duration-150 border cursor-pointer ${
                        isCopied
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                          : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/[0.08]"
                      }`}
                      onClick={() => copyCode(value, blockIndex)}
                      title="Copy code"
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="font-medium text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <SyntaxHighlighter
                    language={language}
                    style={atomOneDark}
                    wrapLongLines
                    showLineNumbers
                    customStyle={{
                      margin: 0,
                      padding: "14px 16px",
                      background: "#0c0e14",
                      fontSize: "12.5px",
                      fontFamily: "'JetBrains Mono', monospace"
                    }}
                  >
                    {value}
                  </SyntaxHighlighter>
                </div>
              );
            },
            img: ({ src, alt }) => {
              if (!src) return null;
              return (
                <img
                  src={src}
                  alt={alt}
                  onClick={() => setLightBox(src)}
                  loading="lazy"
                  onError={(e) => e.currentTarget.remove()}
                  className="rounded-xl border border-white/10 max-h-96 object-contain my-2 cursor-zoom-in hover:opacity-95 transition"
                />
              );
            }
          }}
        >
          {content}
        </Markdown>

        {/* Copy Response Button for Assistant */}
        {!isUser && content && (
          <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-white/[0.04]">
            <button
              type="button"
              onClick={copyMessage}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all duration-150 border cursor-pointer ${
                copiedMessage
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                  : "bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border-white/[0.06]"
              }`}
              title="Copy full response"
            >
              {copiedMessage ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-[11px] font-medium text-emerald-400">Copied response</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span className="text-[11px]">Copy response</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Full-Screen Media Lightbox Modal */}
      {lightBox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setLightBox(null)}
        >
          <button
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-colors cursor-pointer border-none"
            onClick={() => setLightBox(null)}
          >
            <XIcon size={20} />
          </button>
          <img
            src={lightBox}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

export default MessageBubble;
