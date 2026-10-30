from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ALLOWED_EXTENSIONS = (".pdf", ".txt")

_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}


def running_on_render() -> bool:
    """Render sets RENDER=true in every service it runs."""
    return os.environ.get("RENDER", "").strip().lower() == "true"


def _is_loopback_url(url: str) -> bool:
    try:
        host = urlparse(url if "://" in url else f"//{url}").hostname
    except ValueError:
        return False
    return (host or "").lower() in _LOOPBACK_HOSTS


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

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_device: str = "cpu"
    embedding_batch_size: int = 32

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

    llm_provider: str = "auto"  # auto | ollama | openai | extractive
    llm_timeout_seconds: float = 240.0
    llm_temperature: float = 0.1
    llm_max_tokens: int = 350
    extractive_fallback: bool = True

    ollama_base_url: str = Field(
        default="http://localhost:11434",
        validation_alias=AliasChoices(
            "DOCUMIND_OLLAMA_BASE_URL",
            "OLLAMA_BASE_URL",
        ),
    )
    ollama_model: str = Field(
        default="qwen2.5:3b",
        validation_alias=AliasChoices(
            "DOCUMIND_OLLAMA_MODEL",
            "OLLAMA_MODEL",
        ),
    )

    # None = automatic: Ollama is skipped on hosted platforms (Render) when it
    # points at a loopback address, because no Ollama server can exist there.
    # Set DOCUMIND_OLLAMA_ENABLED=true/false to force the behaviour.
    ollama_enabled: bool | None = None

    openai_base_url: str = "https://api.openai.com/v1"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )

    # Optional regex for origins that change per deploy (e.g. preview URLs),
    # such as: https://.*\.vercel\.app
    cors_origin_regex: str | None = None

    @property
    def ollama_active(self) -> bool:
        """Whether the router may try Ollama at all."""
        if self.ollama_enabled is not None:
            return self.ollama_enabled
        if running_on_render() and _is_loopback_url(self.ollama_base_url):
            return False
        return True

    @property
    def cors_origin_list(self) -> list[str]:
        # A browser Origin header is only scheme://host[:port]. Accept the
        # common misconfigurations (trailing slash, a path such as
        # https://user.github.io/repo/, surrounding quotes) by reducing every
        # entry to that form; otherwise the preflight is rejected with 400.
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
