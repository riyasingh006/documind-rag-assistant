from __future__ import annotations

import asyncio
import email.utils
import json
import random
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Awaitable, Callable, Protocol

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


@dataclass
class ResolvedLLM:
    client: LLMClient | None
    provider: str
    model: str
    fallback_reason: str | None = None


class GeminiClient:
    provider = "gemini"
    _RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}

    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ):
        self.api_key = (settings.gemini_api_key or "").strip()
        self.model = settings.llm_model
        self.timeout = settings.llm_timeout_seconds
        self.retry_budget = settings.llm_retry_budget_seconds
        self.temperature = settings.llm_temperature
        self.max_tokens = settings.llm_max_tokens
        self._transport = transport
        self._sleep = sleep
        self._max_attempts = 3
        self._base_delay_seconds = 0.35
        self.last_error: str | None = None

    def _backoff(self, attempt: int) -> float:
        return self._base_delay_seconds * (2 ** (attempt - 1)) * random.uniform(0.8, 1.2)

    def _retry_after(self, response: httpx.Response, attempt: int) -> float:
        value = response.headers.get("retry-after", "").strip()
        if not value:
            return self._backoff(attempt)
        try:
            return min(3.0, max(0.0, float(value)))
        except ValueError:
            try:
                retry_at = email.utils.parsedate_to_datetime(value)
                if retry_at.tzinfo is None:
                    retry_at = retry_at.replace(tzinfo=timezone.utc)
                return min(3.0, max(0.0, (retry_at - datetime.now(timezone.utc)).total_seconds()))
            except (TypeError, ValueError, OverflowError):
                return self._backoff(attempt)

    def _payload(self, system: str, prompt: str) -> dict:
        return {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": self.temperature,
                "maxOutputTokens": self.max_tokens,
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "answerable": {"type": "BOOLEAN"},
                        "answer": {"type": "STRING"},
                        "citation_ids": {
                            "type": "ARRAY",
                            "items": {"type": "INTEGER"},
                        },
                    },
                    "required": ["answerable", "answer", "citation_ids"],
                    "propertyOrdering": ["answerable", "answer", "citation_ids"],
                },
            },
        }

    async def _request(self, system: str, prompt: str) -> httpx.Response:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent"
        )
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }
        payload = self._payload(system, prompt)
        deadline = time.monotonic() + self.retry_budget

        for attempt in range(1, self._max_attempts + 1):
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise LLMGenerationError("Gemini did not respond within the retry time limit.")
            request_timeout = min(self.timeout, remaining)
            timeout = httpx.Timeout(
                request_timeout,
                connect=min(5.0, request_timeout),
            )
            try:
                async with httpx.AsyncClient(
                    timeout=timeout,
                    follow_redirects=False,
                    transport=self._transport,
                ) as client:
                    response = await client.post(
                        url,
                        headers=headers,
                        json=payload,
                        timeout=timeout,
                    )
            except httpx.TimeoutException as exc:
                if attempt == self._max_attempts or time.monotonic() >= deadline:
                    raise LLMGenerationError(
                        "Gemini did not respond within the configured retry time limit."
                    ) from exc
                delay = min(self._backoff(attempt), max(0.0, deadline - time.monotonic()))
                await self._sleep(delay)
                continue
            except httpx.HTTPError as exc:
                if attempt == self._max_attempts or time.monotonic() >= deadline:
                    raise LLMGenerationError(
                        "Gemini could not be reached after repeated connection attempts."
                    ) from exc
                delay = min(self._backoff(attempt), max(0.0, deadline - time.monotonic()))
                await self._sleep(delay)
                continue

            if response.status_code in self._RETRYABLE_STATUS_CODES:
                if attempt == self._max_attempts or time.monotonic() >= deadline:
                    raise LLMGenerationError(
                        f"Gemini remained temporarily unavailable (HTTP {response.status_code})."
                    )
                delay = min(
                    self._retry_after(response, attempt),
                    max(0.0, deadline - time.monotonic()),
                )
                await self._sleep(delay)
                continue

            if response.status_code != 200:
                if response.status_code in {401, 403}:
                    detail = "Gemini rejected the configured API key or its permissions."
                elif response.status_code == 404:
                    detail = "The configured Gemini generation model was not found."
                else:
                    detail = f"Gemini rejected the generation request (HTTP {response.status_code})."
                raise LLMGenerationError(detail)

            return response

        raise LLMGenerationError("Gemini generation could not be completed.")

    async def generate(self, system: str, prompt: str) -> str:
        try:
            response = await self._request(system, prompt)
            data = response.json()
            candidates = data.get("candidates") if isinstance(data, dict) else None
            if not isinstance(candidates, list) or not candidates:
                raise LLMGenerationError("Gemini returned no answer candidates.")
            first = candidates[0]
            parts = first.get("content", {}).get("parts", []) if isinstance(first, dict) else []
            if not isinstance(parts, list):
                raise LLMGenerationError("Gemini returned an unexpected response format.")
            text = "".join(
                part["text"]
                for part in parts
                if isinstance(part, dict) and isinstance(part.get("text"), str)
            ).strip()
            if not text:
                finish_reason = first.get("finishReason") if isinstance(first, dict) else None
                if finish_reason in {"SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"}:
                    raise LLMGenerationError("Gemini declined the request under its safety rules.")
                raise LLMGenerationError("Gemini returned an empty answer.")
            self.last_error = None
            return text
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            error = LLMGenerationError("Gemini returned an invalid JSON response.")
            self.last_error = str(error)
            raise error from exc
        except LLMGenerationError as exc:
            self.last_error = str(exc)
            raise


class LLMRouter:
    """Selects Gemini generation or the clearly labelled extractive fallback."""

    def __init__(self, settings: Settings, gemini_client: GeminiClient | None = None):
        self.settings = settings
        self.gemini = gemini_client or GeminiClient(settings)

    @property
    def configured_provider(self) -> str:
        return self.settings.llm_provider.strip().lower()

    async def resolve(self) -> ResolvedLLM:
        provider = self.configured_provider
        if provider == "extractive":
            return ResolvedLLM(
                client=None,
                provider="extractive",
                model="extractive fallback",
                fallback_reason="Extractive mode is explicitly configured.",
            )
        if provider != "gemini":
            raise LLMUnavailableError(
                f"Unknown LLM provider '{provider}'. Use gemini or extractive."
            )
        if self.gemini.api_key:
            return ResolvedLLM(
                client=self.gemini,
                provider="gemini",
                model=self.gemini.model,
            )
        reason = "DOCUMIND_GEMINI_API_KEY is not configured."
        if self.settings.extractive_fallback:
            return ResolvedLLM(
                client=None,
                provider="extractive",
                model="extractive fallback",
                fallback_reason=reason,
            )
        raise LLMUnavailableError(reason)

    async def describe(self) -> dict:
        provider = self.configured_provider
        if provider == "extractive":
            return {
                "configured_provider": provider,
                "active_provider": "extractive",
                "model": "extractive fallback",
                "available": False,
                "fallback_enabled": self.settings.extractive_fallback,
                "detail": "Extractive answer generation is explicitly configured.",
                "generation_active": False,
                "status": "extractive",
            }
        if provider != "gemini":
            return {
                "configured_provider": provider,
                "active_provider": "none",
                "model": "none",
                "available": False,
                "fallback_enabled": self.settings.extractive_fallback,
                "detail": f"Unknown LLM provider '{provider}'. Use gemini or extractive.",
                "generation_active": False,
                "status": "not_configured",
            }
        if not self.gemini.api_key:
            return {
                "configured_provider": provider,
                "active_provider": "extractive" if self.settings.extractive_fallback else "none",
                "model": "extractive fallback" if self.settings.extractive_fallback else "none",
                "available": False,
                "fallback_enabled": self.settings.extractive_fallback,
                "detail": (
                    "Gemini is not configured. Add DOCUMIND_GEMINI_API_KEY to the server environment."
                    if not self.settings.extractive_fallback
                    else "Gemini is not configured; answers use the labelled extractive fallback."
                ),
                "generation_active": False,
                "status": "fallback" if self.settings.extractive_fallback else "not_configured",
            }
        if self.gemini.last_error:
            return {
                "configured_provider": provider,
                "active_provider": "gemini",
                "model": self.gemini.model,
                "available": False,
                "fallback_enabled": self.settings.extractive_fallback,
                "detail": f"The most recent Gemini request failed: {self.gemini.last_error}",
                "generation_active": True,
                "status": "temporarily_unavailable",
            }
        return {
            "configured_provider": provider,
            "active_provider": "gemini",
            "model": self.gemini.model,
            "available": True,
            "fallback_enabled": self.settings.extractive_fallback,
            "detail": "Gemini is configured; connectivity is checked when an answer is generated.",
            "generation_active": True,
            "status": "configured",
        }


_SENTENCE_PATTERN = re.compile(r"(?<=[.!?])\s+")
_STOP_WORDS = {
    "the", "and", "for", "with", "what", "which", "how", "does", "did",
    "are", "was", "were", "from", "that", "this", "into", "about", "when",
    "where", "why", "who",
}


def extractive_answer(question: str, excerpts: list[str]) -> str:
    """Quote relevant retrieved sentences with their source citation numbers."""
    if not excerpts:
        return ""

    question_terms = {
        term
        for term in re.findall(r"[a-zA-Z0-9]{3,}", question.lower())
        if term not in _STOP_WORDS
    }
    selected: list[tuple[int, str]] = []
    for source_index, excerpt in enumerate(excerpts, start=1):
        sentences = [
            sentence.strip()
            for sentence in _SENTENCE_PATTERN.split(excerpt.replace("\n", " "))
            if sentence.strip()
        ] or [excerpt.strip()]
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

    lines = [f"“{sentence}” [{source_index}]" for source_index, sentence in selected[:3]]
    return (
        "Extractive answer from the retrieved passages (no LLM configured):\n\n"
        + "\n\n".join(lines)
    )
