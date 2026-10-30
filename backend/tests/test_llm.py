from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx
import pytest

from app.config import Settings
from app.llm import (
    GeminiClient,
    LLMGenerationError,
    LLMRouter,
    LLMUnavailableError,
)


def make_settings(**overrides) -> Settings:
    values = {
        "data_dir": Path("/tmp/documind-llm-tests"),
        "gemini_api_key": "gemini-test-secret",
        "llm_provider": "gemini",
        "llm_model": "gemini-3.8-flash",
        "llm_timeout_seconds": 1.0,
        "llm_retry_budget_seconds": 5.0,
    }
    values.update(overrides)
    return Settings(**values)


def candidate_response(text: str) -> dict:
    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


def test_gemini_uses_official_generate_content_request() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=candidate_response('{"answer":"Alpha [1]"}'))

    client = GeminiClient(
        make_settings(),
        transport=httpx.MockTransport(handler),
    )
    result = asyncio.run(client.generate("system rules", "question and evidence"))

    assert result == '{"answer":"Alpha [1]"}'
    assert len(seen) == 1
    request = seen[0]
    assert request.url.host == "generativelanguage.googleapis.com"
    assert request.url.path == "/v1beta/models/gemini-3.8-flash:generateContent"
    assert request.headers["x-goog-api-key"] == "gemini-test-secret"
    payload = json.loads(request.content)
    assert payload["systemInstruction"]["parts"][0]["text"] == "system rules"
    assert payload["contents"][0]["parts"][0]["text"] == "question and evidence"
    assert payload["generationConfig"]["responseMimeType"] == "application/json"
    assert payload["generationConfig"]["responseSchema"]["required"] == [
        "answerable",
        "answer",
        "citation_ids",
    ]


def test_gemini_retries_transient_http_failure_then_recovers() -> None:
    calls = 0
    delays: list[float] = []

    async def no_wait(delay: float) -> None:
        delays.append(delay)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(503, headers={"Retry-After": "1"})
        return httpx.Response(200, json=candidate_response('{"answerable":true}'))

    client = GeminiClient(
        make_settings(),
        transport=httpx.MockTransport(handler),
        sleep=no_wait,
    )

    assert asyncio.run(client.generate("sys", "prompt")) == '{"answerable":true}'
    assert calls == 2
    assert delays == [1.0]
    assert client.last_error is None


def test_gemini_retries_connection_errors_with_a_bounded_attempt_count() -> None:
    calls = 0
    delays: list[float] = []

    async def no_wait(delay: float) -> None:
        delays.append(delay)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        raise httpx.ConnectTimeout("temporary", request=request)

    client = GeminiClient(
        make_settings(),
        transport=httpx.MockTransport(handler),
        sleep=no_wait,
    )

    with pytest.raises(LLMGenerationError, match="configured retry time limit"):
        asyncio.run(client.generate("sys", "prompt"))
    assert calls == 3
    assert len(delays) == 2


def test_gemini_does_not_retry_authentication_errors_or_leak_the_key() -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(403, json={"error": {"message": "forbidden"}})

    client = GeminiClient(
        make_settings(),
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(LLMGenerationError, match="API key or its permissions") as error:
        asyncio.run(client.generate("sys", "prompt"))
    assert calls == 1
    assert "gemini-test-secret" not in str(error.value)


def test_gemini_rejects_invalid_or_empty_responses() -> None:
    responses = [
        httpx.Response(200, content=b"not-json"),
        httpx.Response(200, json={"candidates": []}),
        httpx.Response(200, json={"candidates": [{"content": {"parts": []}}]}),
    ]
    for response in responses:
        client = GeminiClient(
            make_settings(),
            transport=httpx.MockTransport(lambda request, item=response: item),
        )
        with pytest.raises(LLMGenerationError):
            asyncio.run(client.generate("sys", "prompt"))


def test_router_uses_gemini_when_configured() -> None:
    settings = make_settings()
    router = LLMRouter(settings)

    resolved = asyncio.run(router.resolve())
    health = asyncio.run(router.describe())

    assert resolved.provider == "gemini"
    assert resolved.model == "gemini-3.8-flash"
    assert resolved.client is router.gemini
    assert health["active_provider"] == "gemini"
    assert health["status"] == "configured"


def test_router_uses_extractively_labelled_fallback_without_a_key() -> None:
    router = LLMRouter(make_settings(gemini_api_key=None))

    resolved = asyncio.run(router.resolve())
    health = asyncio.run(router.describe())

    assert resolved.provider == "extractive"
    assert resolved.client is None
    assert "not configured" in (resolved.fallback_reason or "")
    assert health["status"] == "fallback"
    assert health["generation_active"] is False


def test_router_rejects_missing_key_when_fallback_is_disabled() -> None:
    router = LLMRouter(
        make_settings(gemini_api_key=None, extractive_fallback=False)
    )

    with pytest.raises(LLMUnavailableError, match="not configured"):
        asyncio.run(router.resolve())
    assert asyncio.run(router.describe())["status"] == "not_configured"


def test_router_supports_explicit_extractive_mode() -> None:
    router = LLMRouter(make_settings(llm_provider="extractive"))

    resolved = asyncio.run(router.resolve())
    health = asyncio.run(router.describe())

    assert resolved.provider == "extractive"
    assert health["status"] == "extractive"


def test_router_reports_last_gemini_failure_without_claiming_availability() -> None:
    router = LLMRouter(make_settings())
    router.gemini.last_error = "Gemini remained temporarily unavailable (HTTP 503)."

    health = asyncio.run(router.describe())

    assert health["status"] == "temporarily_unavailable"
    assert health["available"] is False
    assert "HTTP 503" in health["detail"]
