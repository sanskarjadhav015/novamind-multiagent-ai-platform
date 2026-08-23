# 🌟 NovaMind: Distributed Multi-Agent AI Operating Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-blue.svg)](https://react.dev/)
[![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph-orange.svg)](https://langchain.com/)
[![Redis](https://img.shields.io/badge/Cache-Redis-red.svg)](https://redis.io/)
[![Qdrant](https://img.shields.io/badge/VectorDB-Qdrant-purple.svg)](https://qdrant.tech/)

> **NovaMind** is an enterprise-grade, distributed Multi-Agent AI platform designed to automate complex developer and workplace workflows—including multi-file full-stack web application synthesis with a real-time interactive in-browser sandbox, document Retrieval-Augmented Generation (RAG) over vector databases, high-precision document & slide synthesis (PDF/PPTX), computer vision OCR & image analysis, and real-time live web research.

---

## 📑 Table of Contents
1. [Key Features & Capabilities](#-key-features--capabilities)
2. [System Architecture & Data Flow](#-system-architecture--data-flow)
3. [The 8 Specialized Autonomous Agents](#-the-8-specialized-autonomous-agents)
4. [Microservices Overview](#-microservices-overview)
5. [Tech Stack](#-tech-stack)
6. [Getting Started & Local Setup](#-getting-started--local-setup)
7. [Environment Variables Guide](#-environment-variables-guide)
8. [License & Author](#-license--author)

---

## 🚀 Key Features & Capabilities

- ⚡ **Multi-Agent Orchestration**: Powered by **LangGraph StateGraph** featuring dynamic conditional routing and pipelined search-to-chat context synthesis.
- 🏎️ **Two-Tier Hybrid Router**: Evaluates deterministic regex heuristics in $<1\text{ms}$ for ~70% of standard queries before falling back to zero-shot LLM classification, reducing routing latency by **95%**.
- 💻 **Live Monaco Code Sandbox**: Synthesizes structured multi-file applications (`index.html`, `style.css`, `script.js`) and renders them in an isolated, secure browser `iframe` sandbox (`sandbox="allow-scripts allow-modals"`).
- 📄 **PDF Vector RAG Pipeline**: Ingests uploaded PDF documents, applies recursive semantic chunking (`chunkSize: 1000`, `overlap: 200`), indexes dense embeddings in **Qdrant Vector DB**, and generates hallucination-resistant answers with **Google Gemini 3.6 Flash**.
- 📊 **Automated Document Synthesis**: Stream-renders professional A4 PDF reports via **PDFKit** and 16:9 PowerPoint slide decks via **PptxGenJS**, delivered through AWS S3 24-hour presigned download links.
- ⚡ **Redis High-Performance Layer**: Sub-millisecond distributed session verification, 20-message FIFO sliding-window conversation memory with 24h TTL eviction, and token-bucket sliding-window rate limiting.
- 💳 **Secure Monetization & Metered Usage**: Integrated with **Razorpay Orders API** featuring server-side **HMAC SHA-256** cryptographic signature verification and an automated credit ledger.

---

## 📐 System Architecture & Data Flow

```
                                  +---------------------------+
                                  |   React 19 + Vite Client   |
                                  |  (Redux Toolkit, Monaco,  |
                                  |   Web Speech API, Motion) |
                                  +-------------+-------------+
                                                | HTTP / Cookies
                                                v
                                  +---------------------------+
                                  |        API Gateway        |
                                  |   (Port 5000 - Express)   |
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
|   (Port 5001)   |  |   (Port 5002)   |                    |   (Port 5003)   |  |   (Port 5004)   |
| - Firebase Auth |  | - Conversations |                    | - Razorpay Order|  | - LangGraph WF  |
| - User Mongo DB |  | - Messages &    |                    | - HMAC SHA256   |  | - 8 AI Agents   |
| - Session Store |  |   Artifacts     |                    |   Verification  |  | - Multi-Model   |
| - Credit Ledger |  | - History API   |                    | - Plan Upgrade  |  | - S3 Storage    |
+--------+--------+  +--------+--------+                    +--------+--------+  | - Qdrant Vector |
         |                    |                                      |           +--------+--------+
         +--------------------+------------------+-------------------+                    |
                              |                  |                                        |
                              v                  v                                        v
                     +-----------------+  +-----------------+                    +-----------------+
                     | MongoDB Cluster |  |   Redis Cache   |                    |   External APIs |
                     | (Users, Chats,  |  | (Sessions, Rate |                    | - Groq / Gemini |
                     |  Payments)      |  |  Limits, Memory)|                    | - OpenRouter    |
                     +-----------------+  +-----------------+                    | - AWS S3        |
                                                                                 | - Tavily Search |
                                                                                 | - Qdrant Cloud  |
                                                                                 +-----------------+
```

---

## 🤖 The 8 Specialized Autonomous Agents

| # | Agent Name | Backed Model / Tooling | Input / Trigger | Output Artifact / Deliverable | Cost |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Chat Agent** | Groq (`openai/gpt-oss-120b`) | Text prompt, DSA problems, Q&A, or pipelined search context | Clean GitHub-flavored Markdown response with syntax-highlighted code blocks | 1 Credit |
| 2 | **Search Agent** | Tavily AI Search Engine | Real-time queries, breaking news, entity lookups | Top 4 sanitized search snippets + up to 5 curated images (pipelined to Chat Agent) | 5 Credits |
| 3 | **Coding Agent** | OpenRouter (`deepseek/deepseek-chat`) | Prompts requesting websites, apps, UI components, games, dashboards | Multi-file structured JSON (`index.html`, `style.css`, `script.js`) rendered in Monaco & Live Iframe | 10 Credits |
| 4 | **PDF Agent** | Groq + `pdfkit` + AWS S3 | Prompts asking for PDF reports, study guides, documentation | Professional A4 PDF generated via PDFKit stream, stored on S3, returned as 24-hour Presigned Link | 10 Credits |
| 5 | **PPT Agent** | Groq + `pptxgenjs` + AWS S3 | Prompts asking for PowerPoint decks, slides, presentations | 7-10 slide widescreen (.pptx) presentation with custom palettes & cards, stored on S3, returned as 24h link | 10 Credits |
| 6 | **Vision Agent** | Groq + Pollinations AI + AWS S3 | Prompts asking to generate images/artwork | 8K photographic prompt refinement, direct image synthesis, AWS S3 persistence & presigned display URL | 10 Credits |
| 7 | **PDF RAG Agent** | `pdf-parse` + Gemini Embeddings + Qdrant Vector Store | Uploaded `.pdf` attachment + question | Ingestion into Qdrant, semantic vector similarity search top-5 chunks, hallucination-resistant factual synthesis | 10 Credits |
| 8 | **Image Analyzer Agent** | Multimodal Google Gemini 3.6 Flash | Uploaded image (`.png`, `.jpg`, `.webp`) + optional question | Base64-encoded image ingestion, optical character recognition (OCR), chart & diagram breakdown, visual Q&A | 10 Credits |

---

## 🧩 Microservices Overview

| Microservice | Port | Primary Responsibilities |
| :--- | :--- | :--- |
| **API Gateway** | `5000` | Ingress reverse proxy, CORS, cookie auth parsing, Redis session verification, `x-user-id` header injection. |
| **Auth Service** | `5001` | Firebase Google OAuth token verification, MongoDB User schema, credit ledger, session creation. |
| **Chat Service** | `5002` | Conversation threads CRUD, message persistence, polymorphic code artifacts & image attachments. |
| **Billing Service** | `5003` | Razorpay Orders API, server-side HMAC SHA-256 verification, user tier upgrades. |
| **Agent Service** | `5004` | LangGraph state graph, 8 AI agents, multi-model execution, Qdrant Vector RAG, AWS S3 storage. |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Redux Toolkit, Tailwind CSS v4, Motion (Framer Motion), Microsoft Monaco Editor (`@monaco-editor/react`), Lucide Icons, Web Speech API.
- **Backend**: Node.js (ES6+), Express.js, `express-http-proxy`, Morgan, Cookie-Parser, Multer.
- **AI & Orchestration**: LangGraph (`@langchain/langgraph`), LangChain Core, Tavily Search, Google Generative AI Embeddings (`gemini-embedding-001`), DeepSeek-Chat, Google Gemini 3.6 Flash, Groq (`gpt-oss-120b`).
- **Databases & Caching**: MongoDB (Mongoose ODM), Redis (`ioredis`), Qdrant Vector Database.
- **Cloud, Storage & Payments**: AWS S3 (`@aws-sdk/client-s3`), Presigned URLs, Razorpay Orders API, Firebase Admin SDK, Docker.

---

## 💻 Getting Started & Local Setup

### Prerequisites:
- **Node.js**: `v20+`
- **Redis**: Running locally (`localhost:6379`) or Redis Cloud URI
- **MongoDB**: Running locally (`localhost:27017`) or MongoDB Atlas URI

### 1. Clone the Repository:
```bash
git clone https://github.com/sanskarjadhav015/novamind-multiagent-ai-platform.git
cd novamind-multiagent-ai-platform
```

### 2. Backend Setup:
```bash
# Start Redis (via Docker or local service)
docker run -d -p 6379:6379 --name novamind-redis redis:alpine

# Install gateway and microservices dependencies
cd NovaMind/backend/gateway && npm install
cd ../services/auth && npm install
cd ../services/chat && npm install
cd ../services/billing && npm install
cd ../services/agent && npm install
```

### 3. Frontend Setup:
```bash
cd ../../../frontend
npm install
npm run dev
```

---

## 📜 License & Author

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

Developed with ❤️ by **[Sanskar Kishor Jadhav](https://github.com/sanskarjadhav015)**.
