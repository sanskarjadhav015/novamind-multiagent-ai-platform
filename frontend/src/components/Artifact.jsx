import React, { useState, useEffect } from "react";
import {
  Check, Code2, Code2Icon, Copy, Download, Eye, FileCode2, Maximize2,
  Minimize2, PanelRightClose, RotateCw
} from "lucide-react";
import { easeInOut, motion } from "motion/react";
import { useSelector } from "react-redux";
import Editor from "@monaco-editor/react";

/**
 * ============================================================================
 * PRODUCTION-GRADE ARTIFACT & LIVE SANDBOX COMPONENT (`Artifact.jsx`)
 * ============================================================================
 * Features:
 * - Real-time HTML/CSS/JS sandbox with automated CDN injection (Tailwind, FontAwesome).
 * - Monaco Editor with vs-light theme and multi-file tab switching.
 * - Live sandbox reload button, fullscreen preview mode, and file download.
 * ============================================================================
 */
function Artifact() {
  const [collapsed, setCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const { artifacts } = useSelector((s) => s.message);
  const [tab, setTab] = useState("code");
  const [activeFile, setActiveFile] = useState(0);
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const artifact = artifacts?.[0];
  const files = artifact?.files || [];
  const hasFiles = files.length > 0;

  const htmlFile = files.find((f) => f.name?.toLowerCase().endsWith(".html") || f.name === "index.html");
  const cssFile = files.find((f) => f.name?.toLowerCase().endsWith(".css") || f.name === "style.css");
  const jsFile = files.find((f) => f.name?.toLowerCase().endsWith(".js") || f.name === "script.js");
  const isWebProject = Boolean(htmlFile);

  // Auto-switch to preview tab when a web project arrives
  useEffect(() => {
    if (isWebProject) {
      setTab("preview");
    } else {
      setTab("code");
    }
    setActiveFile(0);
  }, [artifact?.id, isWebProject]);

  if (!artifacts || artifacts.length === 0 || !hasFiles) return null;

  const currentFile = files[activeFile] || files[0];

  /**
   * Constructs an isolated, rich HTML document with embedded Tailwind CDN & FontAwesome
   */
  const buildPreviewDoc = () => {
    let rawHtml = htmlFile?.content || "<div style='padding:20px;'>No HTML file found.</div>";
    const rawCss = cssFile?.content || "";
    const rawJs = jsFile?.content || "";

    const cdnInjections = `
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        ${rawCss}
      </style>
    `;

    const jsInjection = `
      <script>
        window.onerror = function(msg, url, line) {
          console.error('Preview Error: ' + msg + ' at ' + line);
        };
        try {
          ${rawJs}
        } catch (err) {
          console.error('Execution Error:', err);
        }
      </script>
    `;

    if (/<\/head>/i.test(rawHtml)) {
      rawHtml = rawHtml.replace(/<\/head>/i, `${cdnInjections}</head>`);
    } else {
      rawHtml = `<head>${cdnInjections}</head>${rawHtml}`;
    }

    if (/<\/body>/i.test(rawHtml)) {
      rawHtml = rawHtml.replace(/<\/body>/i, `${jsInjection}</body>`);
    } else {
      rawHtml = `${rawHtml}${jsInjection}`;
    }

    if (!/<!doctype/i.test(rawHtml)) {
      rawHtml = `<!DOCTYPE html><html lang="en">${rawHtml}</html>`;
    }

    return rawHtml;
  };

  const detectLang = (name = "") => {
    const n = name.toLowerCase();
    if (n.endsWith(".html")) return "html";
    if (n.endsWith(".css")) return "css";
    if (n.endsWith(".js") || n.endsWith(".jsx")) return "javascript";
    if (n.endsWith(".ts") || n.endsWith(".tsx")) return "typescript";
    if (n.endsWith(".json")) return "json";
    if (n.endsWith(".py")) return "python";
    if (n.endsWith(".cpp") || n.endsWith(".c")) return "cpp";
    if (n.endsWith(".java")) return "java";
    if (n.endsWith(".sql")) return "sql";
    return "plaintext";
  };

  const handleCopy = async () => {
    if (!currentFile?.content) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(currentFile.content);
      } else {
        const t = document.createElement("textarea");
        t.value = currentFile.content;
        t.style.position = "fixed";
        t.style.opacity = "0";
        document.body.appendChild(t);
        t.focus();
        t.select();
        document.execCommand("copy");
        document.body.removeChild(t);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    if (!currentFile?.content) return;
    const blob = new Blob([currentFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFile.name || "code.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const panelWidth = fullscreen ? "100vw" : collapsed ? 48 : 460;

  return (
    <motion.aside
      initial={{ width: 460 }}
      animate={{ width: panelWidth }}
      transition={{ duration: 0.25, ease: easeInOut }}
      className={`hidden lg:flex h-full overflow-hidden shrink-0 z-30 ${fullscreen ? "fixed inset-0" : "relative"}`}
    >
      {!collapsed ? (
        <div className="flex flex-col h-full w-full" style={{ background: "#fff", borderLeft: "1px solid #e8e6e1" }}>
          {/* Header Bar */}
          <div className="h-14 px-3.5 flex items-center justify-between gap-2 shrink-0"
            style={{ borderBottom: "1px solid #e8e6e1", background: "#f9f8f6" }}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => setCollapsed(true)}
                title="Collapse Panel"
                className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer border-none transition-all shrink-0"
                style={{ background: "transparent", color: "#9c9590" }}
              >
                <PanelRightClose size={15} />
              </button>
              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: "#f3f0ff" }}>
                <Code2 size={11} style={{ color: "#8b5cf6" }} />
              </div>
              <span className="text-[13px] font-semibold truncate" style={{ color: "#1a1918" }}>
                {artifact?.title || "Generated Application"}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Copy file */}
              <button
                onClick={handleCopy}
                title="Copy current file"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer border-none transition-all"
                style={copied
                  ? { background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac" }
                  : { background: "#fff", color: "#6b6560", border: "1px solid #e8e6e1" }}
              >
                {copied ? <><Check size={11} /><span>Copied</span></> : <><Copy size={11} /><span>Copy</span></>}
              </button>

              {/* Download single file */}
              <button
                onClick={handleDownload}
                title="Download file"
                className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer border-none transition-all"
                style={{ background: "#fff", color: "#6b6560", border: "1px solid #e8e6e1" }}
              >
                <Download size={12} />
              </button>

              {/* Fullscreen toggle */}
              <button
                onClick={() => setFullscreen(!fullscreen)}
                title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
                className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer border-none transition-all"
                style={{ background: "#fff", color: "#6b6560", border: "1px solid #e8e6e1" }}
              >
                {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>

              {/* Code vs Preview Toggle */}
              {isWebProject && (
                <div className="flex items-center p-0.5 rounded-lg ml-1" style={{ background: "#f3f2ef", border: "1px solid #e8e6e1" }}>
                  <button
                    onClick={() => setTab("code")}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer border-none transition-all"
                    style={tab === "code"
                      ? { background: "#fff", color: "#1a1918", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                      : { background: "transparent", color: "#9c9590" }}
                  >
                    <Code2Icon size={11} />Code
                  </button>
                  <button
                    onClick={() => setTab("preview")}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer border-none transition-all"
                    style={tab === "preview"
                      ? { background: "#fff", color: "#8b5cf6", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                      : { background: "transparent", color: "#9c9590" }}
                  >
                    <Eye size={11} />Preview
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* File Tabs (in Code Mode) */}
          {tab === "code" && (
            <div className="flex items-center gap-1 px-3 py-2 shrink-0 overflow-x-auto"
              style={{ background: "#f9f8f6", borderBottom: "1px solid #e8e6e1", scrollbarWidth: "none" }}>
              {files.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFile(i)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer border-none shrink-0 transition-all"
                  style={activeFile === i
                    ? { background: "#fff", color: "#1a1918", border: "1px solid #e8e6e1", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }
                    : { background: "transparent", color: "#9c9590", border: "1px solid transparent" }}
                >
                  <FileCode2 size={11} style={{ color: activeFile === i ? "#8b5cf6" : "#c4c0b8" }} />
                  {f?.name}
                </button>
              ))}
            </div>
          )}

          {/* Preview Controls Bar */}
          {tab === "preview" && isWebProject && (
            <div className="flex items-center justify-between px-3.5 py-1.5 shrink-0"
              style={{ background: "#faf8ff", borderBottom: "1px solid #ede9fe" }}>
              <span className="text-[11px] font-medium flex items-center gap-1.5" style={{ color: "#7c3aed" }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#10b981" }} />
                Live Interactive Sandbox
              </span>
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded cursor-pointer border-none"
                style={{ background: "#ede9fe", color: "#7c3aed" }}
                title="Rerun sandbox"
              >
                <RotateCw size={10} /> Reload
              </button>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-hidden">
            {tab === "preview" && isWebProject ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full bg-white">
                <iframe
                  key={refreshKey}
                  title="Interactive App Preview"
                  srcDoc={buildPreviewDoc()}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                />
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
                <Editor
                  theme="vs"
                  language={detectLang(currentFile?.name)}
                  value={currentFile?.content || ""}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    wordWrap: "on",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    lineNumbers: "on"
                  }}
                />
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        /* Collapsed strip */
        <div className="flex flex-col items-center w-12 py-4 gap-3 h-full"
          style={{ background: "#f9f8f6", borderLeft: "1px solid #e8e6e1" }}>
          <button
            onClick={() => setCollapsed(false)}
            title="Expand Artifacts"
            className="flex items-center justify-center w-8 h-8 rounded-xl cursor-pointer border-none transition-all"
            style={{ background: "#f3f0ff", color: "#8b5cf6" }}
          >
            <Code2 size={15} />
          </button>
        </div>
      )}
    </motion.aside>
  );
}

export default Artifact;