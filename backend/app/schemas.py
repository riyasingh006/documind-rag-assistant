"""Request and response models for the DocuMind API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: Literal["pdf", "txt"]
    size_bytes: int
    pages: int | None
    chunk_count: int
    character_count: int
    created_at: str


class EmbeddingHealth(BaseModel):
    model: str
    dimension: int | None
    ready: bool
    error: str | None
    device: str


class IndexHealth(BaseModel):
    state: Literal["not_started", "migrating", "ready", "failed"]
    ready: bool
    model: str | None
    dimension: int | None
    error: str | None


class RuntimeHealth(BaseModel):
    embedding_state: Literal["not_started", "loading", "ready", "failed", "unknown"]
    embedding_load_seconds: float | None = None
    memory_rss_mb: int | None = None
    memory_limit_mb: int | None = None
    hosted_platform: str | None = None


class LLMHealth(BaseModel):
    configured_provider: str
    active_provider: str
    model: str
    available: bool
    fallback_enabled: bool
    detail: str | None
    generation_active: bool = False
    status: Literal[
        "configured",
        "temporarily_unavailable",
        "fallback",
        "extractive",
        "not_configured",
    ] = "not_configured"


class Counts(BaseModel):
    documents: int
    chunks: int
    index_vectors: int


class Limits(BaseModel):
    max_upload_mb: int
    allowed_extensions: list[str]


class Defaults(BaseModel):
    chunk_size: int
    chunk_overlap: int
    top_k: int
    score_threshold: float
    min_similarity_floor: float


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    embedding: EmbeddingHealth
    index: IndexHealth
    runtime: RuntimeHealth | None = None
    llm: LLMHealth
    counts: Counts
    limits: Limits
    defaults: Defaults


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2_000)
    document_ids: list[str] | None = Field(default=None, max_length=100)
    top_k: int = Field(default=5, ge=1, le=10)
    threshold: float = Field(default=0.2, ge=0.0, le=1.0)

    @field_validator("question")
    @classmethod
    def question_must_have_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Question cannot be empty.")
        return cleaned


class SourceResponse(BaseModel):
    id: int
    document_id: str
    filename: str
    file_type: Literal["pdf", "txt"]
    page: int | None
    chunk_id: str
    chunk_index: int
    score: float
    excerpt: str
    cited: bool


class RetrievalInfo(BaseModel):
    top_k: int
    threshold: float
    chunks_retrieved: int
    documents_searched: int
    latency_ms: int
    candidates_considered: int = 0
    candidates_passed: int = 0
    top_score: float | None = None
    effective_threshold: float = 0.0
    min_similarity_floor: float = 0.0


class GenerationInfo(BaseModel):
    provider: str
    model: str
    mode: Literal["llm", "extractive", "none"]
    latency_ms: int
    fallback_reason: str | None = None


class QueryResponse(BaseModel):
    answer: str
    answerable: bool
    reason: Literal["answered", "insufficient_evidence", "no_documents", "greeting"]
    sources: list[SourceResponse]
    retrieval: RetrievalInfo
    generation: GenerationInfo


class ErrorResponse(BaseModel):
    detail: str
