from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from typing import Protocol

import httpx

from .config import Settings


class LLMError(RuntimeError):
    """Base class for language-model failures."""


class LLMUnavailableError(LLMError):
    """No configured provider can serve a request."""


class LLMGenerationError(LLMError):
    """A provider was selected but generation failed."""


class LLMClient(Protocol):
    provider: str
    model: str

    async def generate(self, system: str, prompt: str) -> str: ...


@dataclass(frozen=True)
class OllamaState:
    reachable: bool
    model_available: bool
    detail: str

    @property
    def usable(self) -> bool:
        return self.reachable and self.model_available


@dataclass
class ResolvedLLM:
    client: LLMClient | None
    provider: str
    model: str
    fallback_reason: str | None = None
    automatic: bool = False
    ollama_state: OllamaState | None = None


class OllamaClient:
    provider = "ollama"

    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model
        self.timeout = settings.llm_timeout_seconds
        self.temperature = settings.llm_temperature
        self.max_tokens = settings.llm_max_tokens
        self._transport = transport
        self._last_check = 0.0
        self._last_state = OllamaState(
            reachable=False,
            model_available=False,
            detail="Ollama status has not been checked yet.",
        )
        self._check_ttl = 8.0

    def _http(self, timeout: float) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            timeout=httpx.Timeout(timeout, connect=min(3.0, timeout)),
            follow_redirects=False,
            transport=self._transport,
        )

    def _model_is_installed(self, names: set[str]) -> bool:
        if self.model in names:
            return True
        return ":" not in self.model and f"{self.model}:latest" in names

    async def check_availability(self, force: bool = False) -> OllamaState:
        now = time.monotonic()
        if not force and now - self._last_check < self._check_ttl:
            return self._last_state

        self._last_check = now
        try:
            async with self._http(2.5) as client:
                response = await client.get(f"{self.base_url}/api/tags")
        except (httpx.HTTPError, OSError):
            self._last_state = OllamaState(
                reachable=False,
                model_available=False,
                detail=(
                    f"Ollama is not reachable at {self.base_url}. "
                    "Start Ollama and try again."
                ),
            )
            return self._last_state

        if response.status_code != 200:
            self._last_state = OllamaState(
                reachable=True,
                model_available=False,
                detail=f"Ollama responded with HTTP {response.status_code}.",
            )
            return self._last_state

        try:
            payload = response.json()
            models = payload.get("models", [])
            if not isinstance(models, list):
                raise ValueError("models must be a list")
            names = {
                str(model.get("name", ""))
                for model in models
                if isinstance(model, dict)
            }
        except (ValueError, TypeError):
            self._last_state = OllamaState(
                reachable=True,
                model_available=False,
                detail="Ollama responded with an unexpected model-list format.",
            )
            return self._last_state

        if not self._model_is_installed(names):
            self._last_state = OllamaState(
                reachable=True,
                model_available=False,
                detail=(
                    f"Ollama is running, but model '{self.model}' is not installed. "
                    f"Run: ollama pull {self.model}"
                ),
            )
            return self._last_state

        self._last_state = OllamaState(
            reachable=True,
            model_available=True,
            detail=(
                f"Ollama is reachable and model '{self.model}' is available."
            ),
        )
        return self._last_state

    async def generate(self, system: str, prompt: str) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "format": "json",
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens,
            },
        }
        try:
            async with self._http(self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
        except httpx.TimeoutException as exc:
            raise LLMGenerationError(
                f"Ollama did not respond within {self.timeout:.0f} seconds."
            ) from exc
        except (httpx.HTTPError, OSError) as exc:
            raise LLMGenerationError(
                "Could not reach Ollama to generate an answer."
            ) from exc

        if response.status_code == 404:
            raise LLMGenerationError(
                f"Ollama model '{self.model}' is not available. "
                f"Run: ollama pull {self.model}"
            )
        if response.status_code != 200:
            raise LLMGenerationError(
                f"Ollama returned HTTP {response.status_code}."
            )

        try:
            data = response.json()
            if isinstance(data, dict) and data.get("error"):
                raise LLMGenerationError(f"Ollama error: {data['error']}")
            content = data["message"]["content"]
        except LLMGenerationError:
            raise
        except (ValueError, KeyError, TypeError) as exc:
            raise LLMGenerationError(
                "Ollama returned an unexpected response format."
            ) from exc

        if not isinstance(content, str) or not content.strip():
            raise LLMGenerationError("Ollama returned an empty answer.")
        return content.strip()


class OpenAICompatibleClient:
    provider = "openai"

    def __init__(self, settings: Settings):
        self.base_url = settings.openai_base_url.rstrip("/")
        self.api_key = settings.openai_api_key or ""
        self.model = settings.openai_model
        self.timeout = settings.llm_timeout_seconds
        self.temperature = settings.llm_temperature
        self.max_tokens = settings.llm_max_tokens

    def _http(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout, connect=5.0),
            follow_redirects=False,
        )

    async def generate(self, system: str, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "response_format": {"type": "json_object"},
        }
        url = f"{self.base_url}/chat/completions"

        try:
            async with self._http() as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 400:
                    payload.pop("response_format", None)
                    response = await client.post(url, headers=headers, json=payload)
        except httpx.TimeoutException as exc:
            raise LLMGenerationError(
                f"The external provider did not respond within {self.timeout:.0f} seconds."
            ) from exc
        except (httpx.HTTPError, OSError) as exc:
            raise LLMGenerationError(
                "Could not reach the configured external LLM provider."
            ) from exc

        if response.status_code != 200:
            raise LLMGenerationError(
                f"The external provider returned HTTP {response.status_code}."
            )

        try:
            data = response.json()
            content = data["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise LLMGenerationError(
                "The external provider returned an unexpected response format."
            ) from exc

        if not isinstance(content, str) or not content.strip():
            raise LLMGenerationError("The external provider returned an empty answer.")
        return content.strip()


class LLMRouter:
    """Selects an LLM provider according to configuration and availability."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.ollama = OllamaClient(settings)
        self.openai = (
            OpenAICompatibleClient(settings) if settings.openai_api_key else None
        )

    @property
    def configured_provider(self) -> str:
        return self.settings.llm_provider.strip().lower()

    def _ollama_skipped_state(self) -> OllamaState:
        return OllamaState(
            reachable=False,
            model_available=False,
            detail=(
                "Ollama is not used on this deployment (no Ollama server is "
                f"reachable at {self.ollama.base_url}). Set "
                "DOCUMIND_OPENAI_API_KEY to enable a hosted LLM; otherwise "
                "answers are extractive."
            ),
        )

    async def resolve(self, force_check: bool = False) -> ResolvedLLM:
        provider = self.configured_provider

        if provider == "extractive":
            return ResolvedLLM(
                client=None,
                provider="extractive",
                model="extractive fallback",
                fallback_reason="Extractive mode is explicitly configured.",
            )

        if provider == "ollama":
            if not self.settings.ollama_active:
                raise LLMUnavailableError(self._ollama_skipped_state().detail)
            state = await self.ollama.check_availability(force_check)
            if state.usable:
                return ResolvedLLM(
                    client=self.ollama,
                    provider="ollama",
                    model=self.ollama.model,
                    ollama_state=state,
                )
            raise LLMUnavailableError(state.detail)

        if provider == "openai":
            if self.openai is None:
                raise LLMUnavailableError(
                    "DOCUMIND_OPENAI_API_KEY is not set, so the external provider "
                    "cannot be used."
                )
            return ResolvedLLM(
                client=self.openai,
                provider="openai",
                model=self.openai.model,
            )

        if provider == "auto":
            if self.settings.ollama_active:
                state = await self.ollama.check_availability(force_check)
            else:
                # Hosted platforms cannot run a local Ollama; do not probe it.
                state = None
            if state is not None and state.usable:
                return ResolvedLLM(
                    client=self.ollama,
                    provider="ollama",
                    model=self.ollama.model,
                    automatic=True,
                    ollama_state=state,
                )
            if self.openai is not None:
                return ResolvedLLM(
                    client=self.openai,
                    provider="openai",
                    model=self.openai.model,
                    automatic=True,
                    ollama_state=state,
                )
            reason = (state or self._ollama_skipped_state()).detail
            if self.settings.extractive_fallback:
                return ResolvedLLM(
                    client=None,
                    provider="extractive",
                    model="extractive fallback",
                    fallback_reason=reason,
                    automatic=True,
                    ollama_state=state,
                )
            raise LLMUnavailableError(reason)

        raise LLMUnavailableError(
            f"Unknown LLM provider '{provider}'. Use auto, ollama, openai, or extractive."
        )

    async def describe(self) -> dict:
        configured = self.configured_provider
        try:
            resolved = await self.resolve()
        except LLMUnavailableError as exc:
            if self.settings.ollama_active:
                state = await self.ollama.check_availability()
            else:
                state = self._ollama_skipped_state()
            status = "not_configured"
            if configured in {"ollama", "auto"} and state.reachable:
                status = "model_missing"
            elif configured in {"ollama", "auto"}:
                status = "unavailable"
            return {
                "configured_provider": configured,
                "active_provider": "none",
                "model": "none",
                "available": False,
                "fallback_enabled": self.settings.extractive_fallback,
                "detail": str(exc),
                "ollama_base_url": self.ollama.base_url,
                "ollama_model": self.ollama.model,
                "ollama_connected": state.reachable
                if configured in {"ollama", "auto"}
                else None,
                "model_available": state.model_available
                if configured in {"ollama", "auto"}
                else None,
                "generation_active": False,
                "status": status,
            }

        is_llm = resolved.client is not None
        state = resolved.ollama_state
        if is_llm:
            status = "ready"
            detail = (
                f"Ollama is connected and generating with '{resolved.model}'."
                if resolved.provider == "ollama"
                else "The external LLM provider is available."
            )
        elif configured == "extractive":
            status = "extractive"
            detail = resolved.fallback_reason or "Extractive mode is configured."
        elif state is not None and state.reachable:
            status = "model_missing"
            detail = state.detail
        elif state is not None:
            status = "unavailable"
            detail = state.detail
        else:
            status = "fallback"
            detail = resolved.fallback_reason or "No LLM provider is active."

        return {
            "configured_provider": configured,
            "active_provider": resolved.provider,
            "model": resolved.model,
            "available": is_llm,
            "fallback_enabled": self.settings.extractive_fallback,
            "detail": detail,
            "ollama_base_url": self.ollama.base_url,
            "ollama_model": self.ollama.model,
            "ollama_connected": state.reachable if state is not None else None,
            "model_available": state.model_available
            if state is not None
            else None,
            "generation_active": is_llm,
            "status": status,
        }


_SENTENCE_PATTERN = re.compile(r"(?<=[.!?])\s+")


def extractive_answer(question: str, excerpts: list[str]) -> str:
    """Build an answer strictly from retrieved text when no LLM is available.

    This is a transparent fallback: it quotes real passage sentences and keeps
    citation markers aligned with the retrieved source numbers.
    """
    if not excerpts:
        return ""

    question_terms = {
        term
        for term in re.findall(r"[a-zA-Z0-9]{3,}", question.lower())
        if term
        not in {
            "the",
            "and",
            "for",
            "with",
            "what",
            "which",
            "how",
            "does",
            "did",
            "are",
            "was",
            "were",
            "from",
            "that",
            "this",
            "into",
            "about",
            "when",
            "where",
            "why",
            "who",
        }
    }

    selected: list[tuple[int, str]] = []
    for source_index, excerpt in enumerate(excerpts, start=1):
        sentences = [
            sentence.strip()
            for sentence in _SENTENCE_PATTERN.split(excerpt.replace("\n", " "))
            if sentence.strip()
        ]
        if not sentences:
            sentences = [excerpt.strip()]

        ranked = sorted(
            enumerate(sentences),
            key=lambda item: (
                -len(
                    question_terms
                    & set(re.findall(r"[a-zA-Z0-9]{3,}", item[1].lower()))
                ),
                item[0],
            ),
        )
        for _, sentence in ranked[:2]:
            compact = re.sub(r"\s+", " ", sentence).strip()
            if len(compact) < 20:
                continue
            if len(compact) > 420:
                compact = compact[:417].rstrip() + "…"
            selected.append((source_index, compact))
            break

    if not selected:
        first = re.sub(r"\s+", " ", excerpts[0]).strip()
        if len(first) > 420:
            first = first[:417].rstrip() + "…"
        selected = [(1, first)]

    selected = selected[:3]
    lines = [
        f"“{sentence}” [{source_index}]" for source_index, sentence in selected
    ]
    return (
        "Extractive answer from the retrieved passages (no LLM configured):\n\n"
        + "\n\n".join(lines)
    )
