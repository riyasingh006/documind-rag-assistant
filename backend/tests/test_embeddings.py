from __future__ import annotations

import json

import httpx
import numpy as np
import pytest

from app.config import Settings
from app.embeddings import EmbeddingError, EmbeddingService


def make_settings(**overrides) -> Settings:
    values = {
        "_env_file": None,
        "gemini_api_key": "gemini-test-secret",
        "embedding_model": "gemini-embedding-001",
        "embedding_dimension": 128,
        "embedding_batch_size": 2,
        "embedding_timeout_seconds": 1.0,
        "embedding_retry_budget_seconds": 5.0,
    }
    values.update(overrides)
    return Settings(**values)


def response_for(request: httpx.Request) -> httpx.Response:
    payload = json.loads(request.content)
    return httpx.Response(
        200,
        json={
            "embeddings": [
                {"values": [1.0] + [0.0] * 127}
                for _ in payload["requests"]
            ]
        },
    )


def test_load_configures_remote_model_without_loading_torch() -> None:
    service = EmbeddingService(make_settings())
    service.load()

    assert service.ready is True
    assert service.state == "ready"
    assert service.model_name == "gemini-embedding-001"
    assert service.dimension == 128
    assert service.device == "gemini-api"
    assert service.error is None


def test_load_fails_cleanly_without_a_gemini_key() -> None:
    service = EmbeddingService(make_settings(gemini_api_key=None))

    with pytest.raises(EmbeddingError, match="DOCUMIND_GEMINI_API_KEY"):
        service.load()

    assert service.ready is False
    assert service.state == "failed"
    assert service.error is not None


def test_query_uses_retrieval_query_task_and_normalized_vector() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return response_for(request)

    service = EmbeddingService(
        make_settings(),
        transport=httpx.MockTransport(handler),
    )
    service.load()
    vector = service.embed_query("Which passage answers the question?")

    assert len(requests) == 1
    assert requests[0].url.path.endswith("/gemini-embedding-001:batchEmbedContents")
    assert requests[0].headers["x-goog-api-key"] == "gemini-test-secret"
    request_body = json.loads(requests[0].content)["requests"][0]
    assert request_body["model"] == "models/gemini-embedding-001"
    assert request_body["taskType"] == "RETRIEVAL_QUERY"
    assert request_body["outputDimensionality"] == 128
    assert vector.shape == (128,)
    assert np.isclose(np.linalg.norm(vector), 1.0)


def test_document_embeddings_batch_and_preserve_chunk_mapping() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return response_for(request)

    service = EmbeddingService(
        make_settings(),
        transport=httpx.MockTransport(handler),
    )
    service.load()
    vectors, chunk_indices = service.embed_chunks(["alpha", "beta", "gamma"])

    assert [len(json.loads(request.content)["requests"]) for request in requests] == [2, 1]
    assert all(
        item["taskType"] == "RETRIEVAL_DOCUMENT"
        for request in requests
        for item in json.loads(request.content)["requests"]
    )
    assert vectors.shape == (3, 128)
    assert chunk_indices == [0, 1, 2]
    assert np.allclose(np.linalg.norm(vectors, axis=1), 1.0)


def test_long_documents_are_windowed_and_map_back_to_parent_chunk() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return response_for(request)

    service = EmbeddingService(
        make_settings(embedding_batch_size=10),
        transport=httpx.MockTransport(handler),
    )
    service.load()
    vectors, chunk_indices = service.embed_chunks(["word " * 700])
    embedded_texts = [
        item["content"]["parts"][0]["text"]
        for request in requests
        for item in json.loads(request.content)["requests"]
    ]

    assert len(embedded_texts) > 1
    assert all(len(text) <= service._MAX_INPUT_CHARS for text in embedded_texts)
    assert vectors.shape[0] == len(embedded_texts)
    assert chunk_indices == [0] * len(embedded_texts)


def test_gemini_embedding_retries_temporary_service_failure() -> None:
    calls = 0
    delays: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(503, headers={"Retry-After": "1"})
        return response_for(request)

    service = EmbeddingService(
        make_settings(),
        transport=httpx.MockTransport(handler),
        sleep=delays.append,
    )
    service.load()
    vector = service.embed_query("retry safely")

    assert calls == 2
    assert delays == [1.0]
    assert service.ready is True
    assert np.isclose(np.linalg.norm(vector), 1.0)


def test_gemini_embedding_auth_error_is_not_retried_or_exposed() -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(403, json={"error": {"message": "forbidden"}})

    service = EmbeddingService(
        make_settings(),
        transport=httpx.MockTransport(handler),
    )
    service.load()

    with pytest.raises(EmbeddingError, match="API key or its permissions") as error:
        service.embed_query("credential-safe error")

    assert calls == 1
    assert "gemini-test-secret" not in str(error.value)
    assert service.ready is False
    assert service.state == "failed"


def test_gemini_embedding_rejects_bad_dimensions() -> None:
    service = EmbeddingService(
        make_settings(),
        transport=httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                json={"embeddings": [{"values": [1.0, 0.0]}]},
            )
        ),
    )
    service.load()

    with pytest.raises(EmbeddingError, match="invalid embedding response"):
        service.embed_query("malformed embedding")
    assert service.ready is False
