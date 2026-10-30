from __future__ import annotations

import pymupdf

from app.rag import INSUFFICIENT_MESSAGE


def upload(
    client,
    filename: str,
    data: bytes,
    *,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
):
    form = {}
    if chunk_size is not None:
        form["chunk_size"] = str(chunk_size)
    if chunk_overlap is not None:
        form["chunk_overlap"] = str(chunk_overlap)
    return client.post(
        "/api/documents",
        files={"file": (filename, data, "application/octet-stream")},
        data=form,
    )


def make_pdf(text: str) -> bytes:
    document = pymupdf.open()
    page = document.new_page()
    page.insert_text((72, 72), text, fontsize=11)
    data = document.tobytes()
    document.close()
    return data


def test_root_and_health(client) -> None:
    root = client.get("/")
    assert root.status_code == 200
    assert root.json()["health"] == "/api/health"

    health = client.get("/api/health")
    assert health.status_code == 200
    body = health.json()
    assert body["status"] == "ok"
    assert body["embedding"] == {
        "model": "fake-embedding-model",
        "dimension": 64,
        "ready": True,
        "error": None,
        "device": "cpu",
    }
    assert body["index"] == {
        "state": "ready",
        "ready": True,
        "model": "fake-embedding-model",
        "dimension": 64,
        "error": None,
    }
    assert body["llm"]["configured_provider"] == "extractive"
    assert body["llm"]["active_provider"] == "extractive"
    assert body["llm"]["available"] is False
    assert body["llm"]["status"] == "extractive"
    assert body["llm"]["generation_active"] is False
    assert body["counts"] == {"documents": 0, "chunks": 0, "index_vectors": 0}
    assert body["limits"]["allowed_extensions"] == ["pdf", "txt"]
    assert body["limits"]["max_upload_mb"] == 1
    assert body["defaults"]["top_k"] == 5
    assert body["defaults"]["score_threshold"] == 0.2
    assert body["defaults"]["min_similarity_floor"] == 0.15


def test_upload_query_list_delete_flow(client) -> None:
    content = (
        "Project Zephyr identifier is ZX-4417. "
        "The review starts in April and the owner is Morgan."
    )
    response = upload(
        client,
        "zephyr.txt",
        content.encode("utf-8"),
        chunk_size=100,
        chunk_overlap=0,
    )
    assert response.status_code == 201, response.text
    document = response.json()
    assert document["filename"] == "zephyr.txt"
    assert document["file_type"] == "txt"
    assert document["pages"] is None
    assert document["chunk_count"] == 1
    assert document["character_count"] == len(content)

    listing = client.get("/api/documents")
    assert listing.status_code == 200
    assert [item["id"] for item in listing.json()] == [document["id"]]

    query = client.post(
        "/api/query",
        json={
            "question": "What is the Zephyr identifier?",
            "document_ids": [document["id"]],
            "top_k": 5,
            "threshold": 0.05,
        },
    )
    assert query.status_code == 200, query.text
    answer = query.json()
    assert answer["answerable"] is True
    assert "ZX-4417" in answer["answer"]
    assert answer["reason"] == "answered"
    assert answer["generation"]["mode"] == "extractive"
    assert answer["retrieval"]["documents_searched"] == 1
    assert answer["retrieval"]["candidates_considered"] >= 1
    assert answer["retrieval"]["candidates_passed"] >= 1
    assert answer["retrieval"]["top_score"] is not None
    assert answer["retrieval"]["effective_threshold"] > 0
    assert answer["retrieval"]["min_similarity_floor"] == 0.15
    assert answer["sources"][0]["document_id"] == document["id"]
    assert answer["sources"][0]["chunk_id"].startswith(document["id"])
    assert answer["sources"][0]["cited"] is True
    assert answer["sources"][0]["filename"] == "zephyr.txt"

    deleted = client.delete(f"/api/documents/{document['id']}")
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert client.get("/api/documents").json() == []

    empty_query = client.post(
        "/api/query",
        json={"question": "What is the identifier?"},
    )
    assert empty_query.status_code == 200
    assert empty_query.json()["answerable"] is False
    assert empty_query.json()["reason"] == "no_documents"
    assert empty_query.json()["answer"] == INSUFFICIENT_MESSAGE


def test_greeting_query_skips_retrieval(client) -> None:
    response = client.post("/api/query", json={"question": "hii"})
    assert response.status_code == 200
    body = response.json()
    assert body["answerable"] is True
    assert body["reason"] == "greeting"
    assert body["sources"] == []
    assert body["retrieval"]["chunks_retrieved"] == 0
    assert body["generation"]["mode"] == "none"
    assert "retrieval was skipped" in body["generation"]["fallback_reason"]


def test_pdf_upload_and_query(client) -> None:
    content = "Quarterly revenue was 42 million dollars in the north region."
    response = upload(
        client,
        "report.pdf",
        make_pdf(content),
        chunk_size=100,
        chunk_overlap=0,
    )
    assert response.status_code == 201, response.text
    document = response.json()
    assert document["file_type"] == "pdf"
    assert document["pages"] == 1
    assert document["filename"] == "report.pdf"

    query = client.post(
        "/api/query",
        json={
            "question": "What was the quarterly revenue?",
            "top_k": 5,
            "threshold": 0.05,
        },
    )
    assert query.status_code == 200
    body = query.json()
    assert body["answerable"] is True
    assert "42 million" in body["answer"] or "revenue" in body["answer"]
    assert body["sources"][0]["file_type"] == "pdf"
    assert body["sources"][0]["page"] == 1


def test_upload_validation_errors(client) -> None:
    assert upload(client, "notes.md", b"# title").status_code == 415

    empty = upload(client, "empty.txt", b"")
    assert empty.status_code == 400
    assert "empty" in empty.json()["detail"]

    blank = upload(client, "blank.txt", b"   \n\t ")
    assert blank.status_code == 400

    binary = upload(client, "binary.txt", b"abc\x00def")
    assert binary.status_code == 400
    assert "binary" in binary.json()["detail"]

    bad_pdf = upload(client, "bad.pdf", b"not really a pdf")
    assert bad_pdf.status_code == 400
    assert "valid PDF" in bad_pdf.json()["detail"]

    oversized = upload(client, "large.txt", b"a" * (1_048_576 + 1))
    assert oversized.status_code == 413
    assert "1 MB" in oversized.json()["detail"]

    assert upload(client, "a.txt", b"text", chunk_size=99).status_code == 422
    assert upload(client, "a.txt", b"text", chunk_size=2001).status_code == 422
    assert (
        upload(client, "a.txt", b"text", chunk_size=100, chunk_overlap=100).status_code
        == 422
    )
    assert (
        upload(client, "a.txt", b"text", chunk_size=100, chunk_overlap=51).status_code
        == 422
    )
    assert client.get("/api/documents").json() == []


def test_query_validation_and_missing_scope(client) -> None:
    blank = client.post("/api/query", json={"question": "   "})
    assert blank.status_code == 422

    too_short = client.post("/api/query", json={"question": ""})
    assert too_short.status_code == 422

    invalid_top_k = client.post(
        "/api/query",
        json={"question": "text", "top_k": 11},
    )
    assert invalid_top_k.status_code == 422

    invalid_threshold = client.post(
        "/api/query",
        json={"question": "text", "threshold": 1.1},
    )
    assert invalid_threshold.status_code == 422

    document = upload(client, "scope.txt", b"Scoped content.").json()
    missing = client.post(
        "/api/query",
        json={"question": "content", "document_ids": ["does-not-exist"]},
    )
    assert missing.status_code == 400
    assert "no longer exist" in missing.json()["detail"]
    assert document["chunk_count"] == 1


def test_delete_missing_document_returns_404(client) -> None:
    response = client.delete("/api/documents/does-not-exist")
    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_absolute_floor_controls_insufficient_evidence(client) -> None:
    upload(client, "low.txt", b"Unrelated material about gardening.")
    response = client.post(
        "/api/query",
        json={"question": "Zephyr identifier", "threshold": 0.2},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["answerable"] is False
    assert body["reason"] == "insufficient_evidence"
    assert body["answer"] == INSUFFICIENT_MESSAGE
    assert body["retrieval"]["chunks_retrieved"] == 0
    assert body["retrieval"]["candidates_considered"] == 0
    assert body["retrieval"]["top_score"] < body["retrieval"]["min_similarity_floor"]


def test_cors_allows_configured_preview_origin(client) -> None:
    response = client.options(
        "/api/query",
        headers={
            "Origin": "http://127.0.0.1:4173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:4173"


def test_startup_loads_embedding_model(settings) -> None:
    """Regression: the lifespan must load the embedding model at startup."""
    import time

    from fastapi.testclient import TestClient

    from app.main import create_app
    from tests.conftest import FakeEmbedder

    class LazyEmbedder(FakeEmbedder):
        loaded = False

        @property
        def ready(self) -> bool:  # type: ignore[override]
            return self.loaded

        def load(self) -> None:
            self.loaded = True

    lazy = LazyEmbedder()
    with TestClient(create_app(settings=settings, embedder=lazy)) as test_client:
        for _ in range(50):
            if test_client.get("/api/health").json()["embedding"]["ready"]:
                break
            time.sleep(0.05)
        health = test_client.get("/api/health").json()
        assert health["embedding"]["ready"] is True
        assert health["status"] == "ok"
        response = upload(test_client, "a.txt", b"Startup load regression text. " * 10)
        assert response.status_code == 201


def _preflight(client, origin: str):
    return client.options(
        "/api/documents",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )


def test_cors_rejects_unlisted_origin(client) -> None:
    response = _preflight(client, "https://evil.example.com")
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_ignore_trailing_slash(tmp_path) -> None:
    from fastapi.testclient import TestClient

    from app.config import Settings
    from app.main import create_app
    from tests.conftest import FakeEmbedder

    configured = Settings(
        data_dir=tmp_path / "data",
        llm_provider="extractive",
        cors_origins="https://app.example.com/, https://other.example.com",
    )
    assert configured.cors_origin_list == [
        "https://app.example.com",
        "https://other.example.com",
    ]
    with TestClient(create_app(settings=configured, embedder=FakeEmbedder())) as c:
        response = _preflight(c, "https://app.example.com")
        assert response.status_code == 200
        assert (
            response.headers["access-control-allow-origin"]
            == "https://app.example.com"
        )


def test_cors_origin_regex_allows_preview_urls(tmp_path) -> None:
    from fastapi.testclient import TestClient

    from app.config import Settings
    from app.main import create_app
    from tests.conftest import FakeEmbedder

    configured = Settings(
        data_dir=tmp_path / "data",
        llm_provider="extractive",
        cors_origin_regex=r"https://.*\.onrender\.com",
    )
    with TestClient(create_app(settings=configured, embedder=FakeEmbedder())) as c:
        allowed = _preflight(c, "https://documind-rag-assistant-pr-abc123.onrender.com")
        assert allowed.status_code == 200
        assert (
            allowed.headers["access-control-allow-origin"]
            == "https://documind-rag-assistant-pr-abc123.onrender.com"
        )
        assert _preflight(c, "https://evil.example.com").status_code == 400


class _FlakyEmbedder:
    """Fails the first load (startup), succeeds on retry."""

    def __new__(cls):
        from tests.conftest import FakeEmbedder

        class Flaky(FakeEmbedder):
            attempts = 0
            loaded = False
            error: str | None = None

            @property
            def ready(self) -> bool:  # type: ignore[override]
                return self.loaded

            def load(self) -> None:
                from app.embeddings import EmbeddingError

                self.attempts += 1
                if self.attempts == 1:
                    self.error = "ConnectError: model host unreachable"
                    raise EmbeddingError("The embedding model could not be loaded.")
                self.loaded = True
                self.error = None

        return Flaky()


def test_upload_and_query_recover_after_failed_startup_load(settings) -> None:
    """Regression: one failed startup load must not leave the API permanently 503."""
    import time

    from fastapi.testclient import TestClient

    from app.main import create_app

    flaky = _FlakyEmbedder()
    with TestClient(create_app(settings=settings, embedder=flaky)) as test_client:
        for _ in range(50):  # wait for the failed startup attempt
            if flaky.attempts >= 1:
                break
            time.sleep(0.05)
        health = test_client.get("/api/health").json()
        assert health["status"] == "degraded"
        assert health["embedding"]["error"]

        response = upload(test_client, "a.txt", b"Retry after failure works fine. " * 10)
        assert response.status_code == 201
        assert test_client.get("/api/health").json()["status"] == "ok"

        answer = test_client.post(
            "/api/query", json={"question": "Does retry after failure work?"}
        )
        assert answer.status_code == 200


def test_upload_returns_503_for_temporary_gemini_embedding_failure(settings) -> None:
    from fastapi.testclient import TestClient

    from app.embeddings import EmbeddingError
    from app.main import create_app
    from tests.conftest import FakeEmbedder

    class TemporaryFailure(FakeEmbedder):
        def embed_chunks(self, texts):
            raise EmbeddingError("Gemini embeddings remained temporarily unavailable (HTTP 503).")

    with TestClient(
        create_app(settings=settings, embedder=TemporaryFailure())
    ) as test_client:
        response = upload(test_client, "a.txt", b"Temporary embedding failures are recoverable. " * 10)

    assert response.status_code == 503
    assert "temporarily unavailable" in response.json()["detail"]


def test_upload_returns_503_when_embedding_keeps_failing(settings) -> None:
    from fastapi.testclient import TestClient

    from app.embeddings import EmbeddingError
    from app.main import create_app
    from tests.conftest import FakeEmbedder

    class Broken(FakeEmbedder):
        ready = False  # type: ignore[assignment]
        error = "boom"

        def load(self) -> None:
            raise EmbeddingError("still broken")

    with TestClient(create_app(settings=settings, embedder=Broken())) as test_client:
        response = upload(test_client, "a.txt", b"some text " * 10)
        assert response.status_code == 503
        assert "not ready" in response.json()["detail"]
