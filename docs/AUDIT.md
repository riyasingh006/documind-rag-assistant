# DocuMind baseline audit

**Audit date:** 2026-10-30  
**Audited base:** `main` at `02407eb`  
**Working branch:** `feature/complete-documind-gemini-upgrade`  
**Scope:** repository history and status, backend/API, embeddings and FAISS persistence, LLM routing, frontend/API contract, tests, dependency audit, and Render deployment.

## Baseline verification

- Backend: **99 passed**.
- Frontend unit tests: **13 passed**.
- TypeScript check and Vite production build: **passed**; Vite reports a 541 kB minified JavaScript bundle.
- `npm audit`: **8 advisories** (5 moderate, 1 high, 2 critical); two moderate advisories affect production dependencies (`react-router` / `react-router-dom`), and the critical/high advisories affect the development/test toolchain.
- End-to-end tests were listed but not run against the baseline; the main browser workflow depends on a live backend and real document indexing.
- Live Render frontend `https://documind-rag-assistant.onrender.com/` returned HTTP 200. The configured API `https://documind-rag-assistant-api.onrender.com/api/health` returned HTTP 502 with `x-render-routing: no-deploy`; live backend functionality is therefore not currently available to verify.
- No Render blueprint, Gemini API credential, or deployed backend was present in the repository/runtime audit context. Credentials must be added to Render's secret environment; no key should be committed.

## Findings and root causes

| Area | Finding | Root cause / effect |
| --- | --- | --- |
| Embeddings and deployment weight | The backend imports `sentence-transformers` and PyTorch to run `all-MiniLM-L6-v2`; the hosted requirements explicitly resolve PyTorch. | A CPU-only Render service still has a large native ML install and startup/memory pressure, undermining reliable boot and increasing cold-start risk. |
| Provider architecture | `llm.py`, settings, tests, README, and UI describe Ollama and an OpenAI-compatible provider; no Gemini client exists. | The current provider router is not configured for the requested Gemini-only cloud path and performs checks for a local Ollama service. |
| Gemini error resilience | No Gemini request implementation, bounded retry policy, or transient-failure fallback exists. | Upstream throttling, service errors, and timeouts cannot be handled safely or reported accurately. |
| RAG/index migration | Stored index metadata identifies the local embedding model and dimension only. Startup reindex failures are logged, but health does not expose an unusable stale index; several write/reindex failures can leave recovery ambiguous. | A provider/model change can make old FAISS vectors incompatible, and there is no explicit, verifiable migration state. |
| Error handling and timeouts | LLM timeout defaults to 240 seconds; upload catches store errors but not every embedding/provider error path. | A slow upstream request can outlive the hosted request window; some failures escape as generic server errors. |
| Health/readiness | Health status primarily reflects whether the local embedder loaded; it does not give a complete picture of embedding/index/provider readiness. | A running HTTP process may be reported as healthy while retrieval is not yet usable, or vice versa. |
| Render configuration | No `render.yaml`/deployment blueprint is tracked; the API's Render URL currently has no active deployment. | Build/start/health-check settings are implicit, and the live API endpoint returns 502. |
| CORS | Local development origins are configured, while the verified public frontend is `https://documind-rag-assistant.onrender.com`. | The deployed frontend origin is not included in the default configuration, so browser requests can fail preflight once the API is deployed. |
| Persistence | Uploaded files and FAISS data are stored on the service filesystem without a configured Render disk. | Render's ephemeral filesystem can lose document data on restart/redeploy; persistent storage requires an explicit disk choice and may incur cost. |
| Frontend/API contract | The API URL is hard-coded as the Render API fallback; visible settings/marketing copy assumes local MiniLM/Ollama. | Repointing the backend alone would leave stale status and product claims; deploy-specific configuration is difficult to verify. |
| Dependency security | The lockfile resolves vulnerable Vite/Vitest/esbuild/tinypool packages and vulnerable React Router 6 releases. | Existing semver ranges and lockfile permit versions now covered by npm advisories. |
| E2E test design | The document upload/query browser test calls a live backend, persists a test file, and allows up to 180 seconds for generation. | Automated tests depend on deployment state and external AI rather than isolated, predictable fixtures. |
| Documentation | README describes old local embeddings and providers, has no current Render setup, and labels prior test counts as historical. | Deployment and feature guidance no longer matches the actual repository. |
| Security boundary | The API has no authentication, authorization, or rate limiting. | This is an existing documented product limitation; CORS is not access control. Do not expose sensitive documents on a public deployment without a separate access-control decision. |

## Protected behavior during the repair

Preserve the existing React layout and interaction patterns, file size/page limits, PDF/TXT validation and extraction, chunking controls and overlap, source excerpts/page labels, retrieval scoping and thresholds, citation validation, document listing/deletion, fallback labeling, local development proxy, and the Render command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Do not deploy or change live service visibility, domains, or storage billing configuration as part of repository edits.
