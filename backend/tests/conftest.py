from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.store import DocumentStore


class FakeEmbedder:
    """Deterministic hashing embedder so tests never load a real model."""

    model_name = "fake-embedding-model"
    dimension = 64
    device = "cpu"
    error: str | None = None
    ready = True

    def load(self) -> None:
        return None

    def _encode(self, text: str) -> np.ndarray:
        vector = np.zeros(self.dimension, dtype=np.float32)
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        for token in tokens:
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=4).digest()
            index = int.from_bytes(digest, "big") % self.dimension
            vector[index] += 1.0
        norm = float(np.linalg.norm(vector))
        if norm == 0:
            vector[0] = 1.0
            return vector
        return vector / norm

    def embed_query(self, text: str) -> np.ndarray:
        return self._encode(text)

    def embed_chunks(self, texts: list[str]) -> tuple[np.ndarray, list[int]]:
        if not texts:
            return np.zeros((0, self.dimension), dtype=np.float32), []
        vectors = np.stack([self._encode(text) for text in texts])
        return vectors, list(range(len(texts)))


class MultiWindowEmbedder(FakeEmbedder):
    """Returns two windows for each chunk, simulating long-chunk windowing."""

    def embed_chunks(self, texts: list[str]) -> tuple[np.ndarray, list[int]]:
        vectors: list[np.ndarray] = []
        indices: list[int] = []
        for index, text in enumerate(texts):
            encoded = self._encode(text)
            vectors.extend([encoded, encoded])
            indices.extend([index, index])
        return np.stack(vectors), indices


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        data_dir=tmp_path / "data",
        embedding_model="fake-embedding-model",
        embedding_device="cpu",
        max_upload_mb=1,
        max_pdf_pages=5,
        llm_provider="extractive",
        ollama_model="qwen2.5:3b",
    )


@pytest.fixture
def embedder() -> FakeEmbedder:
    return FakeEmbedder()


@pytest.fixture
def store(settings: Settings, embedder: FakeEmbedder) -> DocumentStore:
    return DocumentStore(settings, embedder)


@pytest.fixture
def app(settings: Settings, embedder: FakeEmbedder):
    return create_app(settings=settings, embedder=embedder)


@pytest.fixture
def client(app: Any):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def add_text(store: DocumentStore):
    from app.chunking import chunk_text
    from app.extraction import ExtractionResult

    def _add(
        text: str,
        filename: str = "notes.txt",
        chunk_size: int = 100,
        overlap: int = 0,
    ) -> dict:
        extraction = ExtractionResult(
            filename=filename,
            file_type="txt",
            pages=[(None, text)],
            page_count=1,
            character_count=len(text),
        )
        chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)
        return store.add_document(extraction, chunks, text.encode("utf-8"))

    return _add
