# DocuMind — Advanced RAG Assistant

DocuMind is a React/TypeScript workspace and FastAPI service for searching PDF/TXT documents and answering questions with retrieved, cited evidence. Google Gemini creates the text embeddings and grounded answers; FAISS provides local vector search.

## What it does

- Upload, extract, chunk, search, and delete PDF/TXT documents.
- Generate document and query embeddings with Gemini `gemini-embedding-001` (768 dimensions).
- Retrieve with FAISS cosine-style similarity over normalised vectors and configurable thresholds/top-K.
- Generate concise, source-grounded answers with Gemini `gemini-3.8-flash`; validate returned citation IDs against retrieved sources.
- Retry transient Gemini failures within a bounded time budget; when enabled, clearly label the evidence-only extractive fallback.
- Persist documents, metadata, and vectors as files under `backend/data` by default. Existing indexes are checked and re-embedded when the embedding model or vector mappings change.
- Report embedding, FAISS migration, Gemini configuration, and service health through `/api/health`.

Scanned/image-only PDFs are not OCR'd. The application has no authentication or per-user data isolation: do not expose private documents through a public API.

## Architecture

```text
React / TypeScript (Vite)
        │ HTTP / same-origin dev proxy
        ▼
FastAPI ── PDF/TXT extraction ── chunking
   │                             │
   ├── Gemini Embedding API ◀────┘
   │         │
   │         ▼
   │    normalised vectors ── FAISS ── retrieved source passages
   │                                        │
   └──────────── Gemini GenerateContent ◀───┘
                         │
                 citation validation
```

The Gemini API key is read only by the backend. Document and question text are sent to Google for embeddings; retrieved passages and the question are also sent for answer generation. If this data flow is not acceptable, do not upload the relevant documents.

## Local setup

Requirements: Python 3.11+, Node.js 20.19+, npm, and a Gemini API key. The backend calls Gemini over HTTPS and installs no local model runtime.

1. Create `backend/.env` from `backend/.env.example` and set `DOCUMIND_GEMINI_API_KEY`.
2. Install and start the API:

   ```bash
   cd backend
   python -m venv .venv
   . .venv/bin/activate
   pip install -r requirements-dev.txt
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

   The API health endpoint is `http://127.0.0.1:8000/api/health`; interactive API docs are at `/docs`.
3. In another terminal, from the repository root:

   ```bash
   npm ci
   npm run dev
   ```

   Open the Vite URL printed in the terminal (normally `http://localhost:5173`). Vite proxies `/api` to the local API on port 8000.

The API remains available without a Gemini key, but embeddings cannot be created; health reports degraded and upload/query return a clear service-unavailable response. A configured Gemini key is required for the full RAG flow.

## Configuration

All backend environment variables use the `DOCUMIND_` prefix. The complete example is in `backend/.env.example`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DOCUMIND_GEMINI_API_KEY` | unset | Google Gemini API key; keep it on the backend only. |
| `DOCUMIND_EMBEDDING_MODEL` | `gemini-embedding-001` | Gemini text embedding model. |
| `DOCUMIND_EMBEDDING_DIMENSION` | `768` | Embedding size; 768 is a Gemini-recommended dimension. A change triggers re-embedding. |
| `DOCUMIND_EMBEDDING_BATCH_SIZE` | `32` | Texts per embedding API request batch (maximum 100). |
| `DOCUMIND_LLM_PROVIDER` | `gemini` | `gemini` or `extractive`. |
| `DOCUMIND_LLM_MODEL` | `gemini-3.8-flash` | Gemini generation model. |
| `DOCUMIND_EXTRACTIVE_FALLBACK` | `true` | Use and label a passage-based fallback after Gemini failure. |
| `DOCUMIND_LLM_TIMEOUT_SECONDS` | `20` | Per-attempt generation timeout. |
| `DOCUMIND_LLM_RETRY_BUDGET_SECONDS` | `35` | Total bounded generation retry budget. |
| `DOCUMIND_DATA_DIR` | `backend/data` | Directory for uploaded files and FAISS/index data. |
| `DOCUMIND_CORS_ORIGINS` | local origins and the Render frontend | Comma-separated browser origins; include only trusted origins. |
| `DOCUMIND_CORS_ORIGIN_REGEX` | unset | Optional regex for trusted preview origins. |
| `DOCUMIND_MAX_UPLOAD_MB` | `20` | Upload size limit. |
| `DOCUMIND_MAX_PDF_PAGES` | `500` | PDF page limit. |

Changing `DOCUMIND_EMBEDDING_MODEL` or the dimension does not mix vector spaces: startup marks the index as migrating and rebuilds it from stored chunks. During a failed migration, query and upload return 503 instead of searching stale vectors; health reports the index error. Keep a backup of `backend/data` before changing embedding settings or performing a deployment.

## Render deployment

The repository contains `render.yaml` for the existing **API web service**. The frontend is already hosted separately on Render at `https://documind-rag-assistant.onrender.com`; the frontend defaults to the API URL `https://documind-rag-assistant-api.onrender.com/api`. Do not use GitHub Pages for this deployment.

For an existing Render API service, set the following in **Settings → Build & Deploy**:

- **Root directory:** `backend`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT` — keep `$PORT` exactly as shown.
- **Health-check path:** `/api/health`

In **Environment**, add `DOCUMIND_GEMINI_API_KEY` as a secret (get a key from [Google AI Studio](https://aistudio.google.com/app/apikey)); set `DOCUMIND_LLM_PROVIDER=gemini`, `DOCUMIND_LLM_MODEL=gemini-3.8-flash`, `DOCUMIND_EMBEDDING_MODEL=gemini-embedding-001`, `DOCUMIND_EMBEDDING_DIMENSION=768`, `DOCUMIND_CORS_ORIGINS=https://documind-rag-assistant.onrender.com`, and `DOCUMIND_EXTRACTIVE_FALLBACK=true`. Do not add the Gemini key as a `VITE_` variable or commit it.

`render.yaml` describes the API service with these build/start/health values and marks the Gemini key `sync: false` so Render requests it as a secret. Check the Render dashboard before syncing: if the Blueprint proposes creating a duplicate API service rather than updating your existing service, cancel and copy these values into the existing service. The start command preserves the required `$PORT` form. This repository change does not deploy or alter a live Render service.

Render's default filesystem is ephemeral. To retain uploads and vectors across redeploys, attach a persistent disk to the API service, mount it (for example) at `/var/data`, and set `DOCUMIND_DATA_DIR=/var/data`. Persistent disks may have a plan-dependent charge; the repository Blueprint does **not** create one. Without a disk, back up documents before deploys because platform restarts/redeploys may remove them.

The front-end Render static site needs `VITE_API_URL=https://documind-rag-assistant-api.onrender.com/api` at build time if its service does not already use that setting. The current API hostname returned HTTP 502 with Render's `no-deploy` routing marker during this audit, so deployed end-to-end Gemini behavior could not be verified here. The repo's API and browser tests run without a live Gemini credential.

## API overview

- `GET /api/health` — process, embedding, index migration, provider, and document counts.
- `GET /api/documents` — list indexed documents.
- `POST /api/documents` — multipart PDF/TXT upload; optional `chunk_size` and `chunk_overlap`.
- `DELETE /api/documents/{document_id}` — remove a document and its vectors.
- `POST /api/query` — JSON containing `question`, optional `document_ids`, `top_k`, and `threshold`.

## Tests and checks

From the repository root:

```bash
npm ci
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Backend tests use deterministic fake embeddings/LLM responses and do not call Gemini:

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

The Playwright workspace flow stubs API responses so it is repeatable and does not create documents in a live Render service. Provider retry, API payload, embedding batch, citation, migration, rollback, upload, deletion, and health behavior are covered by automated tests.
