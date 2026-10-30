from __future__ import annotations

import asyncio

import httpx
import pytest

from app.config import Settings
from app.llm import (
    LLMGenerationError,
    LLMUnavailableError,
    LLMRouter,
    OllamaClient,
)


def make_settings(**overrides) -> Settings:
    values = {
        "llm_provider": "auto",
        "ollama_base_url": "http://ollama.test",
        "ollama_model": "qwen2.5:3b",
        "llm_timeout_seconds": 5,
        "extractive_fallback": True,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def tags_transport(names: list[str]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/tags"
        return httpx.Response(
            200,
            json={"models": [{"name": name} for name in names]},
        )

    return httpx.MockTransport(handler)


def test_ollama_connects_and_verifies_exact_model() -> None:
    settings = make_settings()
    transport = tags_transport(["qwen2.5:3b", "llama3.2:latest"])
    state = asyncio.run(
        OllamaClient(settings, transport=transport).check_availability()
    )

    assert state.reachable is True
    assert state.model_available is True
    assert state.usable is True
    assert "qwen2.5:3b" in state.detail


def test_ollama_does_not_accept_a_different_model_tag() -> None:
    settings = make_settings()
    transport = tags_transport(["qwen2.5:7b"])
    state = asyncio.run(
        OllamaClient(settings, transport=transport).check_availability()
    )

    assert state.reachable is True
    assert state.model_available is False
    assert "not installed" in state.detail
    assert "ollama pull qwen2.5:3b" in state.detail


def test_ollama_accepts_implicit_latest_tag() -> None:
    settings = make_settings(ollama_model="qwen2.5")
    transport = tags_transport(["qwen2.5:latest"])
    state = asyncio.run(
        OllamaClient(settings, transport=transport).check_availability()
    )

    assert state.model_available is True


def test_ollama_unreachable_is_reported() -> None:
    settings = make_settings()

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    state = asyncio.run(
        OllamaClient(
            settings, transport=httpx.MockTransport(handler)
        ).check_availability()
    )

    assert state.reachable is False
    assert state.model_available is False
    assert "not reachable" in state.detail


def test_ollama_generate_returns_content() -> None:
    settings = make_settings()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/chat"
        return httpx.Response(
            200,
            json={"message": {"content": '{"answerable": true}'}},
        )

    client = OllamaClient(settings, transport=httpx.MockTransport(handler))
    result = asyncio.run(client.generate("system", "prompt"))
    assert result == '{"answerable": true}'


def test_ollama_generate_reports_missing_model() -> None:
    settings = make_settings()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"error": "model not found"})

    client = OllamaClient(settings, transport=httpx.MockTransport(handler))
    with pytest.raises(LLMGenerationError, match="not available"):
        asyncio.run(client.generate("system", "prompt"))


def test_ollama_generate_timeout_is_reported() -> None:
    settings = make_settings(llm_timeout_seconds=1)

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    client = OllamaClient(settings, transport=httpx.MockTransport(handler))
    with pytest.raises(LLMGenerationError, match="did not respond"):
        asyncio.run(client.generate("system", "prompt"))


def test_router_auto_uses_ollama_when_model_is_available() -> None:
    settings = make_settings()
    router = LLMRouter(settings)
    router.ollama = OllamaClient(
        settings,
        transport=tags_transport(["qwen2.5:3b"]),
    )

    resolved = asyncio.run(router.resolve(force_check=True))
    status = asyncio.run(router.describe())

    assert resolved.provider == "ollama"
    assert resolved.client is not None
    assert status["status"] == "ready"
    assert status["ollama_connected"] is True
    assert status["model_available"] is True
    assert status["generation_active"] is True
    assert status["ollama_model"] == "qwen2.5:3b"


def test_router_auto_falls_back_when_model_is_missing() -> None:
    settings = make_settings()
    router = LLMRouter(settings)
    router.ollama = OllamaClient(
        settings,
        transport=tags_transport(["llama3.2:latest"]),
    )

    resolved = asyncio.run(router.resolve(force_check=True))
    status = asyncio.run(router.describe())

    assert resolved.provider == "extractive"
    assert resolved.client is None
    assert "qwen2.5:3b" in (resolved.fallback_reason or "")
    assert status["status"] == "model_missing"
    assert status["active_provider"] == "extractive"
    assert status["ollama_connected"] is True
    assert status["model_available"] is False
    assert status["generation_active"] is False


def test_router_explicit_ollama_missing_model_raises() -> None:
    settings = make_settings(llm_provider="ollama")
    router = LLMRouter(settings)
    router.ollama = OllamaClient(
        settings,
        transport=tags_transport(["llama3.2:latest"]),
    )

    with pytest.raises(LLMUnavailableError, match="qwen2.5:3b"):
        asyncio.run(router.resolve(force_check=True))


def test_router_reports_unreachable_ollama() -> None:
    settings = make_settings()
    router = LLMRouter(settings)

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    router.ollama = OllamaClient(
        settings,
        transport=httpx.MockTransport(handler),
    )
    status = asyncio.run(router.describe())

    assert status["status"] == "unavailable"
    assert status["ollama_connected"] is False
    assert status["generation_active"] is False
    assert status["active_provider"] == "extractive"


def test_ollama_alias_environment_variables(monkeypatch) -> None:
    monkeypatch.delenv("DOCUMIND_OLLAMA_MODEL", raising=False)
    monkeypatch.delenv("DOCUMIND_OLLAMA_BASE_URL", raising=False)
    monkeypatch.setenv("OLLAMA_MODEL", "alias-model:1b")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://alias-host:11434")

    settings = Settings(_env_file=None)

    assert settings.ollama_model == "alias-model:1b"
    assert settings.ollama_base_url == "http://alias-host:11434"


# --- OpenAI-compatible (hosted) provider -------------------------------------
# Ollama cannot run on typical PaaS hosts, so the hosted deployment relies on
# this path. These tests cover routing and request/response handling.

from app.llm import OpenAICompatibleClient  # noqa: E402


def _unreachable_ollama(settings: Settings) -> OllamaClient:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    return OllamaClient(settings, transport=httpx.MockTransport(handler))


def test_router_auto_uses_openai_when_ollama_unreachable() -> None:
    settings = make_settings(openai_api_key="test-key", openai_model="m")
    router = LLMRouter(settings)
    router.ollama = _unreachable_ollama(settings)

    resolved = asyncio.run(router.resolve(force_check=True))
    status = asyncio.run(router.describe())

    assert resolved.provider == "openai"
    assert resolved.client is not None
    assert status["status"] == "ready"
    assert status["generation_active"] is True


def test_router_explicit_openai_without_key_raises() -> None:
    router = LLMRouter(make_settings(llm_provider="openai"))
    with pytest.raises(LLMUnavailableError, match="OPENAI_API_KEY"):
        asyncio.run(router.resolve())


def test_openai_client_sends_auth_and_parses_answer(monkeypatch) -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers.get("authorization")
        seen["url"] = str(request.url)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": " hello [1] "}}]},
        )

    settings = make_settings(
        openai_api_key="test-key",
        openai_base_url="https://llm.example.test/v1/",
    )
    client = OpenAICompatibleClient(settings)
    monkeypatch.setattr(
        client,
        "_http",
        lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    assert asyncio.run(client.generate("sys", "prompt")) == "hello [1]"
    assert seen["auth"] == "Bearer test-key"
    assert seen["url"] == "https://llm.example.test/v1/chat/completions"


def test_openai_client_maps_http_errors(monkeypatch) -> None:
    settings = make_settings(openai_api_key="bad-key")
    client = OpenAICompatibleClient(settings)
    monkeypatch.setattr(
        client,
        "_http",
        lambda: httpx.AsyncClient(
            transport=httpx.MockTransport(lambda r: httpx.Response(401))
        ),
    )
    with pytest.raises(LLMGenerationError, match="401"):
        asyncio.run(client.generate("sys", "prompt"))
