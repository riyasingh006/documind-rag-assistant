"""Regression tests for hosted Render configuration and responsive health checks."""

from __future__ import annotations

import asyncio
import io
import threading
import time

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.conftest import FakeEmbedder


def make_settings(tmp_path=None, **overrides) -> Settings:
    values = {"_env_file": None}
    if tmp_path is not None:
        values["data_dir"] = tmp_path / "data"
    values.update(overrides)
    return Settings(**values)


def test_render_frontend_origin_is_in_default_cors_allowlist() -> None:
    settings = make_settings()
    assert settings.cors_origin_list == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "https://documind-rag-assistant.onrender.com",
    ]


def test_render_frontend_origin_passes_cors_preflight(tmp_path) -> None:
    settings = make_settings(tmp_path)
    with TestClient(create_app(settings=settings, embedder=FakeEmbedder())) as client:
        response = client.options(
            "/api/health",
            headers={
                "Origin": "https://documind-rag-assistant.onrender.com",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type",
            },
        )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://documind-rag-assistant.onrender.com"


@pytest.mark.parametrize(
    ("configured", "expected"),
    [
        ("https://example.com", "https://example.com"),
        ("https://example.com/", "https://example.com"),
        ('"https://EXAMPLE.com/path/"', "https://example.com"),
        ("  https://example.com  ", "https://example.com"),
    ],
)
def test_cors_origins_are_normalized(tmp_path, configured, expected) -> None:
    settings = make_settings(tmp_path, cors_origins=configured)
    assert settings.cors_origin_list == [expected]


def test_cors_denies_unlisted_origins(tmp_path) -> None:
    settings = make_settings(tmp_path, cors_origins="https://allowed.example.com")
    with TestClient(create_app(settings=settings, embedder=FakeEmbedder())) as client:
        response = client.options(
            "/api/health",
            headers={
                "Origin": "https://untrusted.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.status_code == 400


def test_health_reports_embedding_runtime_and_fallback(client) -> None:
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["runtime"]["embedding_state"] == "ready"
    assert body["embedding"]["ready"] is True
    assert body["embedding"]["error"] is None
    assert body["llm"]["status"] == "extractive"


def test_health_reports_loading_state_without_error(tmp_path) -> None:
    class LoadingEmbedder(FakeEmbedder):
        ready = False
        dimension = None
        state = "loading"

        def load(self) -> None:
            time.sleep(0.3)

    with TestClient(
        create_app(
            settings=make_settings(tmp_path),
            embedder=LoadingEmbedder(),
        )
    ) as client:
        body = client.get("/api/health").json()
    assert body["status"] == "degraded"
    assert body["embedding"]["ready"] is False
    assert body["embedding"]["error"] is None
    assert body["runtime"]["embedding_state"] == "loading"


def test_health_reports_unusable_persisted_index(tmp_path, settings, add_text) -> None:
    add_text("Persisted text that requires a Gemini embedding index.")

    class BrokenEmbedder(FakeEmbedder):
        ready = False
        error = "Gemini API key is missing."

        def load(self) -> None:
            raise RuntimeError(self.error)

    with TestClient(
        create_app(settings=settings, embedder=BrokenEmbedder())
    ) as client:
        body = client.get("/api/health").json()

    assert body["status"] == "degraded"
    assert body["embedding"]["ready"] is False
    assert body["index"]["state"] == "failed"
    assert body["index"]["ready"] is False
    assert body["index"]["error"]


def test_store_counts_does_not_wait_for_a_writer(tmp_path) -> None:
    store = create_app(
        settings=make_settings(tmp_path),
        embedder=FakeEmbedder(),
    )
    with TestClient(store) as client:
        document_store = client.app.state.store
        document_store.counts()
        release = threading.Event()
        held = threading.Event()

        def hold_lock() -> None:
            with document_store._lock:
                held.set()
                release.wait(5)

        thread = threading.Thread(target=hold_lock)
        thread.start()
        try:
            assert held.wait(2)
            started = time.perf_counter()
            counts = document_store.counts()
            elapsed = time.perf_counter() - started
            assert elapsed < 0.5
            assert counts == {"documents": 0, "chunks": 0, "index_vectors": 0}
        finally:
            release.set()
            thread.join()


def test_health_stays_responsive_while_upload_embedding_runs(tmp_path) -> None:
    class SlowEmbedder(FakeEmbedder):
        def embed_chunks(self, texts):
            time.sleep(1.5)
            return super().embed_chunks(texts)

    async def scenario() -> float:
        app = create_app(
            settings=make_settings(tmp_path),
            embedder=SlowEmbedder(),
        )
        async with app.router.lifespan_context(app):
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://test",
                timeout=30,
            ) as client:
                files = {"file": ("a.txt", io.BytesIO(b"hello world. " * 50), "text/plain")}
                upload = asyncio.create_task(client.post("/api/documents", files=files))
                await asyncio.sleep(0.4)
                started = time.perf_counter()
                response = await client.get("/api/health")
                latency = time.perf_counter() - started
                assert response.status_code == 200
                assert (await upload).status_code == 201
                return latency

    assert asyncio.run(scenario()) < 0.5
