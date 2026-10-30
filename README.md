# 🧠 DocuMind — Advanced RAG-Powered Document Intelligence Assistant

<p align="center">
  <strong>Transform Documents into Knowledge. Retrieve with Precision. Answer with Evidence.</strong>
</p>

<p align="center">
  An advanced Retrieval-Augmented Generation (RAG) application that enables intelligent document understanding, semantic search, and context-aware question answering using Google Gemini, FAISS, and FastAPI.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-Language-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/FAISS-Vector_Search-00A67E?style=for-the-badge" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/RAG-Retrieval_Augmented_Generation-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/Status-Active_Development-success?style=flat-square" />
  <img src="https://img.shields.io/badge/License-Not_Specified-lightgrey?style=flat-square" />
</p>

---

# 📌 1. Project Overview

**DocuMind** is an advanced AI-powered document intelligence workspace designed to transform static PDF and TXT documents into searchable, context-aware knowledge sources.

Built on the principles of **Retrieval-Augmented Generation (RAG)**, DocuMind combines semantic vector retrieval with Large Language Model (LLM) capabilities to generate answers grounded in the actual content of uploaded documents.

Instead of relying entirely on a language model's pretrained knowledge, DocuMind retrieves relevant document passages and uses them as contextual evidence before generating an answer.

The system integrates:

* **React + TypeScript** for an interactive document workspace.
* **FastAPI** for scalable API communication and backend orchestration.
* **Google Gemini Embedding API** for semantic vector generation.
* **FAISS** for efficient similarity-based vector retrieval.
* **Google Gemini LLM** for contextual answer generation.
* **Citation Validation** for ensuring generated source references correspond to retrieved evidence.

### 🎯 Core Objective

To provide a document-centric AI assistant that allows users to upload documents, search their contents semantically, and obtain accurate, concise, and source-supported answers through an integrated RAG pipeline.

---

# ✨ 2. Key Features

## 📂 Intelligent Document Management

* Upload PDF and TXT documents through the web interface.
* Extract readable textual content from supported documents.
* Process documents into manageable text chunks.
* Maintain document metadata and indexing information.
* Retrieve and delete previously uploaded documents.
* Enforce configurable upload-size and PDF-page limits.

## 🧠 Advanced Semantic Embeddings

* Generate contextual document embeddings using Google's `gemini-embedding-001`.
* Generate query embeddings using the same embedding space.
* Support configurable 768-dimensional embedding vectors.
* Process multiple texts using configurable embedding batches.
* Normalize vectors before similarity-based retrieval.

## 🔍 FAISS-Powered Vector Retrieval

* Store and search document vectors using FAISS.
* Perform cosine-style similarity retrieval over normalized vectors.
* Retrieve the most relevant document passages.
* Configure Top-K retrieval and similarity thresholds.
* Maintain vector-to-document and chunk mappings.
* Detect embedding-model or vector-mapping changes.

## 🤖 Context-Aware AI Answer Generation

* Generate answers using Google's Gemini model.
* Provide retrieved document passages as contextual evidence.
* Generate concise, relevant, document-grounded responses.
* Validate generated citation IDs against retrieved sources.
* Apply bounded retries for transient Gemini API failures.
* Support an evidence-only extractive fallback when enabled.

## 📊 System Health & Monitoring

* Monitor backend service availability.
* Track embedding initialization status.
* Report FAISS index readiness and migration state.
* Monitor Gemini configuration and availability.
* Track document, chunk, and vector counts.
* Expose operational information through `/api/health`.

## ⚙️ Reliability & Data Management

* Persist document metadata and vector data under the configured data directory.
* Validate existing indexes during initialization.
* Re-embed stored chunks when embedding configurations change.
* Prevent retrieval against stale vectors during failed migrations.
* Return clear service-unavailable responses when required AI services are unavailable.

---

# 🏗️ 3. System Architecture

DocuMind follows a modular client-server architecture that separates the presentation layer, document-processing pipeline, embedding generation, vector retrieval, and LLM-based response generation.

### High-Level Architecture

```text
                 USER
                   |
                   ▼
       ┌─────────────────────────┐
       │    React + TypeScript   │
       │      Frontend           │
       └────────────┬────────────┘
                    |
               HTTP / REST
                    |
                    ▼
       ┌─────────────────────────┐
       │       FastAPI           │
       │    Backend Service      │
       └────────────┬────────────┘
                    |
          ┌─────────┴──────────┐
          |                    |
          ▼                    ▼
 ┌────────────────┐   ┌─────────────────┐
 │ Document       │   │ Query           │
 │ Processing     │   │ Processing      │
 └───────┬────────┘   └────────┬────────┘
         |                     |
         ▼                     ▼
 ┌────────────────┐   ┌─────────────────┐
 │ PDF/TXT        │   │ Query Embedding │
 │ Text Extraction│   │ Generation      │
 └───────┬────────┘   └────────┬────────┘
         |                     |
         ▼                     |
 ┌────────────────┐            |
 │ Text Chunking  │            |
 └───────┬────────┘            |
         |                     |
         ▼                     |
 ┌─────────────────────────────┐
 │ Google Gemini Embedding API │
 │     gemini-embedding-001    │
 └──────────────┬──────────────┘
                |
                ▼
       ┌─────────────────┐
       │ Normalized      │
       │ Vector Storage  │
       └────────┬────────┘
                |
                ▼
       ┌─────────────────┐
       │ FAISS Vector    │
       │ Index           │
       └────────┬────────┘
                |
                ▼
       ┌─────────────────┐
       │ Similarity      │
       │ Search          │
       └────────┬────────┘
                |
                ▼
       ┌─────────────────┐
       │ Retrieved       │
       │ Source Passages │
       └────────┬────────┘
                |
                ▼
       ┌─────────────────────────┐
       │ Google Gemini LLM       │
       │ Grounded Generation     │
       └────────────┬────────────┘
                    |
                    ▼
       ┌─────────────────────────┐
       │ Citation Validation    │
       └────────────┬────────────┘
                    |
                    ▼
       ┌─────────────────────────┐
       │ Final Answer + Sources  │
       └─────────────────────────┘
```

### Architecture Components

| Component             | Technology               | Responsibility                             |
| --------------------- | ------------------------ | ------------------------------------------ |
| Presentation Layer    | React, TypeScript        | User interface and document workspace      |
| Build Tool            | Vite                     | Frontend development and production builds |
| API Layer             | FastAPI                  | HTTP endpoints and request handling        |
| Document Processing   | Python                   | PDF/TXT extraction and chunking            |
| Embedding Engine      | Google Gemini            | Semantic vector generation                 |
| Embedding Model       | gemini-embedding-001     | 768-dimensional text embeddings            |
| Vector Database/Index | FAISS                    | Similarity-based vector retrieval          |
| Generation Engine     | Google Gemini            | Context-grounded answer generation         |
| Citation Validation   | Backend validation logic | Validate generated source references       |
| Persistence           | File-based storage       | Document, metadata, and vector persistence |

---

# 🔄 4. Complete RAG Pipeline

DocuMind implements a document-centric Retrieval-Augmented Generation pipeline consisting of two primary workflows:

1. Document Ingestion Pipeline
2. Query Retrieval and Generation Pipeline

## 4.1 Document Ingestion Pipeline

The ingestion pipeline converts uploaded documents into searchable semantic representations.

### Step 1 — Document Upload

The user uploads a PDF or TXT file through the frontend.

The backend receives the document through the document-upload API and validates its format and configured size restrictions.

### Step 2 — Text Extraction

The backend extracts readable text from the uploaded document.

Supported formats:

* PDF
* TXT

**Note:** Scanned and image-only PDFs are not OCR-processed.

### Step 3 — Text Chunking

Extracted text is divided into smaller, manageable chunks.

Chunking helps:

* Reduce unnecessary context.
* Improve retrieval precision.
* Provide focused passages to the LLM.
* Preserve relevant document information.

Default configuration:

| Parameter     | Default |
| ------------- | ------: |
| Chunk Size    |     800 |
| Chunk Overlap |     120 |

Chunk overlap helps preserve contextual continuity between consecutive passages.

### Step 4 — Embedding Generation

Each document chunk is converted into a numerical vector representation using:

`gemini-embedding-001`

Configured embedding dimension:

`768`

These embeddings capture semantic information and allow the system to identify conceptually related passages.

### Step 5 — Vector Normalization

Generated vectors are normalized before being stored and searched.

This enables cosine-style similarity calculations using FAISS.

### Step 6 — FAISS Indexing

The generated vectors are added to the FAISS index.

The system maintains the associated document and chunk mappings to identify the original source passages during retrieval.

### Step 7 — Persistence

The application stores document files, metadata, and vector/index information under the configured data directory.

Default location:

`backend/data`

---

## 4.2 Query Retrieval & Generation Pipeline

Once documents are indexed, users can ask natural-language questions.

### Step 1 — User Query

The user enters a question related to the uploaded documents.

Example:

"What are the main objectives discussed in this document?"

### Step 2 — Query Embedding

The question is converted into a semantic vector using the same embedding model and vector dimension used for document chunks.

### Step 3 — Similarity Search

FAISS searches the indexed document vectors and identifies passages that are semantically similar to the query.

### Step 4 — Top-K Retrieval

The system retrieves the most relevant passages according to the configured retrieval parameters.

Default values:

* Top-K: 5
* Score Threshold: 0.2
* Minimum Similarity Floor: 0.15

### Step 5 — Context Construction

The retrieved passages are assembled into contextual evidence for the language model.

### Step 6 — Grounded Answer Generation

Google Gemini receives:

* The user's question.
* The retrieved document passages.
* Instructions to generate an answer grounded in the supplied evidence.

### Step 7 — Citation Validation

The backend validates generated citation IDs against the retrieved source identifiers.

This helps prevent references to sources that were not included in the retrieval results.

### Step 8 — Final Response

The application returns the generated answer along with its associated source information.

If Gemini generation fails and fallback is enabled, the system can provide an evidence-only extractive response with the fallback clearly identified.

---

# 🧰 5. Technology Stack

## Frontend Technologies

| Technology  | Purpose                                        |
| ----------- | ---------------------------------------------- |
| React       | Component-based user interface                 |
| TypeScript  | Static typing and maintainable frontend code   |
| Vite        | Development server and production build system |
| HTTP / REST | Frontend-backend communication                 |

## Backend Technologies

| Technology         | Purpose                                  |
| ------------------ | ---------------------------------------- |
| Python             | Backend development and AI orchestration |
| FastAPI            | REST API development                     |
| Uvicorn            | ASGI application server                  |
| PDF/TXT Processing | Document text extraction                 |
| Pydantic           | Request and configuration validation     |

## AI & Retrieval Technologies

| Technology           | Purpose                         |
| -------------------- | ------------------------------- |
| Google Gemini API    | Embedding and answer generation |
| gemini-embedding-001 | Semantic embedding generation   |
| gemini-3.8-flash     | Configured LLM generation model |
| FAISS                | Vector similarity search        |
| NumPy                | Numerical vector operations     |

## Development & Deployment

| Technology | Purpose                        |
| ---------- | ------------------------------ |
| Git        | Version control                |
| GitHub     | Source code management         |
| npm        | Frontend dependency management |
| pip        | Python dependency management   |
| Render     | Frontend and backend hosting   |
| Playwright | End-to-end browser testing     |
| Pytest     | Backend automated testing      |

---

# ⚙️ 6. Configuration & Environment Variables

DocuMind uses backend environment variables with the `DOCUMIND_` prefix.

The complete configuration reference is maintained in:

`backend/.env.example`

### Environment Configuration

| Variable                            | Default Value                       | Description                          |
| ----------------------------------- | ----------------------------------- | ------------------------------------ |
| `DOCUMIND_GEMINI_API_KEY`           | Unset                               | Google Gemini API authentication     |
| `DOCUMIND_EMBEDDING_MODEL`          | `gemini-embedding-001`              | Embedding model                      |
| `DOCUMIND_EMBEDDING_DIMENSION`      | `768`                               | Embedding vector dimension           |
| `DOCUMIND_EMBEDDING_BATCH_SIZE`     | `32`                                | Texts processed per embedding batch  |
| `DOCUMIND_LLM_PROVIDER`             | `gemini`                            | Configured generation provider       |
| `DOCUMIND_LLM_MODEL`                | `gemini-3.8-flash`                  | Configured generation model          |
| `DOCUMIND_EXTRACTIVE_FALLBACK`      | `true`                              | Enables evidence-only fallback       |
| `DOCUMIND_LLM_TIMEOUT_SECONDS`      | `20`                                | Generation attempt timeout           |
| `DOCUMIND_LLM_RETRY_BUDGET_SECONDS` | `35`                                | Total bounded retry budget           |
| `DOCUMIND_DATA_DIR`                 | `backend/data`                      | Document and index storage directory |
| `DOCUMIND_CORS_ORIGINS`             | Local and configured Render origins | Trusted frontend origins             |
| `DOCUMIND_CORS_ORIGIN_REGEX`        | Unset                               | Optional trusted-origin regex        |
| `DOCUMIND_MAX_UPLOAD_MB`            | `20`                                | Maximum upload size                  |
| `DOCUMIND_MAX_PDF_PAGES`            | `500`                               | Maximum PDF page count               |

### 🔐 API Key Security

The Gemini API key must remain exclusively on the backend.

Never:

* Add the Gemini API key to a `VITE_` frontend environment variable.
* Commit `.env` files to GitHub.
* Expose API credentials in browser-side code.
* Share secrets in public logs or screenshots.

The frontend communicates with the backend, while the backend securely handles Gemini API requests.

---

# 🚀 7. Local Installation & Setup

## Prerequisites

Install the following before running DocuMind locally:

* Python 3.11 or later
* Node.js 20.19 or later
* npm
* Git
* Google Gemini API key

### Step 1 — Clone the Repository

```bash
git clone https://github.com/riyasingh006/documind-rag-assistant.git

cd documind-rag-assistant
```

### Step 2 — Configure Backend Environment

Navigate to the backend directory:

```bash
cd backend
```

Create a `.env` file using `.env.example` as the reference.

Add your Gemini API key:

```env
DOCUMIND_GEMINI_API_KEY=your_gemini_api_key
```

Configure the remaining variables according to your requirements.

### Step 3 — Create a Python Virtual Environment

```bash
python -m venv .venv
```

Activate it.

**Windows:**

```bash
.venv\Scripts\activate
```

**Linux / macOS:**

```bash
source .venv/bin/activate
```

### Step 4 — Install Backend Dependencies

```bash
pip install -r requirements-dev.txt
```

### Step 5 — Start the FastAPI Server

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Backend URL:

`http://127.0.0.1:8000`

Health endpoint:

`http://127.0.0.1:8000/api/health`

Interactive API documentation:

`http://127.0.0.1:8000/docs`

### Step 6 — Install Frontend Dependencies

Open a new terminal from the repository root:

```bash
npm ci
```

### Step 7 — Start the Frontend

```bash
npm run dev
```

Open the local Vite URL displayed in the terminal, normally:

`http://localhost:5173`

The Vite development server proxies `/api` requests to the local FastAPI service on port `8000`.

---

# ☁️ 8. Deployment Architecture — Render

DocuMind uses separate frontend and backend deployments.

| Layer       | Hosting Platform   | Service                   |
| ----------- | ------------------ | ------------------------- |
| Frontend    | Render Static Site | React + Vite              |
| Backend     | Render Web Service | FastAPI                   |
| AI Services | Google Gemini API  | Embeddings and generation |

### Production URLs

**Frontend:**

`https://documind-rag-assistant.onrender.com`

**Backend:**

`https://documind-rag-assistant-api.onrender.com`

**Backend Health:**

`https://documind-rag-assistant-api.onrender.com/api/health`

**API Documentation:**

`https://documind-rag-assistant-api.onrender.com/docs`

## 8.1 Backend Deployment Configuration

For the existing Render API Web Service:

| Setting           | Configuration                                      |
| ----------------- | -------------------------------------------------- |
| Root Directory    | `backend`                                          |
| Build Command     | `pip install -r requirements.txt`                  |
| Start Command     | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/api/health`                                      |

Keep `$PORT` exactly as shown so Render can provide the assigned service port.

## 8.2 Backend Environment Configuration

Add the following variables in:

**Render → Backend Service → Environment**

```env
DOCUMIND_GEMINI_API_KEY=your_secret_api_key

DOCUMIND_LLM_PROVIDER=gemini
DOCUMIND_LLM_MODEL=gemini-3.8-flash

DOCUMIND_EMBEDDING_MODEL=gemini-embedding-001
DOCUMIND_EMBEDDING_DIMENSION=768

DOCUMIND_CORS_ORIGINS=https://documind-rag-assistant.onrender.com

DOCUMIND_EXTRACTIVE_FALLBACK=true
```

Add the actual Gemini API key as a secret environment variable.

Do not commit it to the repository.

## 8.3 Frontend Deployment Configuration

For the Render frontend Static Site, configure:

| Key            | Value                                                 |
| -------------- | ----------------------------------------------------- |
| `VITE_API_URL` | `https://documind-rag-assistant-api.onrender.com/api` |

This variable must be available during the Vite production build.

After updating the variable, redeploy the frontend.

## 8.4 Render Blueprint

The repository includes:

`render.yaml`

It describes the API service's build command, start command, health-check path, and secret configuration.

When using Blueprint synchronization:

* Inspect the proposed service changes.
* Avoid accidentally creating a duplicate backend service.
* If a duplicate service is proposed, cancel synchronization and configure the existing service manually.

## 8.5 Persistent Storage Considerations

Render's default filesystem is ephemeral.

This means uploaded files and vector data may not survive service restarts or redeployments.

For persistent storage:

1. Attach a persistent disk to the backend service.
2. Configure an appropriate mount path, such as `/var/data`.
3. Set:

```env
DOCUMIND_DATA_DIR=/var/data
```

Persistent disk availability and pricing depend on the Render plan.

Without persistent storage, maintain backups of uploaded documents and index data before redeployments.

---

# 🔌 9. REST API Reference

DocuMind exposes REST endpoints through its FastAPI backend.

Base URL:

```text
http://127.0.0.1:8000
```

Production base URL:

```text
https://documind-rag-assistant-api.onrender.com
```

| Method | Endpoint                       | Description                                      |
| ------ | ------------------------------ | ------------------------------------------------ |
| GET    | `/api/health`                  | Backend and AI service health                    |
| GET    | `/api/documents`               | Retrieve uploaded document records               |
| POST   | `/api/documents`               | Upload and process a PDF/TXT document            |
| DELETE | `/api/documents/{document_id}` | Delete a document and its associated vectors     |
| POST   | `/api/query`                   | Perform semantic retrieval and answer generation |

## 9.1 Health Check

```http
GET /api/health
```

Provides information about:

* Backend availability.
* Embedding service readiness.
* FAISS index state.
* Gemini provider configuration.
* Document and chunk counts.
* Service limits and defaults.

## 9.2 List Documents

```http
GET /api/documents
```

Returns the document records currently maintained by the application.

## 9.3 Upload Document

```http
POST /api/documents
Content-Type: multipart/form-data
```

Accepts PDF or TXT files.

Optional processing parameters:

* `chunk_size`
* `chunk_overlap`

## 9.4 Delete Document

```http
DELETE /api/documents/{document_id}
```

Removes the specified document and its associated vector records.

## 9.5 Query Documents

```http
POST /api/query
Content-Type: application/json
```

Example request:

```json
{
  "question": "What are the major findings discussed in the document?",
  "document_ids": [],
  "top_k": 5,
  "threshold": 0.2
}
```

The backend processes the question, retrieves relevant passages, and generates a grounded response when the required AI services are available.

For exact request and response schemas, refer to the interactive FastAPI documentation at `/docs`.

---

# 🛡️ 10. Reliability, Error Handling & Index Migration

DocuMind includes safeguards to prevent unreliable retrieval and misleading AI responses.

### Embedding Service Availability

When the Gemini API key is missing or the embedding service is unavailable, the system reports degraded health and returns clear service-unavailable responses for operations that require embeddings.

### Bounded Generation Retries

Transient Gemini generation failures can be retried within a configured time budget.

This prevents unlimited retry loops and keeps generation attempts bounded.

### Extractive Fallback

When enabled, the application can fall back to evidence-only extractive responses after generation failures.

Fallback responses are explicitly identified rather than being presented as successful Gemini-generated answers.

### Index Compatibility

The system checks existing vector indexes for compatibility with the configured embedding model and vector mappings.

If the embedding model or vector dimension changes, existing stored chunks are re-embedded to rebuild a compatible index.

### Failed Migration Protection

During a failed index migration:

* The index reports its migration error.
* Upload and query operations return HTTP 503.
* The system avoids searching stale or incompatible vectors.

**Important:** Back up the configured data directory before changing embedding models or dimensions.

---

# 🧪 11. Testing & Quality Assurance

DocuMind includes automated checks covering frontend, backend, API behavior, and the document-processing workflow.

## Frontend Testing

Run from the repository root:

```bash
npm ci
npm test
npm run typecheck
npm run build
```

### End-to-End Testing

Install the Playwright browser:

```bash
npx playwright install chromium
```

Run end-to-end tests:

```bash
npm run test:e2e
```

The workspace flow uses stubbed API responses to provide repeatable browser tests without creating documents in the live Render service.

## Backend Testing

Navigate to the backend directory:

```bash
cd backend
```

Install development dependencies:

```bash
pip install -r requirements-dev.txt
```

Run tests:

```bash
python -m pytest
```

### Automated Test Coverage

The backend tests cover:

* Provider retry behavior.
* API payload validation.
* Embedding batch processing.
* Citation validation.
* Index migration.
* Migration rollback.
* Document upload.
* Document deletion.
* Health reporting.

Tests use deterministic fake embedding and LLM responses and do not require live Gemini credentials.

---

# 🔐 12. Security & Privacy Considerations

Security and data isolation are important considerations when deploying document intelligence systems.

### API Key Protection

* Gemini credentials are maintained on the backend.
* Secret variables should be configured through deployment environment settings.
* Sensitive credentials must never be exposed in frontend bundles or public repositories.

### CORS Configuration

Only trusted frontend origins should be included in `DOCUMIND_CORS_ORIGINS`.

Avoid unnecessarily broad CORS configurations.

### Document Privacy

DocuMind sends document text to Google for embedding generation. Retrieved passages and user questions are also sent to Google Gemini for answer generation.

Users should understand this data flow before uploading sensitive documents.

### Authentication Limitation

The current application does not provide authentication or per-user document isolation.

Therefore, it should not be exposed as a public multi-user document service for private or confidential files without additional security controls.

---

# ⚠️ 13. Current Limitations

| Area              | Limitation                                                                     |
| ----------------- | ------------------------------------------------------------------------------ |
| Document Formats  | PDF and TXT only                                                               |
| OCR               | Scanned/image-only PDFs are not OCR-processed                                  |
| Authentication    | No authentication layer                                                        |
| User Isolation    | No per-user data separation                                                    |
| Embeddings        | Requires a configured and available Gemini API                                 |
| Answer Generation | Requires a configured and available Gemini model                               |
| Persistence       | Render filesystem is ephemeral without persistent storage                      |
| AI Reliability    | Gemini requests may fail because of API availability, quota, or network issues |
| Fallback          | Extractive fallback does not provide full generative capabilities              |

---

# 🔮 14. Future Enhancement Roadmap

Potential future improvements for DocuMind include:

* **OCR Integration:** Extract text from scanned and image-based PDFs.
* **Advanced Chunking:** Add semantic chunking and document-aware segmentation.
* **Hybrid Retrieval:** Combine vector search with keyword-based retrieval.
* **Reranking:** Improve passage relevance using a dedicated reranking stage.
* **Conversation Memory:** Support contextual follow-up questions.
* **Multi-Format Support:** Extend document ingestion to DOCX and additional formats.
* **Authentication:** Introduce secure user authentication and authorization.
* **Multi-Tenant Storage:** Provide user-specific document collections and access isolation.
* **Advanced Analytics:** Track retrieval quality, latency, and generation performance.
* **Document Summarization:** Generate structured document summaries.
* **Export Functionality:** Export generated answers and document insights.
* **Improved Observability:** Add structured logs, request tracing, and performance monitoring.

---

# 📁 15. Project Repository

**GitHub Repository:**

https://github.com/riyasingh006/documind-rag-assistant

The project separates frontend presentation, backend API orchestration, AI integration, and document storage into distinct areas.

Refer to the repository's actual directory structure for the latest implementation details.

---

# 💡 16. Why DocuMind?

Traditional document search often depends on exact keyword matching, making it difficult to find information when a user's question uses different wording from the original document.

DocuMind addresses this challenge through semantic retrieval and grounded generation.

Its RAG architecture provides:

* Meaning-based document retrieval.
* Context-aware question answering.
* Source-supported responses.
* Configurable similarity retrieval.
* Citation reference validation.
* Controlled fallback behavior.
* Modular separation of AI and application services.

By combining vector search with language-model generation, DocuMind turns document collections into interactive knowledge sources.

---

# 👩‍💻 17. Developer

**Developed by: Riya Singh**

BCA — Artificial Intelligence & Machine Learning

Interested in Artificial Intelligence, Machine Learning, Java Development, and intelligent software engineering solutions.

### Connect & Explore

* GitHub: [@riyasingh006](https://github.com/riyasingh006)
* Project Repository: [DocuMind — Advanced RAG Assistant](https://github.com/riyasingh006/documind-rag-assistant)

---

<p align="center">
  <strong>🧠 DocuMind — From Documents to Intelligent Insights.</strong>
</p>

<p align="center">
  Built with Python, React, FAISS, and Google Gemini.
</p>
