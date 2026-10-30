from __future__ import annotations

import email.utils
import logging
import random
import threading
import time
from datetime import datetime, timezone
from typing import Callable

import httpx
import numpy as np

from .config import Settings
from .runtime import rss_mb

logger = logging.getLogger("documind.embeddings")


class EmbeddingError(RuntimeError):
    """Raised when the Gemini embedding service cannot be used."""


class EmbeddingService:
    """Gemini-backed document and query embeddings with bounded retries."""

    _RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}
    _MAX_ATTEMPTS = 3
    _MAX_INPUT_CHARS = 1_500
    _WINDOW_OVERLAP_CHARS = 120

    def __init__(
        self,
        settings: Settings,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ):
        self.settings = settings
        self.model_name = settings.embedding_model
        self.device = settings.embedding_device
        self.dimension: int | None = settings.embedding_dimension
        self.state = "not_started"
        self.error: str | None = None
        self.load_seconds: float | None = None
        self._api_key = (settings.gemini_api_key or "").strip()
        self._transport = transport
        self._sleep = sleep
        self._ready = False
        self._load_lock = threading.Lock()
        self._request_lock = threading.Lock()

    @property
    def ready(self) -> bool:
        return self._ready

    def _set_failure(self, message: str) -> EmbeddingError:
        self._ready = False
        self.state = "failed"
        self.error = message
        return EmbeddingError(message)

    def load(self) -> None:
        with self._load_lock:
            if self._ready:
                return
            self.state = "loading"
            started = time.monotonic()
            logger.info(
                "Gemini embedding configuration check starting (model=%s, rss=%s MB)",
                self.model_name,
                rss_mb(),
            )
            if not self._api_key:
                raise self._set_failure(
                    "DOCUMIND_GEMINI_API_KEY is not configured. Add it to the server environment."
                )
            if not 128 <= self.settings.embedding_dimension <= 3072:
                raise self._set_failure(
                    "The configured Gemini embedding dimension must be between 128 and 3072."
                )
            self.dimension = self.settings.embedding_dimension
            self.error = None
            self._ready = True
            self.state = "ready"
            self.load_seconds = round(time.monotonic() - started, 3)
            logger.info(
                "Gemini embedding configuration ready (model=%s, dimension=%s, rss=%s MB)",
                self.model_name,
                self.dimension,
                rss_mb(),
            )

    def _windows_for_text(self, text: str) -> list[str]:
        cleaned = text.strip()
        if not cleaned:
            return []
        if len(cleaned) <= self._MAX_INPUT_CHARS:
            return [cleaned]

        windows: list[str] = []
        start = 0
        while start < len(cleaned):
            end = min(start + self._MAX_INPUT_CHARS, len(cleaned))
            if end < len(cleaned):
                boundary = max(
                    cleaned.rfind(" ", start + self._MAX_INPUT_CHARS // 2, end),
                    cleaned.rfind("\n", start + self._MAX_INPUT_CHARS // 2, end),
                )
                if boundary > start:
                    end = boundary
            window = cleaned[start:end].strip()
            if window:
                windows.append(window)
            if end >= len(cleaned):
                break
            start = max(start + 1, end - self._WINDOW_OVERLAP_CHARS)
        return windows

    def _backoff(self, attempt: int) -> float:
        return 0.35 * (2 ** (attempt - 1)) * random.uniform(0.8, 1.2)

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
                return min(
                    3.0,
                    max(0.0, (retry_at - datetime.now(timezone.utc)).total_seconds()),
                )
            except (TypeError, ValueError, OverflowError):
                return self._backoff(attempt)

    def _embed_batch(self, texts: list[str], task_type: str) -> np.ndarray:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model_name}:batchEmbedContents"
        )
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self._api_key,
        }
        payload = {
            "requests": [
                {
                    "model": f"models/{self.model_name}",
                    "content": {"parts": [{"text": text}]},
                    "taskType": task_type,
                    "outputDimensionality": self.settings.embedding_dimension,
                }
                for text in texts
            ]
        }
        deadline = time.monotonic() + self.settings.embedding_retry_budget_seconds

        for attempt in range(1, self._MAX_ATTEMPTS + 1):
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise self._set_failure(
                    "Gemini embeddings did not respond within the configured retry time limit."
                )
            request_timeout = min(self.settings.embedding_timeout_seconds, remaining)
            timeout = httpx.Timeout(request_timeout, connect=min(5.0, request_timeout))
            try:
                with httpx.Client(
                    timeout=timeout,
                    follow_redirects=False,
                    transport=self._transport,
                ) as client:
                    response = client.post(
                        url,
                        headers=headers,
                        json=payload,
                        timeout=timeout,
                    )
            except httpx.TimeoutException as exc:
                if attempt == self._MAX_ATTEMPTS or time.monotonic() >= deadline:
                    raise self._set_failure(
                        "Gemini embeddings did not respond within the configured retry time limit."
                    ) from exc
                self._sleep(min(self._backoff(attempt), max(0.0, deadline - time.monotonic())))
                continue
            except httpx.HTTPError as exc:
                if attempt == self._MAX_ATTEMPTS or time.monotonic() >= deadline:
                    raise self._set_failure(
                        "Gemini embeddings could not be reached after repeated connection attempts."
                    ) from exc
                self._sleep(min(self._backoff(attempt), max(0.0, deadline - time.monotonic())))
                continue

            if response.status_code in self._RETRYABLE_STATUS_CODES:
                if attempt == self._MAX_ATTEMPTS or time.monotonic() >= deadline:
                    raise self._set_failure(
                        f"Gemini embeddings remained temporarily unavailable (HTTP {response.status_code})."
                    )
                self._sleep(
                    min(
                        self._retry_after(response, attempt),
                        max(0.0, deadline - time.monotonic()),
                    )
                )
                continue

            if response.status_code != 200:
                if response.status_code in {401, 403}:
                    message = "Gemini rejected the configured API key or its permissions for embeddings."
                elif response.status_code == 404:
                    message = "The configured Gemini embedding model was not found."
                else:
                    message = f"Gemini rejected the embedding request (HTTP {response.status_code})."
                raise self._set_failure(message)

            try:
                body = response.json()
                items = body.get("embeddings") if isinstance(body, dict) else None
                if not isinstance(items, list) or len(items) != len(texts):
                    raise ValueError("Embedding count did not match the request.")
                matrix = np.asarray(
                    [item["values"] for item in items],
                    dtype=np.float32,
                )
                if matrix.shape != (len(texts), self.settings.embedding_dimension):
                    raise ValueError("Embedding dimensions did not match configuration.")
                if not np.isfinite(matrix).all():
                    raise ValueError("Embedding values were not finite.")
                norms = np.linalg.norm(matrix, axis=1, keepdims=True)
                if np.any(norms <= 1e-12):
                    raise ValueError("Gemini returned a zero-length embedding.")
                matrix = matrix / norms
            except (KeyError, TypeError, ValueError) as exc:
                raise self._set_failure(
                    "Gemini returned an invalid embedding response."
                ) from exc

            self.error = None
            self._ready = True
            self.state = "ready"
            return matrix.astype(np.float32, copy=False)

        raise self._set_failure("Gemini embeddings could not be generated.")

    def _embed_texts(self, texts: list[str], task_type: str) -> np.ndarray:
        if not self.ready:
            self.load()
        if not texts:
            return np.zeros((0, self.settings.embedding_dimension), dtype=np.float32)

        with self._request_lock:
            output: list[np.ndarray] = []
            batch_size = self.settings.embedding_batch_size
            for start in range(0, len(texts), batch_size):
                output.append(
                    self._embed_batch(texts[start : start + batch_size], task_type)
                )
        return np.vstack(output) if output else np.zeros(
            (0, self.settings.embedding_dimension), dtype=np.float32
        )

    def embed_query(self, text: str) -> np.ndarray:
        windows = self._windows_for_text(text)
        if not windows:
            raise EmbeddingError("The query is empty.")
        vectors = self._embed_texts(windows, "RETRIEVAL_QUERY")
        vector = vectors.mean(axis=0)
        norm = float(np.linalg.norm(vector))
        if norm <= 1e-12:
            raise self._set_failure("Gemini returned an invalid query embedding.")
        return (vector / norm).astype(np.float32, copy=False)

    def embed_chunks(self, texts: list[str]) -> tuple[np.ndarray, list[int]]:
        window_texts: list[str] = []
        chunk_indices: list[int] = []
        for index, text in enumerate(texts):
            for window in self._windows_for_text(text):
                window_texts.append(window)
                chunk_indices.append(index)
        if not window_texts:
            return np.zeros((0, self.settings.embedding_dimension), dtype=np.float32), []
        vectors = self._embed_texts(window_texts, "RETRIEVAL_DOCUMENT")
        return vectors, chunk_indices
