from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .chunking import chunk_pages
from .config import ALLOWED_EXTENSIONS, Settings
from .embeddings import EmbeddingError, EmbeddingService
from .extraction import (
    ExtractionError,
    extract_document,
    file_extension,
    sanitize_filename,
)
from .llm import LLMError, LLMGenerationError, LLMUnavailableError, LLMRouter
from .rag import (
    DocumentSelectionError,
    EmbeddingNotReadyError,
    RAGService,
)
from .schemas import (
    Counts,
    Defaults,
    DocumentResponse,
    EmbeddingHealth,
    HealthResponse,
    Limits,
    LLMHealth,
    QueryRequest,
    QueryResponse,
    RuntimeHealth,
)
from .runtime import hosted_platform, memory_limit_mb, rss_mb
from .store import DocumentStore, StoreError

logger = logging.getLogger("documind")
logger.setLevel(logging.INFO)
logger.propagate = False
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(
        logging.Formatter("%(levelname)s:     %(name)s - %(message)s")
    )
    logger.addHandler(_handler)


def _embedding_state(service: Any) -> str:
    state = getattr(service, "state", None)
    if isinstance(state, str) and state:
        return state
    if getattr(service, "ready", False):
        return "ready"
    return "failed" if getattr(service, "error", None) else "unknown"


def create_app(
    settings: Settings | None = None,
    embedder: EmbeddingService | Any | None = None,
    llm_router: LLMRouter | Any | None = None,
) -> FastAPI:
    configuration = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        embedding_service = embedder or EmbeddingService(configuration)

        store = DocumentStore(configuration, embedding_service)

        async def initialise_embeddings() -> None:
            # Load the model off the event loop so the API port opens
            # immediately; /api/health reports readiness and any error.
            try:
                await asyncio.to_thread(embedding_service.load)
            except Exception as exc:  # startup failure must not crash the API
                logger.warning("Embedding model failed to load: %s", exc)
                return
            try:
                await asyncio.to_thread(
                    store.ensure_embedding_compatibility, embedding_service
                )
            except Exception as exc:
                logger.warning("Could not reconcile stored embeddings: %s", exc)
            logger.info(
                "Embedding model ready (%s, dimension=%s)",
                embedding_service.model_name,
                embedding_service.dimension,
            )

        embedding_task = asyncio.create_task(initialise_embeddings())

        router = llm_router or LLMRouter(configuration)
        rag = RAGService(
            store=store,
            embedder=embedding_service,
            settings=configuration,
            llm_router=router,
        )

        app.state.settings = configuration
        app.state.embedder = embedding_service
        app.state.store = store
        app.state.llm_router = router
        app.state.rag = rag
        app.state.embedding_task = embedding_task

        logger.info(
            "DocuMind API started (embedding_ready=%s, documents=%s)",
            embedding_service.ready,
            store.document_count(),
        )
        yield
        if not embedding_task.done():
            embedding_task.cancel()

    app = FastAPI(
        title="DocuMind AI API",
        version=configuration.version,
        description=(
            "Document-grounded question answering with local embeddings, "
            "FAISS retrieval, and configurable LLM generation."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=configuration.cors_origin_list,
        allow_origin_regex=configuration.cors_origin_regex or None,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    def state(request: Request) -> tuple[Settings, Any, DocumentStore, RAGService]:
        return (
            request.app.state.settings,
            request.app.state.embedder,
            request.app.state.store,
            request.app.state.rag,
        )

    @app.get("/")
    def root() -> dict:
        return {
            "name": "DocuMind AI API",
            "version": configuration.version,
            "health": "/api/health",
            "docs": "/docs",
        }

    @app.get("/api/health", response_model=HealthResponse)
    async def health(request: Request) -> HealthResponse:
        _settings, embedding_service, store, rag = state(request)
        llm_info = await rag.health()
        counts = store.counts()

        return HealthResponse(
            status="ok" if embedding_service.ready else "degraded",
            version=configuration.version,
            embedding=EmbeddingHealth(
                model=embedding_service.model_name,
                dimension=embedding_service.dimension,
                ready=bool(embedding_service.ready),
                error=embedding_service.error,
                device=embedding_service.device,
            ),
            runtime=RuntimeHealth(
                embedding_state=_embedding_state(embedding_service),  # type: ignore[arg-type]
                embedding_load_seconds=getattr(
                    embedding_service, "load_seconds", None
                ),
                memory_rss_mb=rss_mb(),
                memory_limit_mb=memory_limit_mb(),
                hosted_platform=hosted_platform(),
            ),
            llm=LLMHealth(**llm_info),
            counts=Counts(**counts),
            limits=Limits(
                max_upload_mb=configuration.max_upload_mb,
                allowed_extensions=[extension.lstrip(".") for extension in ALLOWED_EXTENSIONS],
            ),
            defaults=Defaults(
                chunk_size=configuration.chunk_size,
                chunk_overlap=configuration.chunk_overlap,
                top_k=configuration.top_k,
                score_threshold=configuration.score_threshold,
                min_similarity_floor=configuration.min_relevance_floor,
            ),
        )

    @app.get("/api/documents", response_model=list[DocumentResponse])
    def list_documents(request: Request) -> list[DocumentResponse]:
        _settings, _embedding, store, _rag = state(request)
        return [DocumentResponse(**item) for item in store.list_documents()]

    @app.post(
        "/api/documents",
        response_model=DocumentResponse,
        status_code=201,
    )
    async def upload_document(
        request: Request,
        file: UploadFile = File(...),
        chunk_size: int | None = Form(default=None),
        chunk_overlap: int | None = Form(default=None),
    ) -> DocumentResponse:
        configuration, embedding_service, store, _rag = state(request)

        if not embedding_service.ready:
            # The startup load may have failed (e.g. a transient model
            # download error). Retry here; load() is lock-protected, so this
            # waits for an in-flight startup load instead of racing it.
            try:
                await asyncio.to_thread(embedding_service.load)
            except Exception as exc:
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "The embedding model is not ready. Check /api/health "
                        f"for the underlying error. ({exc})"
                    ),
                ) from exc

        try:
            clean_name = sanitize_filename(file.filename)
        except ExtractionError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        extension = file_extension(clean_name)
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=415,
                detail="Unsupported file type. Upload a PDF or TXT file.",
            )

        try:
            data = await file.read(configuration.max_upload_bytes + 1)
        finally:
            await file.close()

        if not data:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")
        if len(data) > configuration.max_upload_bytes:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"The file exceeds the {configuration.max_upload_mb} MB upload limit."
                ),
            )

        resolved_chunk_size = chunk_size if chunk_size is not None else configuration.chunk_size
        resolved_overlap = (
            chunk_overlap if chunk_overlap is not None else configuration.chunk_overlap
        )

        if not 100 <= resolved_chunk_size <= 2_000:
            raise HTTPException(
                status_code=422,
                detail="chunk_size must be between 100 and 2000 tokens.",
            )
        if resolved_overlap < 0 or resolved_overlap >= resolved_chunk_size:
            raise HTTPException(
                status_code=422,
                detail="chunk_overlap must be non-negative and smaller than chunk_size.",
            )
        if resolved_overlap > resolved_chunk_size // 2:
            raise HTTPException(
                status_code=422,
                detail="chunk_overlap cannot exceed half of chunk_size.",
            )

        try:
            extraction = await asyncio.to_thread(
                extract_document,
                data,
                clean_name,
                max_pages=configuration.max_pdf_pages,
            )
        except ExtractionError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        text_chunks = await asyncio.to_thread(
            chunk_pages,
            extraction.pages,
            resolved_chunk_size,
            resolved_overlap,
        )
        if not text_chunks:
            raise HTTPException(
                status_code=400,
                detail="No text chunks could be produced from this document.",
            )

        try:
            summary = await asyncio.to_thread(
                store.add_document, extraction, text_chunks, data
            )
        except EmbeddingError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except StoreError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

        return DocumentResponse(**summary)

    @app.delete("/api/documents/{document_id}", status_code=204)
    def delete_document(request: Request, document_id: str) -> Response:
        _settings, _embedding, store, _rag = state(request)
        removed = store.delete_document(document_id)
        if not removed:
            raise HTTPException(status_code=404, detail="Document not found.")
        return Response(status_code=204)

    @app.post("/api/query", response_model=QueryResponse)
    async def query(request: Request, payload: QueryRequest) -> QueryResponse:
        _settings, _embedding, _store, rag = state(request)
        try:
            return await rag.answer_question(
                question=payload.question,
                document_ids=payload.document_ids,
                top_k=payload.top_k,
                threshold=payload.threshold,
            )
        except DocumentSelectionError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except EmbeddingNotReadyError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except LLMUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except LLMGenerationError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        except LLMError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        except StoreError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    return app


app = create_app()
