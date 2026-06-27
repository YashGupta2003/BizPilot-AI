# BizPilot AI

Autonomous business assistant for freelancers and small businesses — built with FastAPI, MongoDB, React, and agentic AI.

## What it does

- **AI invoice generation** — describe work in plain English, the agent extracts line items and creates a professional invoice
- **Client management** — track clients, rates, and payment history
- **RAG-powered document assistant** — upload contracts/notes, ask questions about them in natural language
- **Business dashboard** — revenue, pending payments, top clients (powered by MongoDB aggregation pipelines)

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, Motor (async MongoDB driver) |
| Database | MongoDB |
| Frontend | React (Vite), React Router, Axios, Recharts |
| AI | OpenAI API (chat + invoice extraction), sentence-transformers (local embeddings for RAG) |
| Auth | JWT (python-jose), bcrypt password hashing |

## Project structure

```
BizPilot-AI/
├── backend/
│   ├── app/
│   │   ├── core/          # config, database connection, security, auth dependency
│   │   ├── models/        # MongoDB document serializers
│   │   ├── schemas/       # Pydantic request/response validation
│   │   ├── routes/        # API endpoints (auth, clients, invoices, chat, dashboard)
│   │   ├── services/      # business logic (invoice calculations, PDF generation)
│   │   ├── agents/        # agentic AI logic (invoice extraction, chat agent)
│   │   ├── rag/            # document loading, embedding, retrieval
│   │   └── main.py        # FastAPI app entry point
│   ├── data/               # uploaded files, generated invoice PDFs
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/    # reusable UI pieces (layout, clients, invoices, chat)
│   │   ├── pages/          # full pages (Dashboard, Clients, Invoices, Assistant)
│   │   ├── services/       # API call wrappers (axios)
│   │   ├── context/         # global auth state
│   │   └── App.jsx
│   └── package.json
│
└── docs/                   # for your project report / diagrams
```

## MacBook setup — step by step

### 1. Install MongoDB

```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

Verify it's running:
```bash
brew services list
```
You should see `mongodb-community` with status `started`.

### 2. Backend setup

```bash
cd ~/Documents/Projects/BizPilot-AI/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
```

Open `.env` in VS Code and at minimum confirm:
```
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=bizpilot_db
```

Add your OpenAI API key if you have one (the app works without it too, with placeholder AI responses, so you can test everything else first):
```
OPENAI_API_KEY=sk-...
```

### 3. Test your MongoDB connection

```bash
python test_mongo_connection.py
```

You should see `✅ Connection successful!`

### 4. Run the backend

```bash
uvicorn app.main:app --reload --port 8000
```

Visit **http://localhost:8000/docs** — this is FastAPI's auto-generated interactive API documentation. You can test every endpoint here directly.

### 5. Frontend setup (new terminal tab)

```bash
cd ~/Documents/Projects/BizPilot-AI/frontend
npm install
npm run dev
```

Visit **http://localhost:5173**

### 6. Create your account and explore

1. Sign up at `/signup`
2. Add a client
3. Generate an invoice using the AI ("Generate with AI" button)
4. Upload a document and ask the assistant about it

## Learning checkpoints — what to understand at each stage

| File to study | What it teaches |
|---|---|
| `backend/app/core/database.py` | MongoDB connection, indexes |
| `backend/app/routes/auth_routes.py` | `insert_one`, `find_one`, password hashing, JWT |
| `backend/app/routes/client_routes.py` | `find`, `find_one_and_update`, `delete_one`, basic aggregation |
| `backend/app/routes/dashboard_routes.py` | Aggregation pipelines (`$match`, `$group`, `$sort`) |
| `backend/app/agents/invoice_agent.py` | Core agentic AI pattern: natural language → structured JSON |
| `backend/app/rag/` (all 3 files) | Full RAG pipeline: chunking, embedding, similarity search |
| `backend/app/agents/chat_agent.py` | Intent detection + mode switching |

## Using MongoDB Compass (recommended)

Download [MongoDB Compass](https://www.mongodb.com/products/compass) — a free GUI to visually browse your database. Connect with `mongodb://localhost:27017` and you'll see your collections (`users`, `clients`, `invoices`, `documents`) fill up as you use the app. This is the easiest way to actually see what MongoDB documents look like.

## For your project report

Suggested sections: Problem statement → Why MongoDB (schema flexibility for varying invoice line items) → System architecture diagram → Agentic AI module (invoice extraction) → RAG module (document Q&A) → Screenshots → Future scope (WhatsApp reminders, payment gateway integration, multi-currency support).
