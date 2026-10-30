from __future__ import annotations

import numpy as np
import pytest

from app.chunking import chunk_text
from app.embeddings import EmbeddingError
from app.extraction import ExtractionResult
from app.store import DocumentStore, StoreNotReadyError
from tests.conftest import FakeEmbedder


def add(store: DocumentStore, text: str) -> dict:
    extraction = ExtractionResult(
        filename="migration.txt",
        file_type="txt",
        pages=[(None, text)],
        page_count=1,
        character_count=len(text),
    )
    return store.add_document(
        extraction,
        chunk_text(text, chunk_size=100, overlap=0),
        text.encode("utf-8"),
    )


def test_changed_embedding_model_rebuilds_index(settings, embedder) -> None:
    original = DocumentStore(settings, embedder)
    summary = add(original, "Migration marker is MIGRATE-7721.")

    class ReplacementEmbedder(FakeEmbedder):
        model_name = "gemini-embedding-next"

    replacement = ReplacementEmbedder()
    migrated = DocumentStore(settings, replacement)
    assert migrated.index_ready is False
    with pytest.raises(StoreNotReadyError):
        migrated.search(replacement.embed_query("migration marker"))

    migrated.ensure_embedding_compatibility(replacement)

    results = migrated.search(
        replacement.embed_query("migration marker"),
        threshold=0.05,
    )
    assert migrated.index_ready is True
    assert migrated.index_state == "ready"
    assert migrated.index_model == replacement.model_name
    assert migrated.list_documents()[0]["id"] == summary["id"]
    assert "MIGRATE-7721" in results[0].chunk.text


def test_failed_migration_preserves_documents_and_old_vectors(settings, embedder) -> None:
    original = DocumentStore(settings, embedder)
    summary = add(original, "Preserved migration source is KEEP-9001.")

    class FailingEmbedder(FakeEmbedder):
        model_name = "gemini-embedding-next"

        def embed_chunks(self, texts: list[str]) -> tuple[np.ndarray, list[int]]:
            raise EmbeddingError("Gemini embeddings are temporarily unavailable.")

    replacement = FailingEmbedder()
    migrated = DocumentStore(settings, replacement)
    old_vectors = migrated._vectors.copy()

    with pytest.raises(EmbeddingError, match="temporarily unavailable"):
        migrated.ensure_embedding_compatibility(replacement)

    assert migrated.index_ready is False
    assert migrated.index_state == "failed"
    assert migrated.get_document(summary["id"]) is not None
    np.testing.assert_array_equal(migrated._vectors, old_vectors)
    with pytest.raises(StoreNotReadyError):
        migrated.search(replacement.embed_query("preserved source"))


def test_delete_rolls_back_when_persistence_fails(store, add_text, monkeypatch) -> None:
    summary = add_text("The indexed document must survive a failed deletion.")
    document = store.get_document(summary["id"])
    assert document is not None
    stored_path = store.uploads_dir / document.stored_filename
    vectors_before = store._vectors.copy()
    rows_before = list(store._rows)

    def fail_save() -> None:
        raise OSError("storage unavailable")

    monkeypatch.setattr(store, "_save_locked", fail_save)

    with pytest.raises(OSError, match="storage unavailable"):
        store.delete_document(summary["id"])

    assert store.has_document(summary["id"])
    assert store._rows == rows_before
    np.testing.assert_array_equal(store._vectors, vectors_before)
    assert stored_path.exists()
