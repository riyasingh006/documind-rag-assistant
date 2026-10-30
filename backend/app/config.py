from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ALLOWED_EXTENSIONS = (".pdf", ".txt")


class Settings(BaseSettings):
    """Server configuration, overridable with DOCUMIND_* environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_prefix="DOCUMIND_",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = "DocuMind AI"
    version: str = "1.0.0"
    data_dir: Path = BACKEND_DIR / "data"

    gemini_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "DOCUMIND_GEMINI_API_KEY",
            "GEMINI_API_KEY",
            "GOOGLE_API_KEY",
        ),
    )

    embedding_model: str = "gemini-embedding-001"
    embedding_dimension: int = Field(default=768, ge=128, le=3072)
    embedding_device: str = "gemini-api"
    embedding_batch_size: int = Field(default=32, ge=1, le=100)
    embedding_timeout_seconds: float = Field(default=20.0, gt=0, le=60)
    embedding_retry_budget_seconds: float = Field(default=35.0, gt=0, le=60)

    chunk_size: int = 800
    chunk_overlap: int = 120
    top_k: int = 5
    score_threshold: float = 0.2
    min_relevance_floor: float = 0.15
    max_retrieval_candidates: int = 50
    max_context_chars: int = 12_000
    max_excerpt_chars: int = 1_600

    max_upload_mb: int = 20
    max_pdf_pages: int = 500

    llm_provider: str = "gemini"
    llm_model: str = "gemini-3.8-flash"
    llm_timeout_seconds: float = Field(default=20.0, gt=0, le=60)
    llm_retry_budget_seconds: float = Field(default=35.0, gt=0, le=60)
    llm_temperature: float = Field(default=0.1, ge=0, le=2)
    llm_max_tokens: int = Field(default=350, ge=1, le=8192)
    extractive_fallback: bool = True

    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173,"
        "https://documind-rag-assistant.onrender.com"
    )
    cors_origin_regex: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        origins: list[str] = []
        for raw in self.cors_origins.split(","):
            value = raw.strip().strip("\"'").strip()
            if not value:
                continue
            if value != "*":
                parsed = urlparse(value)
                if parsed.scheme and parsed.netloc:
                    value = f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"
                else:
                    value = value.rstrip("/")
            if value not in origins:
                origins.append(value)
        return origins

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def index_dir(self) -> Path:
        return self.data_dir / "index"
