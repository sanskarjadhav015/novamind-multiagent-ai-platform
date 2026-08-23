import React, { useState } from "react";
import { Check, Code2, Code2Icon, Copy, Eye, FileCode2, PanelRightClose } from "lucide-react";
import { easeInOut, motion } from "motion/react";
import { useSelector } from "react-redux";
import Editor from "@monaco-editor/react";

/**
 * ============================================================================
 * ARTIFACT & CODE SANDBOX COMPONENT (`Artifact.jsx`)
 * ============================================================================
 * Features:
 * - Multi-file tab navigator (index.html, style.css, script.js, etc.).
 * - Embedded Microsoft Monaco Editor with syntax highlighting & dark theme.
 * - Live interactive iframe compilation sandbox (`srcDoc` + `sandbox="allow-scripts allow-modals"`).
 * - Collapsible right-hand sidebar panel with smooth motion transitions.
 * ============================================================================
 */
function Artifact() {
  const [collapsed, setCollapsed] = useState(false);
  const { artifacts } = useSelector((state) => state.message);
  const [tab, setTab] = useState("code");
  const [activeFile, setActiveFile] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!artifacts || artifacts.length === 0) return null;

  const file = artifacts[0]?.files?.[activeFile];
  const htmlFile = artifacts[0]?.files?.find((f) => f.name === "index.html");
  const cssFile = artifacts[0]?.files?.find((f) => f.name === "style.css");
  const jsFile = artifacts[0]?.files?.find((f) => f.name === "script.js");

  const canPreview = Boolean(htmlFile);

  // Dynamic assembly of full HTML5 document injecting CSS and JS into isolated iframe
  const previewDoc = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
    ${cssFile?.content || ""}
    </style>
</head>
<body>
${htmlFile?.content || ""}
<script>
${jsFile?.content || ""}
</script>
</body>
</html>`;

  // Language detector for Monaco Editor
  const detectLanguage = (fileName = "") => {
    const name = fileName.toLowerCase();
    if (name.endsWith(".html")) return "html";
    if (name.endsWith(".css")) return "css";
    if (name.endsWith(".js") || name.endsWith(".jsx")) return "javascript";
    if (name.endsWith(".ts") || name.endsWith(".tsx")) return "typescript";
    if (name.endsWith(".json")) return "json";
    if (name.endsWith(".py")) return "python";
    if (name.endsWith(".java")) return "java";
    if (name.endsWith(".cpp") || name.endsWith(".c")) return "cpp";
    return "plaintext";
  };

  // Clipboard copy handler with fallback
  const handleCopy = async () => {
    if (file?.content) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(file.content);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = file.content;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    }
  };

  return (
    <motion.aside
      initial={{ width: 420 }}
      animate={{ width: collapsed ? 52 : 420 }}
      transition={{ duration: 0.25, ease: easeInOut }}
      className="hidden lg:flex h-full overflow-hidden shrink-0"
    >
      {/* ── EXPANDED STATE ── */}
      {!collapsed ? (
        <div className="flex flex-col h-full w-[420px] bg-[#0c0e15] border-l border-white/[0.06]">

          {/* Top Bar */}
          <div className="h-14 px-3.5 border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
            {/* Collapse & Title */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400
                hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer border-none bg-transparent shrink-0"
                onClick={() => setCollapsed(true)}
                title="Collapse Panel"
              >
                <PanelRightClose size={15} />
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-500/10 border border-indigo-500/20 shrink-0">
                  <Code2 className="text-indigo-400" size={11} />
                </div>
                <span className="text-[12.5px] font-semibold text-slate-200 truncate">
                  {artifacts?.[0]?.title || "Generated Project"}
                </span>
              </div>
            </div>

            {/* Actions: Copy & View Toggle */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  copied
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                    : "bg-white/[0.04] text-slate-300 hover:text-white border-white/[0.06] hover:bg-white/[0.08]"
                }`}
                title="Copy active file content"
              >
                {copied ? (
                  <>
                    <Check size={11} className="text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Code / Preview toggle */}
              {canPreview && (
                <div className="flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <button
                    onClick={() => setTab("code")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors border-none cursor-pointer ${
                      tab === "code"
                        ? "bg-indigo-500/20 text-indigo-300 shadow-xs"
                        : "bg-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Code2Icon size={11} />
                    <span>Code</span>
                  </button>
                  <button
                    onClick={() => setTab("preview")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors border-none cursor-pointer ${
                      tab === "preview"
                        ? "bg-indigo-500/20 text-indigo-300 shadow-xs"
                        : "bg-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Eye size={11} />
                    <span>Preview</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* File tabs row */}
          {tab === "code" && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.06] bg-[#090b0f] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
              {artifacts[0]?.files?.map((f, index) => (
                <button
                  key={index}
                  onClick={() => setActiveFile(index)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border cursor-pointer shrink-0 ${
                    activeFile === index
                      ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300 font-semibold"
                      : "bg-white/[0.02] border-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
                  }`}
                >
                  <FileCode2 size={12} className={activeFile === index ? "text-indigo-400" : "text-slate-500"} />
                  <span>{f?.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Content Area: Live Iframe vs Monaco Editor */}
          <div className="flex-1 overflow-hidden bg-[#0c0e15]">
            {tab === "preview" && canPreview ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full bg-white"
              >
                <iframe
                  title="Interactive Preview"
                  srcDoc={previewDoc}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-modals"
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                <Editor
                  theme="vs-dark"
                  language={detectLanguage(file?.name)}
                  value={file?.content || ""}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    wordWrap: "on",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    lineNumbers: "on",
                    renderLineHighlight: "none",
                  }}
                />
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        /* ── COLLAPSED STRIP ── */
        <div className="flex flex-col items-center w-[52px] py-4 gap-3 bg-[#0c0e15] border-l border-white/[0.06]">
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer border-none bg-transparent"
            title="Expand Artifacts"
          >
            <Code2 size={16} />
          </button>
        </div>
      )}
    </motion.aside>
  );
}

export default Artifact;