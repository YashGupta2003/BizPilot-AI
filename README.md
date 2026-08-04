<div align="center">

# 🚀 BizPilot AI

### *Your Autonomous AI Co-Pilot for Freelance Business Operations*

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Groq](https://img.shields.io/badge/Groq_AI-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://www.langchain.com/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

<br/>

**BizPilot AI** is a full-stack, AI-powered business management platform purpose-built for **freelancers and small businesses** — especially in the Indian market. It doesn't just track your business; it **thinks, drafts, predicts, and acts** using 13 specialized AI agents, a RAG knowledge base, voice AI, and ML-powered analytics.

From generating invoices with your voice, to predicting client lifetime value, to escalating overdue payments through legal channels — BizPilot automates every operational pain point so you can focus on the work you love.

<br/>

[Getting Started](#-getting-started) · [Features](#-the-19-features--deep-dive) · [Architecture](#-system-architecture) · [How It All Connects](#-how-it-works-as-a-unified-system) · [Tech Stack](#-tech-stack) · [API Reference](#-api-endpoints-reference)

</div>

---

## 📑 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [The 19 Features — Deep Dive](#-the-19-features--deep-dive)
  - [Core Business Operations](#-core-business-operations)
  - [AI-Powered Agents](#-ai-powered-agents)
  - [Business Intelligence & Analytics](#-business-intelligence--analytics)
  - [India-Specific Financial Tools](#-india-specific-financial-tools)
- [How It Works as a Unified System](#-how-it-works-as-a-unified-system)
- [The AI Agent Ecosystem](#-the-ai-agent-ecosystem)
- [RAG Knowledge Pipeline](#-rag-knowledge-pipeline)
- [Database Design](#-database-design)
- [Getting Started](#-getting-started)
- [Learning Checkpoints](#-learning-checkpoints)
- [Future Scope](#-future-scope)

---

## 🔥 The Problem

Every freelancer and small business owner faces the same operational nightmare:

> *"I'm great at my craft, but I'm drowning in invoices, tax calculations, client follow-ups, contract reviews, and payment chasing."*

- 📄 **Invoicing takes hours** — manually calculating line items, generating PDFs, tracking status
- 💸 **Payments get delayed** — no systematic follow-up, clients "forget" to pay, no escalation process
- 📊 **No visibility into business health** — no idea which clients are profitable, when income gaps are coming, or if pricing is competitive
- 📝 **Contracts are risky** — freelancers sign without understanding dangerous clauses
- 🧠 **Decision fatigue** — pricing, negotiating, forecasting, tax planning — all done by gut feeling
- 🔥 **Burnout is invisible** — until it's too late

Most tools solve *one* of these problems. BizPilot solves **all of them** — with AI that actually understands your business context.

---

## 💡 The Solution

BizPilot AI is an **autonomous business co-pilot** that covers the **entire freelance business lifecycle**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        THE FREELANCE LIFECYCLE                          │
│                                                                        │
│   🎯 FIND          📝 PRICE         🤝 CLOSE         🛠️ DELIVER        │
│   Client           Smart            AI Contract      Meeting Notes     │
│   Profiler         Pricing          Generator        Extractor         │
│   Health Score     Engine           Negotiation      Scope Drift       │
│   LTV Predictor                     Simulator        Detector          │
│                                     Win Rate                           │
│                                     Analytics                          │
│                                                                        │
│   💰 GET PAID      📊 MANAGE        🧮 COMPLY        🔮 GROW           │
│   AI Invoicing     Dashboard        GST              Cash Flow         │
│   Voice Invoice    Client 360°      Calculator       Forecast          │
│   WhatsApp         Activity         Tax Filing       Burnout           │
│   Reminders        Feed             Assistant        Predictor         │
│   Legal            Portfolio ROI    Currency          Client LTV       │
│   Escalation                        Converter                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend

| Layer | Technology | Why |
|---|---|---|
| **Web Framework** | FastAPI + Uvicorn | Async-native, auto-generated OpenAPI docs, dependency injection, blazing fast |
| **Database** | MongoDB + Motor (async driver) | Schema flexibility for varying invoice structures, powerful aggregation pipelines |
| **Authentication** | JWT (python-jose) + bcrypt (passlib) | Industry-standard stateless auth with secure password hashing |
| **Validation** | Pydantic v2 + Pydantic Settings | Type-safe request/response schemas + centralized environment config |
| **AI / LLM** | Groq (llama-3.3-70b-versatile) + OpenAI (gpt-4o-mini) | Fast inference for real-time agents; OpenAI as fallback |
| **Agent Orchestration** | LangChain + LangGraph | Multi-agent workflows (negotiation simulator uses 3 concurrent agents) |
| **Voice AI** | Groq Whisper Large v3 Turbo | State-of-the-art speech-to-text for voice invoicing |
| **RAG Pipeline** | SentenceTransformers (all-MiniLM-L6-v2) + NumPy | Local 384-dimensional embeddings + cosine similarity retrieval |
| **ML Analytics** | Scikit-Learn (LinearRegression) + NumPy | Cash flow forecasting, income volatility calculation |
| **PDF Generation** | ReportLab | Professional invoice PDF creation |
| **WhatsApp** | Twilio SDK | Automated payment reminder delivery |
| **Exchange Rates** | Frankfurter API (ECB data) | Live multi-currency conversion |

### Frontend

| Layer | Technology | Why |
|---|---|---|
| **UI Framework** | React 18.3 + Vite 5.2 | Component-based architecture with lightning-fast HMR |
| **Routing** | React Router DOM v6 | Declarative client-side routing with protected routes |
| **State Management** | React Context API | Lightweight global auth state without Redux overhead |
| **HTTP Client** | Axios | Centralized interceptor with auto-401 handling and token injection |
| **Data Visualization** | Recharts | Area, Line, Bar, Pie, Radar, and Composed charts |
| **Icons** | Lucide React | Beautiful, consistent icon system |
| **Voice Capture** | MediaRecorder API | Browser-native audio recording for voice-to-invoice |
| **Styling** | Custom CSS Design System | Cards, grids, badges, animations — no framework dependency |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                     │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Pages   │  │Components│  │ Context  │  │    Services      │   │
│  │  (23)    │──│  (12)    │  │ (Auth)   │  │ (24 API modules) │   │
│  └──────────┘  └──────────┘  └──────────┘  └────────┬─────────┘   │
│                                                      │              │
│                                          Axios + JWT Bearer Token   │
└──────────────────────────────────────────────────────┼──────────────┘
                                                       │
                                                 HTTP / REST
                                                       │
┌──────────────────────────────────────────────────────┼──────────────┐
│                      BACKEND (FastAPI + Uvicorn)     │              │
│                                                      ▼              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    ROUTES LAYER (26 routers)                 │   │
│  │  auth · clients · invoices · chat · dashboard · voice ·     │   │
│  │  contracts · meetings · disputes · escalation · scope ·     │   │
│  │  health · ltv · pricing · winrate · portfolio · burnout ·   │   │
│  │  tax · currency · negotiation · profiler · risk ·           │   │
│  │  forecast · whatsapp · activity · client360                 │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│         ┌───────────────┼───────────────┐                          │
│         ▼               ▼               ▼                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │
│  │   AGENTS    │ │  SERVICES   │ │    RAG      │                  │
│  │  (13 AI)    │ │ (10 engines)│ │  Pipeline   │                  │
│  │             │ │             │ │             │                  │
│  │ chat        │ │ invoice     │ │ loader      │                  │
│  │ invoice     │ │ health      │ │ embedder    │                  │
│  │ contract    │ │ ltv         │ │ retriever   │                  │
│  │ meeting     │ │ pricing     │ │             │                  │
│  │ negotiation │ │ portfolio   │ └──────┬──────┘                  │
│  │ dispute     │ │ burnout     │        │                          │
│  │ escalation  │ │ forecast    │   SentenceTransformers            │
│  │ scope       │ │ winrate     │   (all-MiniLM-L6-v2)             │
│  │ profiler    │ │ tax         │   384-dim vectors                 │
│  │ risk        │ │ currency    │                                   │
│  │ voice       │ └──────┬──────┘                                   │
│  │ whatsapp    │        │                                          │
│  │ voice_trans │        │                                          │
│  └──────┬──────┘  ┌─────┴─────┐                                   │
│         │         │   CORE    │                                    │
│         │         │           │                                    │
│    ┌────┴────┐    │ config    │                                    │
│    │ LLM APIs│    │ database  │                                    │
│    │         │    │ security  │                                    │
│    │ Groq    │    │ deps      │                                    │
│    │ OpenAI  │    └─────┬─────┘                                    │
│    │ Twilio  │          │                                          │
│    └─────────┘          ▼                                          │
│                  ┌─────────────┐                                   │
│                  │   MongoDB   │                                   │
│                  │ (14 colls)  │                                   │
│                  └─────────────┘                                   │
└────────────────────────────────────────────────────────────────────┘
```

### How the Layers Communicate

1. **Frontend → Routes**: React components call API service modules, which use Axios to send HTTP requests with JWT Bearer tokens to FastAPI route endpoints.
2. **Routes → Services/Agents**: Routes handle HTTP concerns (parsing params, auth verification, status codes), then delegate business logic to specialized services or AI agents.
3. **Services → Database**: Business services perform calculations (tax math, health scores, LTV predictions) and read/write results to MongoDB collections via Motor (async).
4. **Agents → LLM APIs**: AI agents construct prompts, call Groq/OpenAI APIs, parse structured JSON from responses, and fall back to deterministic logic when API keys are unavailable.
5. **RAG Pipeline → Embeddings**: Document uploads are parsed → chunked → embedded locally using SentenceTransformers → stored in MongoDB → retrieved via NumPy cosine similarity at query time.

---

## 📁 Project Structure

```
BizPilot-AI/
│
├── 📂 backend/
│   ├── 📂 app/
│   │   ├── 📂 core/                    # System infrastructure
│   │   │   ├── config.py               # Pydantic BaseSettings — all env vars centralized
│   │   │   ├── database.py             # Async Motor MongoDB connection + index creation
│   │   │   ├── security.py             # bcrypt hashing + JWT token creation/verification
│   │   │   └── deps.py                 # FastAPI auth dependencies (header & query token)
│   │   │
│   │   ├── 📂 models/
│   │   │   └── serializers.py          # MongoDB ObjectId → string JSON conversion
│   │   │
│   │   ├── 📂 schemas/                 # Pydantic v2 request/response validation
│   │   │   ├── auth_schema.py          # Signup, login, token response schemas
│   │   │   ├── client_schema.py        # Client CRUD schemas
│   │   │   ├── invoice_schema.py       # Invoice line items, status update schemas
│   │   │   ├── chat_schema.py          # Chat message & RAG response schemas
│   │   │   ├── voice_schema.py         # Audio transcription & voice invoice schemas
│   │   │   ├── negotiation_schema.py   # Negotiation session & message schemas
│   │   │   ├── currency_schema.py      # GST calculation schemas
│   │   │   ├── forecast_schema.py      # Cash flow prediction schemas
│   │   │   ├── risk_schema.py          # Contract risk report schemas
│   │   │   ├── profiler_schema.py      # Client psychographic profile schemas
│   │   │   └── whatsapp_schema.py      # WhatsApp reminder schemas
│   │   │
│   │   ├── 📂 agents/                  # 13 Specialized AI Agents
│   │   │   ├── chat_agent.py           # Central assistant — intent detection + RAG fallback
│   │   │   ├── invoice_agent.py        # Plain English → structured JSON line items
│   │   │   ├── voice_invoice_agent.py  # Spoken audio → fuzzy client match → invoice
│   │   │   ├── voice_transcription_agent.py  # Groq Whisper audio-to-text
│   │   │   ├── contract_agent.py       # AI legal contract generator
│   │   │   ├── meeting_agent.py        # Meeting notes → deliverables + scope email
│   │   │   ├── negotiation_agent.py    # Multi-agent simulator (client + coach + scorer)
│   │   │   ├── dispute_agent.py        # Invoice dispute resolver
│   │   │   ├── escalation_agent.py     # 5-stage legal escalation document generator
│   │   │   ├── scope_agent.py          # Scope drift detector + change order generator
│   │   │   ├── profiler_agent.py       # NLP psychographic risk analyzer
│   │   │   ├── risk_analyzer_agent.py  # Contract risk clause auditor
│   │   │   └── whatsapp_agent.py       # Payment reminder drafter + Twilio sender
│   │   │
│   │   ├── 📂 services/                # 10 Business Logic Engines
│   │   │   ├── invoice_service.py      # Invoice numbering, totals, ReportLab PDF builder
│   │   │   ├── health_service.py       # 5-factor client health scoring (0–100)
│   │   │   ├── ltv_service.py          # 12-month client lifetime value predictor
│   │   │   ├── pricing_service.py      # Market benchmark pricing with multipliers
│   │   │   ├── portfolio_service.py    # Service category ROI analytics
│   │   │   ├── burnout_service.py      # Income volatility & gap predictor
│   │   │   ├── forecast_service.py     # Scikit-Learn linear regression forecaster
│   │   │   ├── winrate_service.py      # Proposal win rate analyzer + probability predictor
│   │   │   ├── tax_service.py          # Section 44ADA tax + advance tax + GST assistant
│   │   │   └── currency_service.py     # Multi-currency rates + Indian GST calculator
│   │   │
│   │   ├── 📂 rag/                     # Retrieval-Augmented Generation Pipeline
│   │   │   ├── document_loader.py      # PDF/DOCX/TXT parser + overlapping text chunker
│   │   │   ├── embedder.py             # SentenceTransformers 384-dim vector encoder
│   │   │   └── retriever.py            # MongoDB vector storage + cosine similarity search
│   │   │
│   │   ├── 📂 routes/                  # 26 FastAPI HTTP Routers
│   │   │   ├── auth_routes.py          # POST /signup, /login — GET /me
│   │   │   ├── client_routes.py        # Full CRUD + invoice aggregation
│   │   │   ├── client_360_routes.py    # Unified 360° client view (merges 7+ collections)
│   │   │   ├── invoice_routes.py       # CRUD + AI text generation + PDF download
│   │   │   ├── chat_routes.py          # Chat messages + document upload/chunking
│   │   │   ├── dashboard_routes.py     # MongoDB aggregation pipeline analytics
│   │   │   ├── voice_routes.py         # Audio upload → transcribe → invoice
│   │   │   ├── contract_routes.py      # AI contract generation + history
│   │   │   ├── meeting_routes.py       # Meeting extraction + draft invoice creation
│   │   │   ├── negotiation_routes.py   # Practice simulator sessions
│   │   │   ├── dispute_routes.py       # Dispute resolution + history
│   │   │   ├── escalation_routes.py    # Overdue invoice escalation pipeline
│   │   │   ├── scope_routes.py         # Scope lock + drift detection
│   │   │   ├── health_routes.py        # Client health score leaderboard
│   │   │   ├── ltv_routes.py           # LTV predictions + rankings
│   │   │   ├── pricing_routes.py       # Smart pricing recommendations
│   │   │   ├── winrate_routes.py       # Proposal logging + win predictions
│   │   │   ├── portfolio_routes.py     # Portfolio ROI insights
│   │   │   ├── burnout_routes.py       # Income stability predictions
│   │   │   ├── forecast_routes.py      # Cash flow forecast
│   │   │   ├── tax_routes.py           # Tax report + checklist
│   │   │   ├── currency_routes.py      # Exchange rates + GST calculator + SAC codes
│   │   │   ├── risk_routes.py          # Contract risk analysis
│   │   │   ├── profiler_routes.py      # Client psychographic profiling
│   │   │   ├── whatsapp_routes.py      # Payment reminder preview + send
│   │   │   └── activity_routes.py      # Unified activity feed + smart alerts
│   │   │
│   │   └── main.py                     # FastAPI app entry — CORS, lifespan, router mounting
│   │
│   ├── 📂 data/
│   │   ├── invoices/                   # Auto-generated PDF invoices
│   │   ├── uploads/                    # Uploaded documents (PDF, DOCX, TXT)
│   │   └── vector_db/                  # Local vector data storage
│   │
│   ├── requirements.txt               # 51 Python dependencies
│   ├── .env.example                    # Environment variable template
│   └── test_mongo_connection.py        # Database connectivity diagnostic
│
├── 📂 frontend/
│   ├── 📂 src/
│   │   ├── 📂 pages/                  # 23 Page Components
│   │   │   ├── DashboardPage.jsx       # KPIs, alerts, forecast, burnout, top clients
│   │   │   ├── ClientsPage.jsx         # Client list + CRUD
│   │   │   ├── Client360Page.jsx       # Unified 360° client view
│   │   │   ├── InvoicesPage.jsx        # Invoice management table
│   │   │   ├── AssistantPage.jsx       # RAG chatbot + document upload
│   │   │   ├── ContractPage.jsx        # AI contract generator
│   │   │   ├── MeetingPage.jsx         # Meeting notes extractor
│   │   │   ├── NegotiationPage.jsx     # AI negotiation simulator
│   │   │   ├── DisputePage.jsx         # Invoice dispute resolver
│   │   │   ├── EscalationPage.jsx      # Payment escalation pipeline
│   │   │   ├── ScopePage.jsx           # Scope drift detector
│   │   │   ├── HealthDashboardPage.jsx # Client health scores
│   │   │   ├── LTVPage.jsx             # Client lifetime value
│   │   │   ├── PricingPage.jsx         # Smart pricing engine
│   │   │   ├── WinRatePage.jsx         # Proposal win rate analytics
│   │   │   ├── PortfolioPage.jsx       # Portfolio ROI tracker
│   │   │   ├── BurnoutPage.jsx         # Burnout & income stability
│   │   │   ├── TaxPage.jsx             # Tax filing assistant
│   │   │   ├── CurrencyGSTPage.jsx     # Currency converter + GST tools
│   │   │   ├── RemindersPage.jsx       # WhatsApp payment reminders
│   │   │   ├── ProfilerPage.jsx        # Client psychographic profiler
│   │   │   ├── LoginPage.jsx           # Authentication
│   │   │   └── SignupPage.jsx          # Registration
│   │   │
│   │   ├── 📂 components/             # 12 Reusable UI Components
│   │   │   ├── layout/                 # AppLayout, Sidebar, ActivityFeed
│   │   │   ├── chat/                   # ChatBubble, DocumentUpload, RiskReportPanel
│   │   │   ├── dashboard/              # BurnoutWidget, CashFlowForecast, SmartAlerts
│   │   │   ├── clients/                # ClientFormModal
│   │   │   ├── invoices/               # AIInvoiceModal, VoiceInvoiceModal, GSTCalculator
│   │   │   └── ProtectedRoute.jsx      # Auth guard wrapper
│   │   │
│   │   ├── 📂 services/               # 24 API Service Modules
│   │   │   ├── api.js                  # Axios instance + interceptors
│   │   │   ├── authService.js          # Login, signup, profile
│   │   │   ├── clientService.js        # Client CRUD operations
│   │   │   ├── invoiceService.js       # Invoice operations + PDF URLs
│   │   │   ├── chatService.js          # Chat messages + document upload
│   │   │   └── ...                     # 19 more feature-specific API modules
│   │   │
│   │   ├── 📂 context/
│   │   │   └── AuthContext.jsx         # Global auth state + localStorage persistence
│   │   │
│   │   ├── App.jsx                     # Router configuration + route definitions
│   │   ├── main.jsx                    # React entry point (StrictMode)
│   │   └── index.css                   # Global design system (cards, grids, badges)
│   │
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── 📂 docs/                            # Project documentation & diagrams
├── 📂 assets/                          # Branding assets & screenshots
├── .gitignore
└── README.md                           # ← You are here
```

---

## ✨ The 19 Features — Deep Dive

### 💼 Core Business Operations

---

#### 1. 📊 Intelligent Dashboard

> **Route**: `GET /api/dashboard/summary`
> **Page**: `DashboardPage.jsx`

The command center of your business. Not a static summary — a **living, intelligent overview** that aggregates data across all 14 MongoDB collections using advanced aggregation pipelines (`$match`, `$group`, `$sort`, `$lookup`).

**How it works:**
1. The `dashboard_routes.py` endpoint runs multiple MongoDB aggregation pipelines in parallel against the `invoices` collection, filtered by the authenticated user's `owner_id`.
2. **KPI Calculation**: Pipelines compute Total Revenue (sum of all `paid` invoices), Pending Amount (sum of `sent` invoices), Overdue Count (invoices past `due_date` that aren't `paid`), and Total Active Clients.
3. **Smart Alerts** (`SmartAlerts.jsx`): The `activity_routes.py` endpoint scans across invoices, clients, and contracts to surface high-priority alerts — overdue payments, at-risk clients, upcoming tax deadlines.
4. **Cash Flow Forecast** (`CashFlowForecast.jsx`): The `forecast_service.py` takes 6 months of monthly revenue data, trains a `LinearRegression` model from Scikit-Learn, and projects future revenue with confidence intervals.
5. **Burnout Widget** (`BurnoutWidget.jsx`): The `burnout_service.py` calculates income volatility using Coefficient of Variation (standard deviation / mean) and predicts the probability of an income gap next month.
6. **Top Clients Table**: A `$group` + `$sort` + `$limit` pipeline ranks clients by total paid revenue.

**The insight**: This dashboard doesn't just show what happened — it **predicts what's coming** (cash flow) and **warns you about risks** (burnout, overdue payments) before they become problems.

---

#### 2. 👥 Client Management & 360° View

> **Routes**: `GET/POST /api/clients`, `GET /api/client360/{id}`
> **Pages**: `ClientsPage.jsx`, `Client360Page.jsx`

Full CRUD operations for managing your client roster, plus a **unified 360-degree view** that merges data from 7+ MongoDB collections into a single comprehensive client profile.

**How it works:**
1. **CRUD Operations** (`client_routes.py`): Standard create, read, update, delete operations on the `clients` collection. Each client record stores name, email, company, hourly rate, project rate, notes, and contact information.
2. **360° Aggregation** (`client_360_routes.py`): When you open a client's 360° view, the endpoint simultaneously queries:
   - `invoices` — total revenue, payment history, average payment time
   - `contracts` — active contracts, terms, expiry dates
   - `meetings` — past meeting notes and extracted deliverables
   - `client_profiles` — psychographic risk profile
   - `whatsapp_reminders` — reminder history
   - `contract_risk_reports` — flagged risk clauses
   - `disputes` — past dispute records
3. **Health Badge**: Each client card shows a real-time health badge (Champion / Healthy / Caution / At Risk / Avoid) pulled from the Health Score engine.
4. **Payment Behavior Score**: Calculated from invoice payment patterns — how quickly they pay, how often they're late, dispute frequency.
5. **Activity Timeline**: A chronological feed of all interactions with the client across every feature.
6. **LTV Prediction Widget**: Shows the client's predicted 12-month future value.
7. **Priority Next Action**: AI-recommended next step (e.g., "Send overdue reminder", "Propose retainer", "Schedule check-in").

**The insight**: Instead of switching between invoices, contracts, and chat to understand a client, the 360° view gives you **everything in one place** — turning scattered data into actionable intelligence.

---

#### 3. 🧾 AI-Powered Invoicing System

> **Routes**: `POST /api/invoices/generate-from-text`, `POST /api/voice/to-invoice`
> **Pages**: `InvoicesPage.jsx`
> **Components**: `AIInvoiceModal.jsx`, `VoiceInvoiceModal.jsx`

Three ways to create invoices — manual, text-to-invoice, or voice-to-invoice — all producing professional PDFs with automatic line-item calculations.

**Method 1 — AI Text-to-Invoice:**
1. User types a plain English description: *"3 hours logo design at ₹1500/hr + 2 revisions at ₹500 each"*
2. The `invoice_agent.py` constructs a structured prompt and sends it to Groq's `llama-3.3-70b-versatile` model.
3. The LLM extracts structured JSON: `[{"description": "Logo Design", "quantity": 3, "rate": 1500}, {"description": "Revision", "quantity": 2, "rate": 500}]`
4. The agent uses a regex-based `_extract_json()` method to safely parse LLM output (handling markdown code blocks, extra text, etc.).
5. The `invoice_service.py` calculates subtotal, applies tax (if GST applicable), generates a unique invoice number (`INV-YYYYMMDD-XXXX`), and creates the MongoDB document.
6. `ReportLab` generates a professional PDF with header, client details, itemized table, totals, and footer — saved to `backend/data/invoices/`.

**Method 2 — Voice-to-Invoice:**
1. User clicks the microphone button. The `VoiceInvoiceModal.jsx` uses the browser's `MediaRecorder` API to capture audio.
2. The audio blob is uploaded to `POST /api/voice/to-invoice`.
3. `voice_transcription_agent.py` sends the audio to **Groq Whisper Large v3 Turbo** for transcription.
4. `voice_invoice_agent.py` uses **fuzzy string matching** to match spoken client names against the user's client database.
5. The same LLM extraction pipeline converts the transcribed text into structured line items.
6. The user reviews and edits the extracted items before confirming invoice creation.

**Method 3 — Manual Entry:**
1. User fills in client, line items, due date, and tax rate through the form.
2. Direct `POST /api/invoices` with structured data.

**Invoice Lifecycle Management:**
- Status tracking: `draft` → `sent` → `paid` (or `overdue` / `cancelled`)
- When an invoice is marked `paid`, the system prompts the user to log the proposal as "Won" in the Win Rate tracker — **cross-feature data sync**.
- One-click PDF download via `GET /api/invoices/{id}/pdf` with JWT token authentication.

---

### 🤖 AI-Powered Agents

---

#### 4. 🧠 RAG-Powered Business Assistant

> **Routes**: `POST /api/chat`, `POST /api/chat/upload-document`
> **Page**: `AssistantPage.jsx`
> **Components**: `ChatBubble.jsx`, `DocumentUpload.jsx`, `RiskReportPanel.jsx`

A context-aware AI assistant that answers questions about your uploaded documents (contracts, notes, proposals) using Retrieval-Augmented Generation.

**How the RAG pipeline works — step by step:**

```
                    DOCUMENT UPLOAD FLOW
  ┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │Upload │───▶│  Parse   │───▶│  Chunk   │───▶│  Embed   │───▶ MongoDB
  │PDF/   │    │(PyPDF/   │    │(500 char │    │(sentence │    (documents
  │DOCX/  │    │ docx/    │    │ windows  │    │transform │     collection)
  │TXT)   │    │ txt)     │    │ 80 char  │    │ ers 384d)│
  └──────┘    └──────────┘    │ overlap) │    └──────────┘
                               └──────────┘

                    QUERY FLOW
  ┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────┐
  │User  │───▶│  Embed   │───▶│ Cosine   │───▶│  Build   │───▶│ LLM  │
  │Query │    │  Query   │    │Similarity│    │ Context  │    │Answer│
  │      │    │ (384d)   │    │  Top-5   │    │ Prompt   │    │      │
  └──────┘    └──────────┘    └──────────┘    └──────────┘    └──────┘
```

1. **Document Upload** (`document_loader.py`): Accepts `.pdf` (PyPDF), `.docx` (python-docx), and `.txt` files. Extracts raw text content.
2. **Chunking** (`document_loader.py`): Splits text into 500-character chunks with 80-character overlap — the overlap ensures no information is lost at chunk boundaries.
3. **Embedding** (`embedder.py`): Each chunk is encoded into a 384-dimensional vector using the `all-MiniLM-L6-v2` model from SentenceTransformers. This runs **entirely locally** — no API calls, no data leaving your machine.
4. **Storage**: Chunk text + embedding vectors are stored in the MongoDB `documents` collection, tagged with `owner_id` and source filename.
5. **Query Processing** (`retriever.py`): When a user asks a question, the query is embedded into the same 384-dimensional space. NumPy computes **cosine similarity** (dot product of normalized vectors) against all stored chunks. The top 5 most relevant chunks are retrieved.
6. **Context-Augmented Response** (`chat_agent.py`): The retrieved chunks are injected into the LLM prompt as context. The model answers the question grounded in the actual document content — not hallucinated.

**Intent Detection**: The chat agent doesn't just do RAG. It uses keyword-based intent detection to route messages:
- *"Create invoice..."* → routes to the invoice agent
- *"Analyze risk..."* → routes to the risk analyzer
- Document-related questions → RAG pipeline
- General business questions → direct LLM response

---

#### 5. 📜 AI Contract Generator

> **Route**: `POST /api/contracts/generate`
> **Page**: `ContractPage.jsx`

Generates complete, legally-informed freelance contracts tailored to the project type, jurisdiction, and amount.

**How it works:**
1. User provides: project type (web development, design, consulting, etc.), contract amount, number of milestones, client's country (for jurisdiction), and any special terms.
2. The `contract_agent.py` constructs a detailed legal prompt specifying the AI should act as a freelance contract specialist.
3. The LLM generates a structured JSON response containing:
   - **Full contract text** with numbered clauses (scope of work, payment terms, IP rights, confidentiality, termination, dispute resolution, force majeure)
   - **Freelancer risk rating** (Low / Medium / High) with justification
   - **Plain-English summary** split into "What Protects You" and "What to Watch Out For"
   - **Jurisdiction-specific clauses** (e.g., Indian Contract Act for India, different arbitration clauses for US/UK clients)
4. The generated contract is saved to the `contracts` MongoDB collection.
5. The frontend provides a **copy-to-clipboard** button for easy export.

**Why this matters**: Most freelancers use generic contract templates or, worse, no contract at all. This generates **custom, risk-assessed contracts** in seconds — with plain-English explanations of what each clause means.

---

#### 6. 🎤 Meeting Notes Extractor

> **Route**: `POST /api/meetings/extract`
> **Page**: `MeetingPage.jsx`

Converts messy meeting notes or WhatsApp transcripts into structured, actionable business data — and automatically drafts a scope confirmation email.

**How it works:**
1. User pastes raw meeting notes (e.g., *"Talked to Priya about redesigning their website. She wants 5 pages, modern look, needs it by March. Budget around 40k. Doesn't want to pay for hosting."*)
2. The `meeting_agent.py` sends this to the LLM with a structured extraction prompt.
3. The LLM returns JSON with:
   - **Deliverables**: `["5-page website redesign", "Modern UI/UX design"]`
   - **Deadline**: `"March 2026"`
   - **Price discussed**: `₹40,000`
   - **Excluded items**: `["Hosting setup and maintenance"]`
   - **Key decisions**: Summary of agreements made
4. The agent also generates a **scope confirmation email** that the freelancer can send to the client — ensuring both parties agree on what was discussed.
5. A **draft invoice** is automatically created in the database with the extracted deliverables as line items.

**Cross-feature connection**: The extracted deliverables become the **baseline scope** that the Scope Drift Detector (Feature #11) uses for future drift checks.

---

#### 7. 🎭 AI Negotiation Simulator

> **Routes**: `POST /api/negotiate/start`, `POST /api/negotiate/message`, `POST /api/negotiate/end/{id}`
> **Page**: `NegotiationPage.jsx`

An interactive roleplay environment where a **3-agent AI system** trains you to negotiate better with clients.

**How it works — the multi-agent architecture:**

```
┌─────────────────────────────────────────────────────┐
│              NEGOTIATION SIMULATOR                   │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐                │
│  │  Agent 1:   │    │  Agent 2:   │                │
│  │  CLIENT     │    │  SILENT     │                │
│  │  PERSONA    │    │  COACH      │                │
│  │             │    │             │                │
│  │ Responds as │    │ Gives real- │                │
│  │ a realistic │    │ time tips   │                │
│  │ client with │    │ visible     │                │
│  │ personality │    │ only to the │                │
│  │ & objections│    │ freelancer  │                │
│  └──────┬──────┘    └──────┬──────┘                │
│         │                   │                       │
│         │    ┌──────────────┘                       │
│         │    │                                      │
│         ▼    ▼                                      │
│  ┌─────────────┐                                   │
│  │  Agent 3:   │                                   │
│  │  SCORER     │                                   │
│  │             │                                   │
│  │ Evaluates:  │                                   │
│  │ Assertive-  │                                   │
│  │ ness,       │                                   │
│  │ Profession- │                                   │
│  │ alism,      │                                   │
│  │ Value       │                                   │
│  │ Articulation│                                   │
│  │ Grade: A-F  │                                   │
│  └─────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

1. **Scenario Selection**: User picks a difficulty level (Easy, Medium, Hard). Each level has pre-built client personas with different objection styles:
   - *Easy*: Client agrees but asks for a small discount
   - *Medium*: Client pushes back on price and timeline
   - *Hard*: Client threatens to hire someone cheaper, demands scope additions for free
2. **Client Persona Agent**: Responds in character as a realistic client — with personality quirks, budget constraints, and negotiation tactics.
3. **Silent Coach Agent**: After each client response, generates a coaching tip visible only to the freelancer (shown as a `⚡ Coach` bubble). Tips like *"Don't lower your rate — instead, offer to reduce scope"* or *"This is a classic anchoring tactic. Counter with your value proposition."*
4. **Session End & Scoring** (`POST /api/negotiate/end/{id}`): When the session ends, the Scorer Agent evaluates the entire conversation transcript across:
   - **Assertiveness** (0–100)
   - **Professionalism** (0–100)
   - **Value Articulation** (0–100)
   - **Pushback Handling** (0–100)
   - **Outcome Grade** (A through F)
5. The session transcript + scores are saved to `negotiation_sessions` for review.

---

#### 8. ⚖️ Invoice Dispute Resolver

> **Route**: `POST /api/disputes/resolve`
> **Page**: `DisputePage.jsx`

When a client disputes an invoice, this agent aggregates all evidence and generates a professional resolution response.

**How it works:**
1. User selects the disputed invoice and describes the client's objection.
2. The `dispute_agent.py` gathers **evidence** from across the system:
   - The original invoice details (line items, amounts, dates)
   - The client's payment history from past invoices
   - Any related contracts or meeting notes
   - Previous dispute records with this client
3. The agent constructs a prompt with all this evidence and asks the LLM to:
   - Assess the validity of the dispute
   - Draft a professional response email
   - Suggest a resolution strategy (full payment, partial credit, mediation)
   - Recommend preventive measures for future projects
4. The dispute record is saved for historical tracking and client 360° view integration.

---

#### 9. 🚨 5-Stage Payment Escalation Pipeline

> **Routes**: `GET /api/escalation/overview`, `POST /api/escalation/generate/{id}`
> **Page**: `EscalationPage.jsx`

A systematic, legally-informed escalation process for overdue invoices — from gentle nudge to final legal notice.

**The 5 stages:**

| Stage | Name | Tone | When | What's Generated |
|---|---|---|---|---|
| **1** | Gentle Reminder | Friendly | 1–7 days overdue | Polite reminder email assuming client forgot |
| **2** | Formal Follow-up | Professional | 7–14 days overdue | Formal demand letter referencing invoice # and due date |
| **3** | Legal Demand | Firm | 14–30 days overdue | Legal demand letter citing contractual obligations |
| **4** | Cease & Desist | Stern | 30–60 days overdue | Cease & desist with threat of legal action |
| **5** | Final Legal Notice | Legal | 60+ days overdue | Final notice before court filing, with all accumulated evidence |

**How it works:**
1. `GET /api/escalation/overview` scans all invoices where `status != 'paid'` and `due_date < today`.
2. Each overdue invoice is automatically assigned an escalation stage based on days overdue.
3. **Late fee calculation**: Automatically computes 2% per month simple interest on the outstanding amount.
4. `POST /api/escalation/generate/{id}` — The `escalation_agent.py` generates a stage-appropriate formal document:
   - References the specific invoice number, amount, dates
   - Includes the calculated late fees
   - Uses progressively stronger legal language per stage
   - Can be sent via email or logged as a WhatsApp dispatch
5. Each sent escalation is logged in `escalation_logs` with timestamp, stage, and delivery method.

---

#### 10. 📋 Scope Drift Detector

> **Routes**: `POST /api/scope/projects`, `POST /api/scope/projects/{id}/check`
> **Page**: `ScopePage.jsx`

Detects when project work is drifting beyond the agreed scope — and calculates the financial impact.

**How it works:**
1. **Scope Locking** (`POST /api/scope/projects`): At project start, the user defines the agreed deliverables (manually, from a contract, or from extracted meeting notes). This becomes the **locked baseline scope**.
2. **Drift Detection** (`POST /api/scope/projects/{id}/check`): At any point during the project, the user describes what they're currently working on. The `scope_agent.py`:
   - Compares current work against the locked deliverables
   - Identifies **new items** not in the original scope
   - Calculates **extra hours** being spent on out-of-scope work
   - Computes the **financial impact** (extra hours × client's hourly rate)
3. **Change Order Generation**: If drift is detected, the agent automatically drafts a professional **Change Order email** that the freelancer can send to the client, documenting the additional work and requesting approval for the extra charges.
4. **Drift History**: All checks are stored with timestamps, creating a chronological record of scope changes.

**The insight**: Scope creep is the #1 reason freelancers lose money. This makes it **quantifiable and documented** — not just a feeling that "this project is taking longer than expected."

---

#### 11. 🔍 Contract Risk Analyzer

> **Route**: `POST /api/risk/analyze`
> **Component**: `RiskReportPanel.jsx`

Scans uploaded contracts for dangerous clauses that could hurt the freelancer.

**How it works:**
1. User uploads a contract document (PDF, DOCX, or TXT) or pastes contract text.
2. The `risk_analyzer_agent.py` sends the contract text to the LLM with a specialized legal analysis prompt.
3. The LLM returns a structured JSON report containing:
   - **Risk clauses** categorized as High / Medium / Low severity (e.g., *"Unlimited revision clause — High Risk: Client can request unlimited changes without additional payment"*)
   - **Missing essential clauses** that should be in every freelance contract (payment terms, IP transfer conditions, termination clause, force majeure)
   - **Overall risk score** (Safe / Moderate / Risky / Dangerous)
   - **Recommendations** for renegotiation points
4. The report is saved in `contract_risk_reports` and displayed in the `RiskReportPanel` component with color-coded severity badges.

---

#### 12. 💬 WhatsApp Payment Reminders

> **Routes**: `GET /api/reminders/overdue-previews`, `POST /api/reminders/send`
> **Page**: `RemindersPage.jsx`

AI-drafted payment reminders sent directly to clients via WhatsApp through Twilio.

**How it works:**
1. `GET /api/reminders/overdue-previews` identifies all overdue invoices and categorizes them by severity:
   - **Gentle** (1–7 days): *"Hi Priya! Quick reminder that Invoice #INV-20260715-0042 for ₹35,000 was due on July 15th. Would love to get this wrapped up! 😊"*
   - **Follow-up** (7–14 days): *"Hi Priya, following up on Invoice #INV-20260715-0042 for ₹35,000 which is now 10 days overdue. Could you share an update on the payment timeline?"*
   - **Urgent** (14+ days): *"Dear Priya, Invoice #INV-20260715-0042 for ₹35,000 is now significantly overdue. Please arrange payment at the earliest to avoid escalation."*
2. The `whatsapp_agent.py` drafts personalized messages using the LLM, incorporating the client's name, invoice details, and relationship context.
3. `POST /api/reminders/send` dispatches the message via the **Twilio WhatsApp API** and logs the reminder in `whatsapp_reminders` with the Twilio message SID.

---

#### 13. 🧬 Client Psychographic Profiler

> **Route**: `POST /api/profiler/analyze`
> **Page**: `ProfilerPage.jsx`

NLP-powered behavioral analysis that builds a psychological risk profile of clients based on their communication patterns and business behavior.

**How it works:**
1. The `profiler_agent.py` aggregates all available data about a client: email communications, meeting notes, payment behavior, dispute history, and negotiation patterns.
2. The LLM analyzes this data through a **behavioral linguistics lens** and generates:
   - **Personality tags**: e.g., "Detail-oriented", "Price-sensitive", "Relationship-builder", "Scope-creeper"
   - **Communication style**: Formal vs. casual, responsive vs. slow, direct vs. passive-aggressive
   - **Risk indicators**: Red flags like "frequently disputes invoices" or "consistently delays payments"
   - **Recommended approach**: How to communicate, negotiate, and set boundaries with this personality type
3. The profile is saved in `client_profiles` and reflected in the Client 360° view.

---

### 📈 Business Intelligence & Analytics

---

#### 14. ❤️ Client Health Scoring Engine

> **Route**: `GET /api/health/all`
> **Page**: `HealthDashboardPage.jsx`

A 5-factor scoring system that rates each client on a 0–100 scale.

**The 5 factors:**

| Factor | Weight | What It Measures |
|---|---|---|
| **Payment** | High | Average days to pay, overdue frequency, dispute count |
| **Loyalty** | Medium | Months as client, number of projects, repeat rate |
| **Professionalism** | Medium | Scope adherence, clear communication, meeting commitments |
| **Communication** | Low | Response time, feedback quality, availability |
| **Growth** | Low | Revenue trend (increasing, stable, declining) |

**Score Buckets:**
- 🟢 **81–100**: Champion — your best clients, prioritize and nurture
- 🟢 **61–80**: Healthy — solid working relationship
- 🟡 **41–60**: Caution — some issues, needs attention
- 🟠 **21–40**: At Risk — consider whether to continue
- 🔴 **0–20**: Avoid — terminate relationship, not worth the cost

Each client gets **red flags** (problems) and **green flags** (strengths), plus specific **action recommendations** (e.g., *"Propose a retainer to lock in this champion client"* or *"Require 50% upfront from this at-risk client"*).

---

#### 15. 💎 Client Lifetime Value (LTV) Predictor

> **Route**: `GET /api/ltv/leaderboard`
> **Page**: `LTVPage.jsx`

Predicts each client's revenue potential over the next 12 months.

**How it works:**
1. The `ltv_service.py` analyzes each client's historical data:
   - **Revenue**: Total paid invoices over the client's lifetime
   - **Frequency**: Average number of projects per month
   - **Recency**: How recently they last engaged
   - **Payment reliability**: From the health score system
   - **Engagement depth**: Variety of services purchased
2. These dimensions are scored individually (0–100) and combined into a predicted **12-month LTV value** in ₹.
3. A **Recharts Radar Chart** visualizes the 5 LTV dimensions for each client.
4. The engine identifies **retainer candidates** — clients with high frequency and loyalty scores — and suggests a monthly retainer price based on their average project value.
5. Clients are ranked on a **LTV Leaderboard** from highest to lowest predicted value.

---

#### 16. 💰 Smart Pricing Engine

> **Route**: `POST /api/pricing/suggest`
> **Page**: `PricingPage.jsx`

AI-powered price recommendations that account for market data, client characteristics, and project complexity.

**How it works:**
1. User inputs: service type, client type (startup/enterprise/agency), project complexity (basic/intermediate/advanced), number of deliverables, and timeline.
2. The `pricing_service.py` applies a multi-factor pricing algorithm:
   - **Base market rate**: Pulled from curated market benchmark data for the service type
   - **Client type multiplier**: Enterprise clients pay more than startups (1.3x vs 0.85x)
   - **Complexity multiplier**: Advanced projects get a higher rate (1.5x vs 1.0x)
   - **Volume discount/premium**: More deliverables can affect per-unit pricing
   - **Urgency premium**: Rush timelines get a surcharge
3. The engine returns:
   - **Market Typical Range** (25th to 75th percentile)
   - **Recommended Sweet Spot** (optimized for both competitiveness and profit)
   - **Price Range Visualization** comparing the user's current rate to market averages
4. **Historical analytics** show how the user's pricing has trended vs. market rates over time.

---

#### 17. 📊 Proposal Win Rate Analytics

> **Routes**: `POST /api/winrate/proposals/log`, `POST /api/winrate/predict`
> **Page**: `WinRatePage.jsx`

Track proposal outcomes and predict win probability for upcoming proposals using ML.

**How it works:**
1. **Outcome Logging**: After each proposal, the user logs: Won (with win factors), Lost (with loss reasons), or Pending. Win factors include: price, relationship, portfolio, reputation, timeline.
2. **Analytics Dashboards**: The `winrate_service.py` computes:
   - Overall win rate (%) and trend over time
   - Win rate broken down by service type, client type, price range
   - Most common win factors and loss reasons
   - Monthly win rate trends via Recharts line charts
3. **ML Win Probability Predictor** (`POST /api/winrate/predict`): For an upcoming proposal, the user inputs the client type, service type, proposed price, and timeline. The engine analyzes their historical patterns and returns a win probability percentage with contributing factors.

**Cross-feature connection**: When an invoice is marked `paid`, the system automatically prompts the user to log that proposal as a "Win" — ensuring win rate data stays current.

---

#### 18. 📈 Portfolio ROI Tracker & Burnout Predictor

> **Routes**: `GET /api/portfolio/insights`, `GET /api/burnout/prediction`
> **Pages**: `PortfolioPage.jsx`, `BurnoutPage.jsx`

**Portfolio ROI** (`portfolio_service.py`):
- Classifies all invoices into service categories (Web Development, Design, Consulting, Writing, etc.) using keyword matching.
- Calculates revenue per service, effective hourly rate per service, and project count per service.
- Recharts **Bar Chart** and **Pie Chart** visualize revenue distribution.
- Identifies which services are most profitable and which are draining time without proportional revenue.

**Burnout Predictor** (`burnout_service.py`):
- Calculates **Coefficient of Variation** (σ/μ) of monthly income — high variance = unstable income = burnout risk.
- Computes **burnout score** (0–100) based on income volatility, overdue invoice stress, and revenue gap probability.
- Predicts **income gap probability** for next month based on pipeline analysis.
- Recharts **Area Chart** displays 6-month historical revenue with trend visualization.
- Classifies status: *"Stable Income"*, *"Moderate Risk"*, *"High Burnout Risk"*, *"Critical — Take Action"*.

---

### 🇮🇳 India-Specific Financial Tools

---

#### 19. 🧮 Currency, GST & Tax Toolkit

> **Routes**: `GET /api/currency/rates`, `POST /api/currency/calculate-gst`, `GET /api/tax/report`
> **Pages**: `CurrencyGSTPage.jsx`, `TaxPage.jsx`
> **Component**: `GSTCalculator.jsx`

**Multi-Currency Converter** (`currency_service.py`):
- Live exchange rates for 10 major currencies (USD, EUR, GBP, AUD, CAD, SGD, AED, JPY, CHF, NZD) fetched from the **European Central Bank** via the Frankfurter API.
- Auto-detects if billing is in foreign currency → classifies as **zero-rated export** for GST purposes.

**GST Calculator** (`GSTCalculator.jsx`):
- Supports all Indian GST slabs: 0%, 5%, 12%, 18%, 28%
- Differentiates between **Inter-state (IGST)** and **Intra-state (CGST + SGST)** calculations
- Auto-applies zero-rated export classification for foreign clients
- **SAC Code Search**: Searchable directory of Service Accounting Codes for IT, design, and consulting services — required for GST filing.

**Tax Filing Assistant** (`tax_service.py`):
- **Section 44ADA Presumptive Taxation**: Calculates presumptive income at 50% of gross receipts (for freelancers earning under ₹75 lakhs/year).
- **Advance Tax Calendar**: Shows quarterly advance tax deadlines (June 15, Sept 15, Dec 15, March 15) with calculated installment amounts.
- **GST Filing Checklist**: Generates a month-by-month checklist of GSTR-1, GSTR-3B, and annual return deadlines.
- **Tax Optimization Tips**: AI-suggested deductions and strategies based on income pattern analysis.

---

## 🔄 How It Works as a Unified System

BizPilot AI isn't 19 separate features — it's a **single intelligent system** where every feature feeds into and enriches every other feature. Here's how data flows across the platform:

```
                           THE UNIFIED DATA FLOW
                           
  ┌──────────┐                                      ┌──────────────┐
  │ Meeting  │─── extracts deliverables ───────────▶│  Scope Drift │
  │ Notes    │─── creates draft invoice ──────┐     │  Detector    │
  └──────────┘                                │     └──────────────┘
                                              │
  ┌──────────┐                                ▼
  │ AI/Voice │─── creates invoice ──────▶┌──────────┐
  │ Invoice  │                           │ INVOICES │──── if overdue ───▶┌───────────┐
  └──────────┘                           │          │                    │ WhatsApp  │
                                         └────┬─────┘                    │ Reminders │
  ┌──────────┐                                │                          └─────┬─────┘
  │ Contract │─── links to client ──┐         │                                │
  │Generator │                      │    if paid → log win                 if ignored
  └──────────┘                      │         │                                │
                                    │         ▼                                ▼
  ┌──────────┐                      │    ┌──────────┐                    ┌───────────┐
  │ Risk     │─── scans contract ───┤    │ Win Rate │                    │ Escalation│
  │ Analyzer │                      │    │ Tracker  │                    │ Pipeline  │
  └──────────┘                      │    └──────────┘                    └───────────┘
                                    │
                                    ▼
                              ┌───────────┐
                              │  CLIENT   │
                              │  360°     │◀──── merges ALL data ────┐
                              └─────┬─────┘                          │
                                    │                                │
                    ┌───────────────┼───────────────┐                │
                    ▼               ▼               ▼                │
              ┌──────────┐   ┌──────────┐   ┌──────────┐            │
              │  Health  │   │   LTV    │   │ Profiler │────────────┘
              │  Score   │   │ Predictor│   │          │
              └────┬─────┘   └────┬─────┘   └──────────┘
                   │              │
                   ▼              ▼
              ┌──────────────────────┐
              │      DASHBOARD      │◀──── aggregates everything
              │  KPIs · Alerts ·    │
              │  Forecast · Burnout │◀──── cash flow forecast
              │  Top Clients        │◀──── portfolio ROI data
              └─────────────────────┘
```

### The Key Data Connections

| When This Happens... | ...This Also Updates |
|---|---|
| A **meeting note** is extracted | Draft invoice is created + scope baseline is set for drift detection |
| An **invoice is created** | Dashboard KPIs recalculate + client revenue stats update + portfolio ROI refreshes |
| An **invoice is marked paid** | User is prompted to log proposal as "Won" → win rate analytics update |
| An **invoice goes overdue** | Appears in WhatsApp reminders + escalation overview + smart alerts on dashboard |
| A **contract is generated** | Linked to client in 360° view + risk scan is recommended |
| A **contract is risk-analyzed** | Red flags appear in Client 360° view + factored into health score |
| A **dispute is resolved** | Logged in client history → affects health score → visible in 360° view |
| **Any feature generates data** | Activity Feed updates → Smart Alerts reassess → Dashboard refreshes |

### Multi-Tenancy & Data Isolation

Every single document in every MongoDB collection contains an `owner_id` field. Every API endpoint filters by the authenticated user's ID. This means:
- User A can **never** see User B's data
- All aggregation pipelines include `$match: { owner_id }` as the first stage
- The frontend Axios interceptor automatically injects the JWT token, and the backend `deps.py` validates it on every protected route

---

## 🧠 The AI Agent Ecosystem

BizPilot runs **13 specialized AI agents**, each designed for a specific business task. They share a common architecture:

```
┌─────────────────────────────────────────────────┐
│              AGENT ARCHITECTURE                  │
│                                                  │
│  1. CONTEXT GATHERING                            │
│     └── Pull relevant data from MongoDB          │
│                                                  │
│  2. PROMPT CONSTRUCTION                          │
│     └── Structured system + user prompts         │
│     └── Include context data, examples           │
│     └── Request structured JSON output           │
│                                                  │
│  3. LLM CALL                                     │
│     └── Groq (llama-3.3-70b) — primary           │
│     └── OpenAI (gpt-4o-mini) — fallback          │
│                                                  │
│  4. RESPONSE PARSING                             │
│     └── Regex-based JSON extraction              │
│     └── Handles markdown blocks, extra text      │
│     └── Validates structure against schema        │
│                                                  │
│  5. FALLBACK LOGIC                               │
│     └── If NO API key: deterministic response    │
│     └── If API error: graceful degradation       │
│     └── Never crashes, always returns usable data│
└─────────────────────────────────────────────────┘
```

### The 13 Agents

| # | Agent | File | Primary LLM | What It Does |
|---|---|---|---|---|
| 1 | **Chat Agent** | `chat_agent.py` | Groq | Central assistant with intent detection + RAG routing |
| 2 | **Invoice Agent** | `invoice_agent.py` | Groq | Natural language → structured invoice line items |
| 3 | **Voice Invoice Agent** | `voice_invoice_agent.py` | Groq | Transcribed speech → fuzzy client match → invoice |
| 4 | **Voice Transcription** | `voice_transcription_agent.py` | Groq Whisper | Audio file → text transcription |
| 5 | **Contract Agent** | `contract_agent.py` | Groq | Project details → full legal contract + risk assessment |
| 6 | **Meeting Agent** | `meeting_agent.py` | Groq | Raw notes → structured deliverables + confirmation email |
| 7 | **Negotiation Agent** | `negotiation_agent.py` | Groq | 3-agent system: Client Persona + Coach + Scorer |
| 8 | **Dispute Agent** | `dispute_agent.py` | Groq | Evidence aggregation → professional dispute resolution |
| 9 | **Escalation Agent** | `escalation_agent.py` | Groq | Overdue invoice → stage-appropriate legal document |
| 10 | **Scope Agent** | `scope_agent.py` | Groq | Scope comparison → drift detection + change order email |
| 11 | **Profiler Agent** | `profiler_agent.py` | Groq | Client data → psychographic risk profile |
| 12 | **Risk Analyzer** | `risk_analyzer_agent.py` | Groq | Contract text → clause-by-clause risk assessment |
| 13 | **WhatsApp Agent** | `whatsapp_agent.py` | Groq + Twilio | Draft personalized reminders + dispatch via WhatsApp |

### Resilient AI Design

Every agent implements a **graceful fallback pattern**:

```python
# Simplified agent pattern (every agent follows this)
async def generate(context_data):
    if not settings.GROQ_API_KEY:
        # FALLBACK: Return deterministic, rule-based response
        return _build_fallback_response(context_data)
    
    try:
        # PRIMARY: Call LLM with structured prompt
        response = await llm.invoke(prompt)
        return _extract_json(response)
    except Exception:
        # ERROR FALLBACK: Return safe default
        return _build_fallback_response(context_data)
```

This means **the entire application works without any API keys** — using placeholder/rule-based responses — making it easy to develop, test, and demo without incurring API costs.

---

## 🗄️ Database Design

BizPilot uses **14 MongoDB collections**, all enforcing multi-tenant isolation via `owner_id`:

```
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB: bizpilot_db                      │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   users     │  │   clients   │  │     invoices     │   │
│  │             │  │             │  │                  │   │
│  │ email ◄────────│ owner_id    │  │ owner_id         │   │
│  │ password    │  │ name        │  │ client_id ◄──────│   │
│  │ business    │  │ company     │  │ line_items[]     │   │
│  │ name        │  │ hourly_rate │  │ status           │   │
│  └─────────────┘  │ project_rate│  │ total            │   │
│                   └─────────────┘  │ due_date         │   │
│                                    └──────────────────┘   │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  documents  │  │  contracts  │  │ contract_risk_   │   │
│  │  (RAG)      │  │             │  │ reports          │   │
│  │             │  │ owner_id    │  │                  │   │
│  │ owner_id    │  │ client_id   │  │ owner_id         │   │
│  │ filename    │  │ clauses[]   │  │ filename         │   │
│  │ chunks[]    │  │ risk_rating │  │ risk_clauses[]   │   │
│  │ embeddings[]│  │ summary     │  │ missing_clauses[]│   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  meetings   │  │  disputes   │  │   proposals      │   │
│  │             │  │             │  │                  │   │
│  │ owner_id    │  │ owner_id    │  │ owner_id         │   │
│  │ client_id   │  │ client_id   │  │ outcome          │   │
│  │ deliverables│  │ evidence    │  │ win_factors[]    │   │
│  │ draft_email │  │ resolution  │  │ loss_reasons[]   │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ escalation  │  │   scope     │  │ client_profiles  │   │
│  │ _logs       │  │ _projects   │  │                  │   │
│  │             │  │             │  │ owner_id         │   │
│  │ owner_id    │  │ owner_id    │  │ personality_tags │   │
│  │ invoice_id  │  │ client_id   │  │ risk_indicators  │   │
│  │ stage       │  │ locked_scope│  │ communication    │   │
│  │ document    │  │ drift_checks│  │ _style           │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ whatsapp         │  │  negotiation_sessions        │    │
│  │ _reminders       │  │                              │    │
│  │                  │  │  owner_id                    │    │
│  │ owner_id         │  │  scenario                   │    │
│  │ invoice_id       │  │  transcript[]               │    │
│  │ twilio_sid       │  │  scores                     │    │
│  │ severity         │  │  grade                      │    │
│  └──────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Why MongoDB?

MongoDB was chosen specifically because:
1. **Schema flexibility**: Invoice line items vary wildly — some have 1 item, some have 20. Each item may have different fields (hourly vs. fixed rate, with or without GST). MongoDB's document model handles this naturally without rigid table schemas.
2. **Powerful aggregation pipelines**: The dashboard, client 360°, and analytics features use `$match`, `$group`, `$sort`, `$lookup`, `$project`, and `$unwind` — MongoDB's aggregation framework handles complex multi-stage data transformations natively.
3. **Embedded arrays**: RAG document chunks with their embedding vectors are stored as embedded arrays within document records — no need for a separate vector database for the current scale.

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & npm
- **MongoDB 7.0+** (local or Atlas cloud)
- **API Keys** (optional — app works without them using fallback responses):
  - [Groq API Key](https://console.groq.com/) — for AI agents
  - [OpenAI API Key](https://platform.openai.com/) — as AI fallback
  - [Twilio Account](https://www.twilio.com/) — for WhatsApp reminders

### Step 1: Install MongoDB (macOS)

```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

Verify it's running:
```bash
brew services list
# You should see mongodb-community with status "started"
```

> 💡 **Tip**: Download [MongoDB Compass](https://www.mongodb.com/products/compass) — a free GUI to visually browse your database. Connect with `mongodb://localhost:27017` and watch your collections fill up as you use the app.

### Step 2: Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit the `.env` file:

```env
# MongoDB (required)
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=bizpilot_db

# JWT Auth (required — change the secret!)
JWT_SECRET_KEY=your_super_long_random_secret_string_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI API Keys (optional — app works without them)
GROQ_API_KEY=gsk_...          # Primary LLM provider
OPENAI_API_KEY=sk-...         # Fallback LLM provider

# WhatsApp Reminders (optional)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# App Config
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173
```

### Step 3: Test Database Connection

```bash
python test_mongo_connection.py
# ✅ Connection successful!
```

### Step 4: Start the Backend

```bash
uvicorn app.main:app --reload --port 8000
```

Visit **http://localhost:8000/docs** — FastAPI's auto-generated interactive API documentation. You can test every endpoint here directly.

### Step 5: Frontend Setup (new terminal tab)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit **http://localhost:5173**

### Step 6: Explore the Platform

1. **Sign up** at `/signup` — create your business account
2. **Add a client** — go to Clients page and create your first client record
3. **Generate an AI invoice** — click "Generate with AI", type *"5 hours website development at ₹2000/hr"*
4. **Try voice invoicing** — click the 🎤 microphone and describe the work out loud
5. **Upload a document** — go to the Assistant page, upload a contract PDF, then ask questions about it
6. **Explore the dashboard** — watch it come alive as you add more data
7. **Generate a contract** — go to Contracts and create a custom freelance agreement
8. **Check your health scores** — go to Client Health to see how your clients are rated

---

## 📚 Learning Checkpoints

If you're studying this codebase to learn full-stack development, AI integration, or MongoDB — here's a guided path through the most educational files:

### Stage 1: Foundations

| File | What You'll Learn |
|---|---|
| `backend/app/core/config.py` | Pydantic Settings pattern for environment management |
| `backend/app/core/database.py` | Async MongoDB connection with Motor + index creation on startup |
| `backend/app/core/security.py` | bcrypt password hashing + JWT token creation/verification |
| `backend/app/core/deps.py` | FastAPI dependency injection for authentication |

### Stage 2: CRUD & Data Modeling

| File | What You'll Learn |
|---|---|
| `backend/app/routes/auth_routes.py` | `insert_one`, `find_one`, password hashing, JWT flow |
| `backend/app/routes/client_routes.py` | Full CRUD: `find`, `find_one_and_update`, `delete_one` |
| `backend/app/schemas/client_schema.py` | Pydantic v2 schema design for request/response validation |
| `frontend/src/services/api.js` | Axios interceptor pattern with auto-token injection |

### Stage 3: Advanced MongoDB

| File | What You'll Learn |
|---|---|
| `backend/app/routes/dashboard_routes.py` | Aggregation pipelines: `$match`, `$group`, `$sort` |
| `backend/app/routes/client_360_routes.py` | Multi-collection aggregation — merging 7+ data sources |
| `backend/app/services/health_service.py` | Complex scoring algorithms using aggregated data |

### Stage 4: AI & Agentic Patterns

| File | What You'll Learn |
|---|---|
| `backend/app/agents/invoice_agent.py` | Core pattern: natural language → structured JSON via LLM |
| `backend/app/agents/chat_agent.py` | Intent detection + mode routing + RAG fallback |
| `backend/app/agents/negotiation_agent.py` | Multi-agent orchestration (3 concurrent AI personas) |
| `backend/app/agents/contract_agent.py` | Domain-specific prompt engineering for legal content |

### Stage 5: RAG Pipeline

| File | What You'll Learn |
|---|---|
| `backend/app/rag/document_loader.py` | Document parsing (PDF, DOCX, TXT) + text chunking with overlap |
| `backend/app/rag/embedder.py` | Local vector embedding with SentenceTransformers |
| `backend/app/rag/retriever.py` | Cosine similarity search over embedded document chunks |

### Stage 6: ML & Statistical Models

| File | What You'll Learn |
|---|---|
| `backend/app/services/forecast_service.py` | Scikit-Learn LinearRegression for time-series prediction |
| `backend/app/services/burnout_service.py` | Statistical analysis: Coefficient of Variation, gap probability |
| `backend/app/services/ltv_service.py` | Multi-factor predictive scoring and ranking |

---

## 🔮 Future Scope

- [ ] **Automated Testing** — pytest (backend) + Vitest (frontend) for comprehensive test coverage
- [ ] **Containerization** — Dockerfile + docker-compose for one-command deployment
- [ ] **CI/CD Pipeline** — GitHub Actions for lint → test → build → deploy
- [ ] **Mobile Responsiveness** — CSS media queries + collapsible sidebar for mobile devices
- [ ] **Payment Gateway Integration** — Razorpay/Stripe for direct invoice payments
- [ ] **Email Integration** — Send contracts, invoices, and reminders via email (SendGrid/SES)
- [ ] **Vector Database** — Migrate RAG from NumPy to Pinecone/Qdrant for production-scale retrieval
- [ ] **Multi-Language Support** — Hindi, Tamil, Bengali, and other regional language interfaces
- [ ] **API Rate Limiting** — Middleware to prevent abuse and manage API costs
- [ ] **Observability** — Structured logging (Loguru), error tracking (Sentry), and performance monitoring

---
                                                                                                                                         
   Feature                │ Backend Files                                                      │ Frontend Files
  ────────────────────────┼────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────
   🤝 Networking Finder   │ networking_schema.py, networking_service.py, networking_agent.py,  │ networkingService.js, NetworkingPage.jsx
                          │ networking_routes.py                                               │
   🎯 Income Goal Tracker │ goal_schema.py, goal_service.py, goal_routes.py                    │ goalService.js, GoalTrackerPage.jsx
   🎭 Tone Analyzer       │ tone_schema.py, tone_agent.py, tone_routes.py                      │ toneService.js, ToneAnalyzerPage.jsx
                                                                                                                                          
  ### 🔧 Files Modified (5 integration files)                                                                                             
                                                                                                                                          
   File                                   │ What Changed
  ────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────
   main.py                                │ Registered 3 new routers
   App.jsx                                │ Added 3 protected routes (/networking, /goals, /tone)
   Sidebar.jsx                            │ Added 3 nav items with icons (Handshake, Crosshair, MessageCircleWarning)
   activity_routes.py                     │ Added networking/goal/tone events to feed + 2 new smart alerts (goal progress + tone cooling)
   client_360_routes.py                   │ Tone analysis integrated into Client 360° view
                                                                                                                                          
  ### 🔄 Data Pipeline Connections                                                                                                        
                                                                                                                                          
    NEW FEATURES ←→ EXISTING FEATURES (Data Flow)                                                                                         
                                                                                                                                          
    🤝 NETWORKING FINDER                                                                                                                  
      ├── Reads: invoices, clients, meetings, proposals (lost proposals = service gaps)                                                   
      ├── Uses: portfolio_service.py SERVICE_KEYWORDS for classification                                                                  
      ├── Writes: networking_analyses collection                                                                                          
      └── Feeds → Activity Feed, Dashboard Smart Alerts                                                                                   
                                                                                                                                          
    🎯 INCOME GOAL TRACKER                                                                                                                
      ├── Reads: invoices (current month revenue), proposals (pipeline)                                                                   
      ├── Reads: pricing history (avg project values by service)
      ├── Reads: winrate (win probability for pipeline items)
      ├── Writes: income_goals collection
      └── Feeds → Activity Feed, Smart Alert (goal at risk past mid-month)
  
    🎭 TONE ANALYZER
      ├── Reads: clients, invoices, disputes (context for analysis)
      ├── AI Agent: Groq LLM with fallback keyword analysis
      ├── Writes: tone_analyses collection
      ├── Feeds → Client 360° View (latest tone + history)
      ├── Feeds → Activity Feed (sentiment events)
      └── Feeds → Smart Alert (cooling/strained tone warning)
  
  ### 3 New MongoDB Collections
  
  • networking_analyses — service gap analyses and partner suggestions
  • income_goals — monthly income targets with reverse planning data
  • tone_analyses — communication tone analysis results
  
  You can now run uvicorn app.main:app --reload --port 8000 and npm run dev to see all 3 features live! 🚀


    ## ✅ All Bugs Fixed + Full Redesign Complete                                                                                           
                                                                                                                                          
  ### 🐛 Bugs Fixed                                                                                                                       
  
   Area                                     │ Issue                                            │ Fix
  ──────────────────────────────────────────┼──────────────────────────────────────────────────┼──────────────────────────────────────────
   Frontend                                 │ getContracts import didn't exist                 │ → listContracts
   Frontend                                 │ summary.total_earned crash when backend offline  │ Added .catch() + null guard
   Backend                                  │ langchain.prompts removed in v1.x                │ → langchain_core.prompts
   Backend                                  │ seasonal_planner_service — raw ObjectId returned │ Fixed with serialize_doc() on a copy
   Backend                                  │ goal_routes.py — raw ObjectId in progress dict   │ Fixed with serialize_doc()
  
  ### 🎨 UI Redesign — What's New
  
   Component                        │ Change
  ──────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────
   index.css                        │ Complete rewrite — dark navy design system, CSS variables, Inter font, 40+ component classes
   index.html                       │ Google Fonts Inter, SEO meta, emoji favicon
   Sidebar                          │ 4 grouped sections (Main / Finance / Intelligence / AI Tools), user avatar chip, active link accent
   Login & Signup                   │ Dark auth cards, password toggle, proper error alerts, branded loading
   Dashboard                        │ Stat cards with icons, Quick Actions grid, client avatar initials, server error state + retry
   SmartAlerts                      │ Dark-mode compatible alert styling
   CashFlowForecast                 │ Dark custom tooltip, CSS variable chart colors
   BurnoutWidget                    │ Dark mini-stat cards, colored left-border accent
   ProtectedRoute                   │ Branded rocket loading screen instead of blank white
  
  ### 🚀 Start the app:
  
    # Terminal 1 — backend
    cd backend && source venv/bin/activate
    python -m uvicorn app.main:app --reload --port 8000
  
    # Terminal 2 — frontend
    cd frontend && npm run dev
  
<div align="center">

**Built with ❤️ for the freelancer community**

*Because your time should be spent creating, not chasing payments.*

</div>
