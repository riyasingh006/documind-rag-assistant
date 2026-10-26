# DocuMind AI

DocuMind AI is a local-first document question-answering application. It combines a React workspace with a FastAPI retrieval-augmented generation (RAG) backend: upload PDF or TXT files, ask questions, and inspect the exact passages used to produce each answer.

The UI is honest about its evidence. Answers include source citations, retrieval scores, and page references. When no LLM is available, the backend falls back to a clearly labeled extractive answer built from retrieved sentences rather than inventing a response.

## Features

- Premium, responsive marketing site with accessible navigation, FAQ, and product previews.
- Upload PDF/TXT files with per-file progress, validation errors, and configurable chunking.
- Document library with search, type filters, metadata, and delete confirmation.
- Question answering scoped to all documents or a selected subset.
- Inline citation markers, expandable source evidence, relevance scores, and page references.
- Retrieval diagnostics showing candidates, passages that passed the cutoff, passages placed in the prompt, and citation usage.
- Relative relevance cutoff with an absolute similarity floor, so broad but relevant questions are not rejected while unrelated material still is.
- Greeting detection that skips retrieval when a document search is unnecessary.
- Chat history persisted for the browser session.
- Retrieval settings saved in `localStorage` per browser.
- Health reporting for the embedding model, vector index, and LLM provider.
- Local embeddings with FAISS; no mandatory external AI service.
- Optional Ollama or OpenAI-compatible generation.
- Explicit loading, empty, error, offline, insufficient-evidence, and degraded states.
- API and browser test coverage plus deterministic backend test fakes.

## Architecture

```text
Browser (React + Vite)
  |
  | JSON / multipart HTTP
  v
FastAPI
  |
  +-- Document extraction (PyMuPDF / UTF-8 / UTF-16 / CP1252)
  +-- Token-based overlapping chunking
  +-- sentence-transformers/all-MiniLM-L6-v2 embeddings
  |     +-- long chunks split into 256-token windows
  |     +-- window hits deduplicated back to parent chunks
  +-- FAISS inner-product index (cosine similarity)
  +-- Persisted metadata and vectors (JSON / npy)
  +-- Optional LLM
        +-- Ollama (preferred when reachable)
        +-- OpenAI-compatible endpoint
        +-- Labeled extractive fallback
```

Upload flow:

1. Validate filename, extension, size, and PDF page limit.
2. Extract and normalize text.
3. Split pages into overlapping approximate-token chunks.
4. Embed chunk windows locally.
5. Persist the original file, document metadata, parent chunks, and normalized vectors.
6. Rebuild the FAISS index.

Query flow:

1. Validate the question, document scope, top-K, and threshold. Greetings are answered without retrieval.
2. Embed the question locally.
3. Retrieve the nearest chunk rows, deduplicate overlapping windows, and keep candidates above the absolute similarity floor.
4. Apply the relative cutoff against the best match, then keep the requested top-K.
5. Build a bounded prompt from untrusted source passages.
6. Generate with the selected LLM, or produce an extractive fallback.
7. Validate citation IDs against the sources actually supplied.
8. Return the answer, sources, retrieval metadata, candidate diagnostics, and generation metadata.

## Quick Start

### Prerequisites

- Node.js 20 or newer
- Python 3.11
- npm
- No paid API key is required

The first backend startup downloads `sentence-transformers/all-MiniLM-L6-v2` (approximately 90 MB) and loads it locally on CPU.

### 1. Start the backend

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

On macOS or Linux, activate with `source .venv/bin/activate` and copy with `cp .env.example .env`. The paths in `backend/.env` are resolved relative to the backend directory.

Check the service:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Start the frontend

In a second terminal, from the project root:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173/workspace`.

For a production build:

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

The frontend calls `http://127.0.0.1:8000/api` by default. Set `VITE_API_URL` before building to use another API base.

### 3. Optional local LLM

The default `DOCUMIND_LLM_PROVIDER=auto` checks Ollama first. Configure the endpoint and the exact installed model tag in `backend/.env`:

```dotenv
DOCUMIND_LLM_PROVIDER=auto
DOCUMIND_OLLAMA_BASE_URL=http://localhost:11434
DOCUMIND_OLLAMA_MODEL=qwen2.5:3b
DOCUMIND_LLM_TIMEOUT_SECONDS=240
DOCUMIND_LLM_MAX_TOKENS=350
```

```powershell
ollama serve
ollama pull qwen2.5:3b
ollama list
```

Bare `OLLAMA_BASE_URL` and `OLLAMA_MODEL` variables are also accepted, but the `DOCUMIND_` names take precedence when both are present. The backend never pulls models automatically.

With Ollama running and the exact configured model installed, health reports `active_provider: "ollama"`, `status: "ready"`, `ollama_connected: true`, `model_available: true`, and `generation_active: true`. If Ollama is reachable but the model is missing, health reports `status: "model_missing"` and `auto` uses the labeled extractive fallback. If Ollama is unreachable, health reports `status: "unavailable"`.

To use an OpenAI-compatible provider instead, set these values in `backend/.env`:

```dotenv
DOCUMIND_LLM_PROVIDER=openai
DOCUMIND_OPENAI_BASE_URL=https://api.openai.com/v1
DOCUMIND_OPENAI_API_KEY=your-key
DOCUMIND_OPENAI_MODEL=gpt-4o-mini
```

When an external provider is configured, retrieved document excerpts are sent to that provider. Use Ollama or extractive mode if documents must remain entirely local.

## Configuration

All backend settings use the `DOCUMIND_` prefix. See `backend/.env.example` for the complete list.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DOCUMIND_DATA_DIR` | `backend/data` | Root directory for uploaded files and index state |
| `DOCUMIND_MAX_UPLOAD_MB` | `20` | Maximum upload size |
| `DOCUMIND_MAX_PDF_PAGES` | `500` | Maximum pages accepted from a PDF |
| `DOCUMIND_EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Local embedding model |
| `DOCUMIND_EMBEDDING_DEVICE` | `cpu` | `cpu`, `cuda`, or another sentence-transformers device |
| `DOCUMIND_CHUNK_SIZE` | `800` | Default approximate tokens per chunk |
| `DOCUMIND_CHUNK_OVERLAP` | `120` | Default overlap between chunks |
| `DOCUMIND_TOP_K` | `5` | Default number of parent chunks retrieved |
| `DOCUMIND_SCORE_THRESHOLD` | `0.2` | Default relative cutoff against the best match |
| `DOCUMIND_MIN_RELEVANCE_FLOOR` | `0.15` | Absolute cosine similarity floor for any candidate |
| `DOCUMIND_MAX_RETRIEVAL_CANDIDATES` | `50` | Maximum candidates inspected before the relative cutoff |
| `DOCUMIND_MAX_CONTEXT_CHARS` | `12000` | Maximum source text budget for a prompt |
| `DOCUMIND_MAX_EXCERPT_CHARS` | `1600` | Maximum excerpt length returned to the UI |
| `DOCUMIND_LLM_PROVIDER` | `auto` | `auto`, `ollama`, `openai`, or `extractive` |
| `DOCUMIND_LLM_TIMEOUT_SECONDS` | `240` | LLM request timeout |
| `DOCUMIND_LLM_TEMPERATURE` | `0.1` | LLM sampling temperature |
| `DOCUMIND_LLM_MAX_TOKENS` | `350` | Maximum generated tokens |
| `DOCUMIND_EXTRACTIVE_FALLBACK` | `true` | Permit labeled fallback answers |
| `DOCUMIND_OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama endpoint; bare `OLLAMA_BASE_URL` also accepted |
| `DOCUMIND_OLLAMA_MODEL` | `qwen2.5:3b` | Exact Ollama model tag; bare `OLLAMA_MODEL` also accepted |
| `DOCUMIND_OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible endpoint |
| `DOCUMIND_OPENAI_API_KEY` | empty | Enables the external provider when set |
| `DOCUMIND_OPENAI_MODEL` | `gpt-4o-mini` | External model name |
| `DOCUMIND_CORS_ORIGINS` | local ports | Comma-separated allowed browser origins |

Retrieval settings in the web UI are stored in the browser and are sent with uploads and queries. They do not rewrite backend environment defaults.

The UI cutoff is relative: a passage must score at least the selected percentage of the best match. For example, a 48% cutoff with a best score of `0.468` keeps passages scoring at least `0.225`, while the absolute floor still rejects unrelated queries whose best score is below `0.15`. This avoids treating raw MiniLM cosine similarity as a calibrated percentage.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Embedding, LLM, collection, limit, and default health |
| `GET` | `/api/documents` | List indexed documents |
| `POST` | `/api/documents` | Upload a PDF/TXT with optional chunk fields |
| `DELETE` | `/api/documents/{id}` | Delete a document and its vectors |
| `POST` | `/api/query` | Retrieve evidence and answer a question |

Example query:

```powershell
$body = @{
  question = "What is the evaluation identifier?"
  top_k = 5
  threshold = 0.2
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/api/query `
  -ContentType "application/json" `
  -Body $body
```

Responses include:

- `answer` and `answerable`
- `reason`: `answered`, `insufficient_evidence`, `no_documents`, or `greeting`
- `sources`: document ID, filename, page, chunk ID, chunk index, excerpt, similarity score, and whether each source was cited
- `retrieval`: top-K, relative threshold, candidates considered, candidates passed, top score, effective cutoff, absolute floor, chunks used, searched documents, and latency
- `generation`: provider, model, `llm` / `extractive` / `none`, latency, and fallback reason
- `health.llm`: configured provider, active provider, exact Ollama model, Ollama connectivity, model availability, generation state, and a status such as `ready`, `model_missing`, `unavailable`, `fallback`, `extractive`, or `not_configured`

Backend retrieval diagnostics are logged at `INFO` level with candidate counts, cutoff values, top score, and the number of passages placed in the prompt. The full question is truncated to 80 characters in logs.

## Testing

### Backend

From `backend/`:

```powershell
python -m pytest
```

The suite uses a deterministic fake embedder and mock HTTP transports, so it does not download models or require network access. It covers chunking, TXT/PDF extraction, persistence, FAISS search and scoping, deletion, re-embedding compatibility, prompts, citation validation, extractive fallback, LLM failure handling, relative cutoff and absolute-floor behavior, retrieval diagnostics, greeting bypass, Ollama connectivity, exact model-tag verification, missing-model and unavailable-provider states, generation timeouts, upload limits, API validation, CORS, and the complete upload/query/delete flow.

Current result: **70 passed**.

### Frontend unit tests

From the project root:

```powershell
npm test
```

Current result: **10 passed**.

### Browser tests

Start the backend first, then from the project root:

```powershell
npm run build
npm run test:e2e
```

Playwright reuses an existing preview server on port `4173` or starts one that serves the current `dist/` build. The desktop suite covers the full upload, ask, cite, greeting, and delete flow plus settings persistence. The mobile suite covers navigation, dialogs, route changes, and horizontal overflow. Landing tests run at desktop and mobile sizes.

Current result: **8 passed, 4 skipped**. The skips are intentional project-specific cases: desktop-only flows are skipped on mobile, and mobile-only checks are skipped on desktop.

### Production build

```powershell
npm run typecheck
npm run build
```

Both pass. Vite reports a non-blocking warning that the main JavaScript bundle is slightly above 500 kB.

## Data and Privacy

- Uploaded files and index data are stored under `backend/data/uploads` and `backend/data/index`.
- Vectors are normalized before being written and used with FAISS inner product, which is equivalent to cosine similarity.
- Documents are processed locally.
- Ollama runs locally.
- With an OpenAI-compatible provider, retrieved passages and questions are sent to that external service.
- The API has no authentication and is intended for local use only. Do not expose it to an untrusted network or bind it to a public interface.
- Uploaded content is not encrypted at rest by this application.
- Retrieved passages are treated as untrusted input and wrapped in delimiters, but prompt-injection defenses cannot be guaranteed against every model or document.

## Limitations

- Only PDF and TXT uploads are supported.
- Scanned or image-only PDFs are rejected because OCR is not included.
- Maximum upload size is 20 MB by default and PDFs are limited to 500 pages by default.
- The default embedding model has a 256-token sequence window; longer chunks are embedded as overlapping windows and deduplicated during retrieval.
- There is no authentication, user isolation, sharing, or document-level access control.
- There is no reranking model, hybrid keyword search, streaming response, or background ingestion queue.
- Retrieval quality depends on the embedding model. The UI exposes a relative cutoff and an absolute similarity floor so users can inspect behavior and reject unrelated material without discarding broad but relevant questions.
- The workspace is optimized for current desktop and mobile Chromium; other browsers were not part of the automated browser matrix.
- There is no Docker configuration.

## Troubleshooting

### Backend is offline in the workspace

Confirm `http://127.0.0.1:8000/api/health` responds and that the API is using port `8000`. The UI shows a backend-offline state instead of silently failing.

### Embedding model is not ready

Check the backend terminal for model download or dependency errors, then inspect `/api/health`. The first startup requires network access to download the model unless it is already cached.

### Answers say “Extractive answer from the retrieved passages”

No LLM generation completed. Check `/api/health` before assuming Ollama itself is down:

- `status: "unavailable"` means the Ollama API is not reachable. Run `ollama serve` and confirm `Invoke-RestMethod http://localhost:11434/api/tags`.
- `status: "model_missing"` means Ollama is reachable but the exact configured tag is absent. Run `ollama pull qwen2.5:3b`.
- If generation times out, the backend falls back only when `auto` plus `DOCUMIND_EXTRACTIVE_FALLBACK=true` are configured. Increase `DOCUMIND_LLM_TIMEOUT_SECONDS`, reduce `DOCUMIND_LLM_MAX_TOKENS`, or use a smaller model. The UI always labels extractive output and never claims it came from the LLM.

### Verify grounded Ollama answers

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health |
  Select-Object -ExpandProperty llm
```

Then ask a question scoped to an uploaded document and confirm `generation.mode` is `llm`, `generation.provider` is `ollama`, and every `sources[].chunk_id` belongs to a retrieved chunk. A reachable Ollama server alone does not prove retrieval succeeded; the API returns insufficient evidence without calling the LLM when no passage clears retrieval.

### Upload returns “No extractable text”

The PDF may be scanned or image-only. OCR is not included.

### Relevance is poor

Inspect the evidence panel: it separates candidates above the absolute floor, passages that passed the relative cutoff, passages placed in the prompt, and cited passages. If the top match is below the floor, the question and document may use different vocabulary; try rephrasing with terms from the document or confirm the selected scope. Adjust chunk size, overlap, top-K, or relative cutoff in Settings. Smaller chunks can improve precision; larger chunks preserve more context. Re-upload documents after changing chunking because chunking happens during ingestion.

## Project Structure

```text
.
|-- backend/
|   |-- app/
|   |   |-- main.py          FastAPI app, endpoints, lifespan
|   |   |-- config.py        Environment settings and paths
|   |   |-- schemas.py       Request and response models
|   |   |-- extraction.py    TXT/PDF extraction and filename validation
|   |   |-- chunking.py      Token-aware overlapping chunks
|   |   |-- embeddings.py    Local MiniLM embeddings and windowing
|   |   |-- store.py         Persistence, FAISS index, search, deletion
|   |   |-- rag.py           Retrieval, prompts, citation validation
|   |   `-- llm.py           Ollama/OpenAI clients, routing, extractive fallback
|   |-- tests/               Deterministic backend tests
|   |-- data/                Runtime uploads and index state
|   |-- requirements.txt
|   `-- .env.example
|-- e2e/                     Playwright landing and workspace tests
|-- src/
|   |-- components/          Marketing, workspace, and UI components
|   |-- context/             Workspace data and health context
|   |-- hooks/               Retrieval settings and tests
|   |-- lib/                 API client, types, formatting, tests
|   `-- pages/               Landing, workspace, documents, settings, 404
|-- tailwind.config.js
|-- vite.config.ts
`-- playwright.config.ts
```
