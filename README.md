# 🌟 NovaMind: Distributed Multi-Agent AI Operating Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-blue.svg)](https://react.dev/)
[![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph-orange.svg)](https://langchain.com/)
[![Redis](https://img.shields.io/badge/Cache-Redis-red.svg)](https://redis.io/)
[![Qdrant](https://img.shields.io/badge/VectorDB-Qdrant-purple.svg)](https://qdrant.tech/)

> **NovaMind** is an enterprise-grade, distributed Multi-Agent AI platform designed to automate complex developer and workplace workflows—including universal multi-stack code synthesis with a multi-runtime live interactive in-browser sandbox (Iframe, Sandpack React, Node.js WebContainers, and Piston Sandboxed Terminal), document Retrieval-Augmented Generation (RAG) over vector databases, high-precision document & slide synthesis (PDF/PPTX), computer vision OCR & image analysis, and real-time live web research.

---

## 📑 Table of Contents
1. [Key Features & Capabilities](#-key-features--capabilities)
2. [Multi-Runtime Preview System](#-multi-runtime-preview-system)
3. [System Architecture & Data Flow](#-system-architecture--data-flow)
4. [The 8 Specialized Autonomous Agents](#-the-8-specialized-autonomous-agents)
5. [Microservices Overview](#-microservices-overview)
6. [Tech Stack](#-tech-stack)
7. [License & Author] .(#-license--author)

---

## 🚀 Key Features & Capabilities

- ⚡ **Multi-Agent Orchestration**: Powered by **LangGraph StateGraph** featuring dynamic conditional routing and pipelined search-to-chat context synthesis.
- 🏎️ **Two-Tier Hybrid Router**: Evaluates deterministic regex heuristics in $<1\text{ms}$ for ~70% of standard queries before falling back to zero-shot LLM classification, reducing routing latency by **95%**.
- 💻 **Universal Multi-Runtime Live Sandbox**: Supports HTML/CSS/JS (Iframe), React (Sandpack), Node.js Backend (WebContainers), and Python/Java/C++/Go/Rust/SQL (Piston Terminal).
- 🛡️ **Self-Healing LLM Failover**: Automatically cascades across Groq, Google Gemini 3.6 Flash, and OpenRouter DeepSeek upon 401/429/5xx errors with zero client downtime.
- 📄 **PDF Vector RAG Pipeline**: Ingests uploaded PDF documents, applies recursive semantic chunking (`chunkSize: 1000`, `overlap: 200`), indexes dense embeddings in **Qdrant Vector DB**, and generates hallucination-resistant answers with **Google Gemini 3.6 Flash**.
- 📊 **Automated Document Synthesis**: Stream-renders professional A4 PDF reports via **PDFKit** and 16:9 PowerPoint slide decks via **PptxGenJS**, delivered through AWS S3 24-hour presigned download links.
- ⚡ **Redis High-Performance Layer**: Sub-millisecond distributed session verification, 20-message FIFO sliding-window conversation memory with 24h TTL eviction, and token-bucket sliding-window rate limiting.
- 💳 **Secure Monetization & Metered Usage**: Integrated with **Razorpay Orders API** featuring server-side **HMAC SHA-256** cryptographic signature verification and an automated credit ledger.

---

## 🖥️ Multi-Runtime Preview System

NovaMind automatically determines the exact runtime needed for any generated codebase and boots the corresponding in-browser engine:

| Language / Stack | Runtime Engine | Description |
|---|---|---|
| **Vanilla HTML/CSS/JS** | `iframe` | Isolated `srcDoc` sandbox with injected Tailwind CSS & FontAwesome CDNs. |
| **React (JSX/TSX)** | `Sandpack` | In-browser live React bundler powered by CodeSandbox. |
| **Node.js Backends** | `WebContainer` | StackBlitz WebAssembly Node.js engine with real `npm install` and live server port mapping. |
| **Python / Java / C++ / Go / Rust / SQL** | `Piston` (`execute`) | Proxied execution engine via `/api/execute` with interactive stdin and terminal stdout. |
| **Mobile (Flutter / React Native)** | `code-only` | Syntax-highlighted Monaco editor with local execution guides. |

---

## 📐 System Architecture & Data Flow

```
                                  +---------------------------+
                                  |   React 19 + Vite Client   |
                                  |  (Redux Toolkit, Monaco,  |
                                  |   Sandpack, WebContainer) |
                                  +-------------+-------------+
                                                | HTTP / Cookies
                                                v
                                  +---------------------------+
                                  |        API Gateway        |
                                  |   (Port 8000 - Express)   |
                                  | - Cookie Auth Middleware  |
                                  | - Redis Session Lookup    |
                                  | - x-user-id Header Inject |
                                  +-------------+-------------+
                                                |
         +--------------------+-----------------+--------------------+--------------------+
         | Proxy (Public)     | Proxy (Protected)                    | Proxy (Protected)  | Proxy (Protected)
         v                    v                                      v                    v
+-----------------+  +-----------------+                    +-----------------+  +-----------------+
|  Auth Service   |  |  Chat Service   |                    | Billing Service |  |  Agent Service  |
|   (Port 8001)   |  |   (Port 8002)   |                    |   (Port 8004)   |  |   (Port 8003)   |
| - Firebase Auth |  | - Conversations |                    | - Razorpay Order|  | - LangGraph WF  |
| - User Mongo DB |  | - Messages &    |                    | - HMAC SHA256   |  | - 8 AI Agents   |
| - Session Store |  |   Artifacts     |                    |   Verification  |  | - Piston Proxy  |
| - Credit Ledger |  | - History API   |                    | - Plan Upgrade  |  | - Multi-Model   |
+--------+--------+  +--------+--------+                    +--------+--------+  | - S3 Storage    |
         |                    |                                      |           | - Qdrant Vector |
         +--------------------+------------------+-------------------+           +--------+--------+
                              |                  |                                        |
                              v                  v                                        v
                     +-----------------+  +-----------------+                    +-----------------+
                     | MongoDB Cluster |  |   Redis Cache   |                    |   External APIs |
                     | (Users, Chats,  |  | (Sessions, Rate |                    | - Groq / Gemini |
                     |  Payments)      |  |  Limits, Memory)|                    | - OpenRouter    |
                     +-----------------+  +-----------------+                    | - Piston API    |
                                                                                 | - AWS S3        |
                                                                                 | - Tavily Search |
                                                                                 | - Qdrant Cloud  |
                                                                                 +-----------------+
```

---

## 🤖 The 8 Specialized Autonomous Agents

| # | Agent Name | Backed Model / Tooling | Output Deliverable | Cost |
| :- | :--- | :--- | :--- | :--- |
| 1 | **Chat Agent** | Groq (`openai/gpt-oss-120b`) / Gemini | Clean GitHub-flavored Markdown with syntax highlighting | 1 Credit |
| 2 | **Search Agent** | Tavily AI Search Engine | Top 4 live snippets + 5 curated images | 5 Credits |
| 3 | **Coding Agent** | OpenRouter (`deepseek-chat`) / Gemini | Multi-runtime code artifacts (Iframe, Sandpack, WebContainer, Piston) | 10 Credits |
| 4 | **PDF Agent** | Groq + `pdfkit` + AWS S3 | Professional styled A4 PDF download link | 10 Credits |
| 5 | **PPT Agent** | Groq + `pptxgenjs` + AWS S3 | 7-10 slide widescreen PowerPoint (.pptx) deck | 10 Credits |
| 6 | **Vision Agent** | Groq + Pollinations AI + AWS S3 | 8K photo-realistic image generation with direct download | 10 Credits |
| 7 | **PDF RAG Agent** | `pdf-parse` + Gemini Embeddings + Qdrant | Dense vector search & grounded hallucination-free QA | 10 Credits |
| 8 | **Image Analyzer Agent** | Multimodal Google Gemini 3.6 Flash | Optical character recognition (OCR) & visual chart analysis | 10 Credits |

---

## 🧩 Microservices Overview

| Microservice | Port | Primary Responsibilities |
| :--- | :--- | :--- |
| **API Gateway** | `8000` | Ingress reverse proxy, CORS, cookie auth parsing, Redis session verification, `x-user-id` header injection. |
| **Auth Service** | `8001` | Firebase Google OAuth token verification, MongoDB User schema, credit ledger, session creation. |
| **Chat Service** | `8002` | Conversation threads CRUD, message persistence, polymorphic code artifacts & image attachments. |
| **Agent Service** | `8003` | LangGraph state graph, 8 AI agents, multi-model execution, Piston code runner, Qdrant Vector RAG, AWS S3 storage. |
| **Billing Service** | `8004` | Razorpay Orders API, server-side HMAC SHA-256 verification, user tier upgrades. |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Redux Toolkit, Tailwind CSS v4, Motion (Framer Motion), Microsoft Monaco Editor (`@monaco-editor/react`), Lucide Icons, Web Speech API.
- **Backend**: Node.js (ES6+), Express.js, `express-http-proxy`, Morgan, Cookie-Parser, Multer.
- **AI & Orchestration**: LangGraph (`@langchain/langgraph`), LangChain Core, Tavily Search, Google Generative AI Embeddings (`gemini-embedding-001`), DeepSeek-Chat, Google Gemini 3.6 Flash, Groq (`gpt-oss-120b`).
- **Databases & Caching**: MongoDB (Mongoose ODM), Redis (`ioredis`), Qdrant Vector Database.
- **Cloud, Storage & Payments**: AWS S3 (`@aws-sdk/client-s3`), Presigned URLs, Razorpay Orders API, Firebase Admin SDK, Docker.

---

## 📜 License & Author

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

Developed with ❤️ by **[Sanskar Kishor Jadhav](https://github.com/sanskarjadhav015)**.
