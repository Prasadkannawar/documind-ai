# DocuMind AI

**Ask your documents. Understand your AI.**

![Next.js](https://img.shields.io/badge/Next.js_15-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase_pgvector-3FCF8E?logo=supabase&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11-3776AB?logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel)
[![CI](https://github.com/Prasadkannawar/explainable-doc-rag-system/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/Prasadkannawar/explainable-doc-rag-system/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/License-MIT-green)

> A production-grade Retrieval-Augmented Generation (RAG) system with full **Explainable AI (XAI)** — built on 100% open-source models, no external API keys required. Upload documents, ask questions, and see *exactly* how every answer was derived: token by token, chunk by chunk, with a grounding score that measures hallucination risk.

---

<!-- 
  ════════════════════════════════════════════════════════════
  📸  YOU NEED TO ADD THESE IMAGES — instructions below
  ════════════════════════════════════════════════════════════

  STEP 1 — Record a demo GIF (most important for recruiters)
  ──────────────────────────────────────────────────────────
  1. Run the app locally (Quick Start below)
  2. Open http://localhost:3000
  3. Flow to record:
       a) Landing page (show hero section, 3 seconds)
       b) /dashboard — drag-drop a PDF (show upload + summary)
       c) /query — type "What are the main findings?" → submit
       d) Watch XAI panel animate: token heat map, grounding bar,
          chunk cards expanding, reasoning chain
       e) Click "Export MD" and "Share" buttons
  4. Recording tools:
       Windows: Xbox Game Bar (Win+G) → Capture → Record
       Mac:     QuickTime → File → New Screen Recording
       Any OS:  OBS Studio (free, obsproject.com)
  5. Convert to GIF: upload .mp4 to https://ezgif.com/video-to-gif
       Settings: 800px width, 10fps, optimize
  6. Save as docs/demo.gif
  7. Replace this comment block with:
       ![DocuMind AI Demo](docs/demo.gif)

  STEP 2 — Screenshots (add below after the GIF)
  ──────────────────────────────────────────────
  Save these files and add them to docs/ folder:

  docs/screenshot-landing.png  → Full landing page hero
  docs/screenshot-query.png    → Query page with XAI panel showing
  docs/screenshot-dashboard.png → Dashboard with uploaded documents
  docs/screenshot-analytics.png → Analytics page with charts

  Add to README with:
  <img src="docs/screenshot-query.png" width="900" alt="Query page with XAI">

  STEP 3 — Architecture diagram (optional but impressive)
  ──────────────────────────────────────────────────────
  Create docs/architecture.png from the ASCII diagram below using
  https://app.diagrams.net (free, drag-and-drop)
  ════════════════════════════════════════════════════════════
-->

---

## What Makes DocuMind Different

| Standard RAG | DocuMind AI |
|---|---|
| Black-box answer | Answer + **token attribution heat map** |
| No hallucination check | **Grounding score** on every response |
| Single-turn Q&A | **Multi-turn chat** with conversation memory |
| Vector search only | **Hybrid search**: vector + BM25 |
| Requires OpenAI/Anthropic | **Zero external API** — own open-source models |
| Confidence guesswork | **Calibrated confidence** from QA model |
| No audit trail | **Full query history** + analytics charts |
| Generic PDF handling | **PDF page number** tracked per chunk |
| No export | **Export Q&A as Markdown** + copy to clipboard |
| Static question only | **Shareable permalink** `/query?q=...` |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Next.js 15 Frontend  (Vercel)                        │
│                                                                          │
│   /            Landing + XAI preview                                     │
│   /dashboard   Document upload + management                              │
│   /query       Ask questions + live XAI panel                           │
│   /history     Query history + analytics dashboard                       │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │ HTTPS / REST
┌────────────────────────────▼─────────────────────────────────────────────┐
│                    FastAPI Backend  (Render)                             │
│                                                                          │
│  POST /api/v1/documents/upload  ──► DocumentProcessor                   │
│  GET  /api/v1/documents/        ──► Supabase documents table             │
│  POST /api/v1/query/            ──► RAGService pipeline                  │
│  GET  /api/v1/analytics/        ──► Supabase RPC analytics               │
│  GET  /health                   ──► System health + model status         │
└──────────┬────────────────────────────────────────┬──────────────────────┘
           │                                        │
┌──────────▼──────────────────┐   ┌────────────────▼─────────────────────┐
│  Supabase  (pgvector)       │   │  Own ML Models  (CPU, no API)         │
│                             │   │                                       │
│  documents table            │   │  Embeddings:                          │
│  chunks table + VECTOR(384) │   │    BAAI/bge-small-en-v1.5  (130 MB)  │
│  query_history table        │   │                                       │
│  IVFFlat ANN index          │   │  Extractive QA:                       │
│  BM25 full-text index       │   │    deepset/tinyroberta-squad2 (65 MB) │
│  match_chunks() RPC         │   │                                       │
│  get_analytics() RPC        │   │  XAI: leave-one-out token attribution │
└─────────────────────────────┘   └───────────────────────────────────────┘
```

---

## XAI Features — How Explainability Works

### 1. Token Attribution Heat Map
Using **leave-one-out attribution**: each word in your query is temporarily masked, and we measure how much the retrieval similarity drops. Words that cause a large drop = high importance.

```
Query: "What are the key risk factors?"

key    [████████████ 95%] ← critical for retrieval
risk   [███████████  88%]
factors[███████      72%]
report [██████       60%]
What   [█            5%]
are    [             2%]
```

### 2. Grounding Score (Anti-Hallucination)
Measures what fraction of the answer's meaningful tokens appear in the retrieved source chunks. A score above 75% means the answer is **Highly Grounded** — it could not have been fabricated.

### 3. Chunk Attribution Weights
Each retrieved chunk gets an attribution weight showing how much it influenced the final answer, based on similarity score and QA confidence for that chunk.

### 4. Extractive QA — Zero Hallucination by Design
We use `deepset/tinyroberta-squad2` to **extract exact answer spans** from source text. The model cannot generate text that isn't in the sources — hallucination is structurally impossible.

---

## All Features

### Core Intelligence
| Feature | Details |
|---|---|
| Hybrid search | Vector (BGE) + BM25 keyword via Supabase RPC |
| Extractive QA | tinyRoberta extracts exact spans — zero hallucination by design |
| Zero external API | Own models: BGE-small (130MB) + tinyRoberta (65MB), CPU only |
| Multi-format ingestion | PDF, DOCX, TXT, Markdown — up to 50MB |
| Auto-summarization | Extractive summary generated on every document upload |
| PDF page tracking | Every chunk knows which page it came from |

### Explainability (XAI)
| Feature | Details |
|---|---|
| Token attribution heat map | Leave-one-out: which query words drove retrieval |
| Grounding score | Jaccard overlap: is the answer grounded in sources? |
| Hallucination alert | Visual warning badge when grounding score < 30% |
| Chunk attribution weights | % contribution of each chunk to the answer |
| Extracted span highlight | Exact text the QA model extracted per chunk |
| 3-step reasoning chain | Human-readable retrieval reasoning |

### UX & Productivity
| Feature | Details |
|---|---|
| Multi-turn chat | Full conversation history context across turns |
| Copy to clipboard | One-click copy of any answer |
| Export as Markdown | Download full Q&A + XAI report as `.md` file |
| Shareable permalink | `/query?q=...` URL — share any question |
| Suggested follow-ups | Auto-generated follow-up questions from chunks |
| Document search/filter | Filter dashboard by filename or summary |
| Dark/light mode toggle | Persistent preference |

### Infrastructure
| Feature | Details |
|---|---|
| Supabase pgvector | IVFFlat ANN index + BM25 GIN index in one database |
| Analytics dashboard | Confidence, grounding, latency trend charts (recharts) |
| Docker + docker-compose | One-command local development stack |
| CI/CD | GitHub Actions: backend tests, lint, frontend typecheck, Docker |
| Vercel deployment | `vercel.json` pre-configured |
| Render deployment | `render.yaml` pre-configured |

---

## Deploy to Production

**Full step-by-step guide:** [DEPLOY.md](DEPLOY.md)

| Platform | Service | Free Tier |
|---|---|---|
| [Supabase](https://supabase.com) | PostgreSQL + pgvector | 500MB database |
| [Render](https://render.com) | FastAPI backend | 512MB RAM |
| [Vercel](https://vercel.com) | Next.js frontend | Unlimited bandwidth |

```bash
# Frontend → Vercel (one command)
cd frontend && npx vercel --prod

# Backend → Render
# Push to GitHub, then create web service at render.com
# Root: backend/ | Build: pip install -r requirements.txt | Start: uvicorn app.main:app ...
```

---

## Quick Start (Local)

### Option 1 — Docker (recommended)

```bash
git clone https://github.com/Prasadkannawar/explainable-doc-rag-system.git
cd explainable-doc-rag-system

# 1. Set up Supabase — run supabase/schema.sql in your Supabase SQL editor
# 2. Create .env in root:
cp backend/.env.example backend/.env
# Edit backend/.env with your SUPABASE_URL and SUPABASE_SERVICE_KEY

docker-compose up --build
```

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

### Option 2 — Local

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env    # fill in SUPABASE_URL + SUPABASE_SERVICE_KEY
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

---

## Deploy to Production

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Point to `./backend` as root
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FRONTEND_URL`

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
# Set NEXT_PUBLIC_API_URL to your Render backend URL in Vercel env vars
```

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql)
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_KEY`

---

## API Reference

### Upload document
```bash
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -F "file=@report.pdf"
```
```json
{
  "document_id": "uuid",
  "filename": "report.pdf",
  "chunks_created": 38,
  "file_size_kb": 284.5,
  "summary": "This report covers quarterly performance...",
  "processing_time_ms": 1180.4,
  "status": "success"
}
```

### Query with XAI
```bash
curl -X POST http://localhost:8000/api/v1/query/ \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the main risk factors?"}'
```
```json
{
  "answer": "The primary risk factors identified are market volatility...",
  "confidence_score": 0.847,
  "source_chunks": [
    {
      "filename": "report.pdf",
      "content": "Market volatility remains the primary concern...",
      "similarity_score": 0.912,
      "relevance_label": "High",
      "attribution_weight": 0.61,
      "extracted_span": "market volatility remains the primary concern"
    }
  ],
  "xai": {
    "token_importance": [
      { "token": "risk", "importance": 0.0312, "normalized_importance": 0.95 },
      { "token": "factors", "importance": 0.0289, "normalized_importance": 0.88 }
    ],
    "grounding_score": 0.84,
    "grounding_label": "Highly Grounded",
    "reasoning_steps": [
      "Query analysis: key retrieval terms were 'risk', 'factors', 'report'...",
      "Hybrid search retrieved 5 chunks. Top match: 'report.pdf' (91% similarity).",
      "Grounding score is 84% — answer is strongly composed of source text."
    ]
  },
  "processing_time_ms": 1847.3
}
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 15 + TypeScript | SSR, Vercel-native, type-safe |
| Styling | Tailwind CSS + Framer Motion | Dark theme, smooth animations |
| Backend | FastAPI + Python 3.11 | Async, fast, OpenAPI docs auto-gen |
| Vector DB | Supabase pgvector | Production-grade, hybrid search support |
| Embeddings | `BAAI/bge-small-en-v1.5` | State-of-the-art small model, 384-dim |
| Extractive QA | `deepset/tinyroberta-squad2` | 65MB, CPU-friendly, zero hallucination |
| XAI | Leave-one-out + Jaccard grounding | Mathematically valid, fast on CPU |
| Deployment | Vercel (FE) + Render (BE) | Free tiers, zero-config |
| CI/CD | GitHub Actions | Test + lint + typecheck + Docker |

---

## Project Structure

```
explainable-doc-rag-system/
├── backend/
│   ├── app/
│   │   ├── api/routes/          documents.py · query.py · analytics.py
│   │   ├── core/config.py        Pydantic settings
│   │   ├── models/schemas.py     All request/response types
│   │   └── services/
│   │       ├── embedding_service.py   BGE-small own model
│   │       ├── qa_service.py          tinyRoberta own model
│   │       ├── xai_service.py         Token attribution + grounding
│   │       ├── supabase_service.py    pgvector + hybrid search RPC
│   │       ├── document_processor.py  Chunking + summary
│   │       └── rag_service.py         Pipeline orchestration
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           Landing page
│   │   │   ├── dashboard/         Document management
│   │   │   ├── query/             Ask + XAI panel
│   │   │   └── history/           Analytics dashboard
│   │   ├── lib/api.ts             Typed API client
│   │   └── types/index.ts         Shared TypeScript types
│   ├── package.json
│   └── Dockerfile
├── supabase/schema.sql             DB schema + hybrid search RPC
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md
```

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built by [Prasad Kannawar](https://github.com/Prasadkannawar) · Specializing in ML, Deep Learning, and production AI systems*
