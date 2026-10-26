from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from app.chunking import chunk_text
from app.extraction import ExtractionResult
from app.store import DocumentStore, StoreError
from tests.conftest import FakeEmbedder, MultiWindowEmbedder


def add(store: DocumentStore, text: str, filename: str = "notes.txt") -> dict:
    extraction = ExtractionResult(
        filename=filename,
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


def test_add_list_search_and_counts(settings, embedder) -> None:
    store = DocumentStore(settings, embedder)
    summary = add(store, "Project Zephyr identifier is ZX-4417. Review starts in April.")

    assert summary["chunk_count"] == 1
    assert store.document_count() == 1
    assert store.chunk_count() == 1
    assert store.counts()["index_vectors"] == 1
    assert store.has_document(summary["id"])
    assert [item["id"] for item in store.list_documents()] == [summary["id"]]

    results = store.search(
        embedder.embed_query("Zephyr identifier"),
        top_k=5,
        threshold=0.05,
    )
    assert len(results) == 1
    assert results[0].document.id == summary["id"]
    assert "ZX-4417" in results[0].chunk.text
    assert results[0].score > 0.2


def test_search_filters_by_document_scope(settings, embedder) -> None:
    store = DocumentStore(settings, embedder)
    alpha = add(store, "Alpha launch code is ALPHA-111.", "alpha.txt")
    beta = add(store, "Beta launch code is BETA-222.", "beta.txt")
    query = embedder.embed_query("launch code")

    results = store.search(query, document_ids=[alpha["id"]], threshold=0.0)
    assert results
    assert {result.document.id for result in results} == {alpha["id"]}

    results = store.search(query, document_ids=[alpha["id"], beta["id"]], threshold=0.0)
    assert {result.document.id for result in results} == {alpha["id"], beta["id"]}

    assert store.search(query, document_ids=[], threshold=0.0) == []
    assert store.search(query, document_ids=["missing"], threshold=0.0) == []


def test_search_honours_top_k_and_threshold(settings, embedder) -> None:
    store = DocumentStore(settings, embedder)
    add(store, "Alpha beta gamma delta epsilon.")
    add(store, "Zeta eta theta iota kappa.")
    query = embedder.embed_query("alpha beta")

    assert len(store.search(query, top_k=1, threshold=0.0)) == 1
    assert store.search(query, top_k=0, threshold=0.0) == []
    assert store.search(query, top_k=5, threshold=1.01) == []


def test_duplicate_windows_are_deduplicated(settings) -> None:
    embedder = MultiWindowEmbedder()
    store = DocumentStore(settings, embedder)
    summary = add(store, "Duplicate-window content about solar panels.")

    assert store.counts()["index_vectors"] == 2
    results = store.search(
        embedder.embed_query("solar panels"),
        top_k=5,
        threshold=0.05,
    )
    assert len(results) == 1
    assert results[0].document.id == summary["id"]


def test_delete_removes_document_file_and_vectors(settings, embedder) -> None:
    store = DocumentStore(settings, embedder)
    summary = add(store, "Temporary deletion fixture text.")
    document = store.get_document(summary["id"])
    assert document is not None
    stored_path = store.uploads_dir / document.stored_filename
    assert stored_path.exists()

    assert store.delete_document(summary["id"]) is True
    assert store.delete_document(summary["id"]) is False
    assert not stored_path.exists()
    assert store.document_count() == 0
    assert store.counts()["index_vectors"] == 0
    assert store.search(embedder.embed_query("fixture"), threshold=0.0) == []


def test_documents_and_index_survive_reload(settings, embedder) -> None:
    store = DocumentStore(settings, embedder)
    summary = add(store, "Persistence marker is PERSIST-9000.")
    del store

    reloaded = DocumentStore(settings, embedder)
    assert reloaded.document_count() == 1
    assert reloaded.list_documents()[0]["id"] == summary["id"]
    results = reloaded.search(
        embedder.embed_query("persistence marker"),
        threshold=0.05,
    )
    assert len(results) == 1
    assert "PERSIST-9000" in results[0].chunk.text


def test_unknown_document_returns_none(settings, embedder) -> None:
    store = DocumentStore(settings, embedder)
    assert store.get_document("missing") is None
    assert store.has_document("missing") is False


def test_embedding_dimension_mismatch_is_rejected(settings, embedder) -> None:
    class WrongDimensionEmbedder(FakeEmbedder):
        dimension = 32

    store = DocumentStore(settings, embedder)
    add(store, "First document with a given dimension.")
    store.embedder = WrongDimensionEmbedder()

    extraction = ExtractionResult(
        filename="second.txt",
        file_type="txt",
        pages=[(None, "Second document.")],
        page_count=1,
        character_count=16,
    )
    with pytest.raises(StoreError, match="different dimension"):
        store.add_document(
            extraction,
            chunk_text("Second document."),
            b"Second document.",
        )
    assert store.document_count() == 1


def test_corrupt_index_raises_store_error(settings, embedder) -> None:
    store = DocumentStore(settings, embedder)
    add(store, "Index corruption fixture.")
    index_path: Path = store.index_dir / "index.json"
    index_path.write_text("not-json", encoding="utf-8")

    with pytest.raises(StoreError, match="Could not read index metadata"):
        DocumentStore(settings, embedder)
