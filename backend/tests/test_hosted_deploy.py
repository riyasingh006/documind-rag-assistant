"""Regression tests for hosted (Render) deployment behaviour."""

from __future__ import annotations

import asyncio
import io
import sys
import threading
import time
import types

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.embeddings import EmbeddingError, EmbeddingService
from app.llm import LLMRouter
from app.main import create_app
from tests.conftest import FakeEmbedder


def make_settings(tmp_path=None, **overrides) -> Settings:
    values = {"_env_file": None}
    if tmp_path is not None:
        values["data_dir"] = tmp_path / "data"
    values.update(overrides)
    return Settings(**values)


# ----------------------------------------------------------------- LLM / Render
def test_render_skips_loopback_ollama_and_uses_extractive(monkeypatch) -> None:
    monkeypatch.setenv("RENDER", "true")
    settings = make_settings(llm_provider="auto")
    assert settings.ollama_active is False

    resolved = asyncio.run(LLMRouter(settings).resolve())
    assert resolved.provider == "extractive"
    assert resolved.client is None
    assert "not used on this deployment" in (resolved.fallback_reason or "")


def test_render_never_probes_ollama(monkeypatch) -> None:
    monkeypatch.setenv("RENDER", "true")
    router = LLMRouter(make_settings(llm_provider="auto"))

    async def boom(*args, **kwargs):  # pragma: no cover - must not be called
        raise AssertionError("Ollama must not be probed on Render")

    monkeypatch.setattr(router.ollama, "check_availability", boom)
    info = asyncio.run(router.describe())
    assert info["active_provider"] == "extractive"
    assert info["status"] == "fallback"
    assert info["ollama_connected"] is None


def test_render_prefers_openai_when_key_present(monkeypatch) -> None:
    monkeypatch.setenv("RENDER", "true")
    settings = make_settings(llm_provider="auto", openai_api_key="test-key")
    resolved = asyncio.run(LLMRouter(settings).resolve())
    assert resolved.provider == "openai"
    assert resolved.automatic is True


def test_render_with_non_loopback_ollama_url_still_uses_ollama(monkeypatch) -> None:
    monkeypatch.setenv("RENDER", "true")
    settings = make_settings(ollama_base_url="https://ollama.example.com")
    assert settings.ollama_active is True


def test_ollama_enabled_override(monkeypatch) -> None:
    monkeypatch.setenv("RENDER", "true")
    assert make_settings(ollama_enabled=True).ollama_active is True
    monkeypatch.delenv("RENDER")
    assert make_settings(ollama_enabled=False).ollama_active is False


def test_local_development_keeps_ollama(monkeypatch) -> None:
    monkeypatch.delenv("RENDER", raising=False)
    settings = make_settings(llm_provider="auto")
    assert settings.ollama_active is True
    # Unreachable local Ollama is still probed and reported, as before.
    info = asyncio.run(LLMRouter(settings).describe())
    assert info["ollama_connected"] in (True, False)


def test_render_explicit_ollama_provider_reports_unavailable(monkeypatch) -> None:
    monkeypatch.setenv("RENDER", "true")
    info = asyncio.run(LLMRouter(make_settings(llm_provider="ollama")).describe())
    assert info["available"] is False
    assert info["status"] == "unavailable"


# ------------------------------------------------------------------------ CORS
@pytest.mark.parametrize(
    "configured",
    [
        "https://riyasingh006.github.io",
        "https://riyasingh006.github.io/",
        "https://riyasingh006.github.io/documind-rag-assistant/",
        '"https://RiyaSingh006.github.io"',
        "  https://riyasingh006.github.io  ",
    ],
)
def test_cors_origin_misconfigurations_are_normalised(tmp_path, configured) -> None:
    settings = make_settings(tmp_path, llm_provider="extractive", cors_origins=configured)
    assert settings.cors_origin_list == ["https://riyasingh006.github.io"]

    with TestClient(create_app(settings=settings, embedder=FakeEmbedder())) as client:
        response = client.options(
            "/api/health",
            headers={
                "Origin": "https://riyasingh006.github.io",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type",
            },
        )
    assert response.status_code == 200
    assert (
        response.headers["access-control-allow-origin"]
        == "https://riyasingh006.github.io"
    )


def test_cors_origins_are_deduplicated_and_still_exclude_others(tmp_path) -> None:
    settings = make_settings(
        tmp_path,
        llm_provider="extractive",
        cors_origins="https://a.example.com,https://a.example.com/,https://b.example.com",
    )
    assert settings.cors_origin_list == ["https://a.example.com", "https://b.example.com"]
    with TestClient(create_app(settings=settings, embedder=FakeEmbedder())) as client:
        response = client.options(
            "/api/health",
            headers={
                "Origin": "https://evil.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.status_code == 400


# ------------------------------------------------------------ embedding lifecycle
def _install_fake_sentence_transformers(monkeypatch, factory) -> None:
    module = types.ModuleType("sentence_transformers")
    module.SentenceTransformer = factory
    monkeypatch.setitem(sys.modules, "sentence_transformers", module)


def test_embedding_load_failure_sets_error_and_state(monkeypatch) -> None:
    def failing(*args, **kwargs):
        raise OSError("model download failed")

    _install_fake_sentence_transformers(monkeypatch, failing)
    service = EmbeddingService(make_settings())
    assert service.state == "not_started"

    with pytest.raises(EmbeddingError):
        service.load()

    assert service.state == "failed"
    assert service.ready is False
    assert service.error is not None and "model download failed" in service.error


def test_embedding_load_success_publishes_state(monkeypatch) -> None:
    class Tokenizer:
        pass

    class Model:
        max_seq_length = 256
        tokenizer = Tokenizer()

        def get_sentence_embedding_dimension(self) -> int:
            return 384

    observed: list[str] = []
    holder: dict[str, EmbeddingService] = {}

    def factory(*args, **kwargs):
        observed.append(holder["service"].state)  # state while loading
        return Model()

    _install_fake_sentence_transformers(monkeypatch, factory)
    service = EmbeddingService(make_settings())
    holder["service"] = service
    service.load()

    assert observed == ["loading"]
    assert service.state == "ready"
    assert service.ready is True
    assert service.dimension == 384
    assert service.error is None
    assert service.load_seconds is not None


def test_health_reports_runtime_block(client) -> None:
    body = client.get("/api/health").json()
    runtime = body["runtime"]
    assert runtime["embedding_state"] == "unknown" or runtime["embedding_state"] == "ready"
    assert "memory_rss_mb" in runtime and "memory_limit_mb" in runtime
    # Existing contract is unchanged.
    assert body["embedding"]["ready"] is True
    assert body["embedding"]["error"] is None


def test_health_reports_loading_state_without_error(settings) -> None:
    class LoadingEmbedder(FakeEmbedder):
        ready = False
        dimension = None  # type: ignore[assignment]
        state = "loading"

        def load(self) -> None:
            time.sleep(0.3)

    with TestClient(create_app(settings=settings, embedder=LoadingEmbedder())) as client:
        body = client.get("/api/health").json()
    assert body["status"] == "degraded"
    assert body["embedding"]["ready"] is False
    assert body["embedding"]["error"] is None
    assert body["runtime"]["embedding_state"] == "loading"


# --------------------------------------------------- health must not block on I/O
def test_store_counts_does_not_wait_for_a_writer(store) -> None:
    store.counts()  # prime snapshot
    release = threading.Event()
    held = threading.Event()

    def hold_lock() -> None:
        with store._lock:
            held.set()
            release.wait(5)

    thread = threading.Thread(target=hold_lock)
    thread.start()
    try:
        assert held.wait(2)
        started = time.perf_counter()
        counts = store.counts()
        elapsed = time.perf_counter() - started
        assert elapsed < 0.5
        assert counts == {"documents": 0, "chunks": 0, "index_vectors": 0}
    finally:
        release.set()
        thread.join()


def test_health_stays_responsive_while_an_upload_is_embedding(settings) -> None:
    class SlowEmbedder(FakeEmbedder):
        def embed_chunks(self, texts):
            time.sleep(1.5)
            return super().embed_chunks(texts)

    async def scenario() -> float:
        app = create_app(settings=settings, embedder=SlowEmbedder())
        async with app.router.lifespan_context(app):
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(
                transport=transport, base_url="http://test", timeout=30
            ) as client:
                files = {"file": ("a.txt", io.BytesIO(b"hello world. " * 50), "text/plain")}
                upload = asyncio.create_task(client.post("/api/documents", files=files))
                await asyncio.sleep(0.4)  # upload now holds the store lock
                started = time.perf_counter()
                response = await client.get("/api/health")
                latency = time.perf_counter() - started
                assert response.status_code == 200
                assert (await upload).status_code == 201
                return latency

    assert asyncio.run(scenario()) < 0.5
