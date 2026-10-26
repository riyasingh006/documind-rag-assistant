from __future__ import annotations

import json
import os
import re
import threading
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import faiss
import numpy as np

from .chunking import TextChunk
from .config import Settings
from .embeddings import EmbeddingService
from .extraction import ExtractionResult


class StoreError(RuntimeError):
    pass


@dataclass
class Chunk:
    id: str
    chunk_index: int
    page: int | None
    text: str
    token_estimate: int


@dataclass
class StoredDocument:
    id: str
    filename: str
    stored_filename: str
    file_type: str
    size_bytes: int
    pages: int | None
    character_count: int
    created_at: str
    chunks: list[Chunk] = field(default_factory=list)

    def summary(self) -> dict:
        return {
            "id": self.id,
            "filename": self.filename,
            "file_type": self.file_type,
            "size_bytes": self.size_bytes,
            "pages": self.pages,
            "chunk_count": len(self.chunks),
            "character_count": self.character_count,
            "created_at": self.created_at,
        }


@dataclass(frozen=True)
class RetrievedChunk:
    document: StoredDocument
    chunk: Chunk
    score: float


def _normalize_matrix(matrix: np.ndarray) -> np.ndarray:
    if matrix.size == 0:
        return matrix.astype(np.float32, copy=False)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return (matrix / norms).astype(np.float32, copy=False)


class DocumentStore:
    def __init__(self, settings: Settings, embedder: EmbeddingService):
        self.settings = settings
        self.embedder = embedder

        self.uploads_dir = settings.uploads_dir
        self.index_dir = settings.index_dir
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.index_dir.mkdir(parents=True, exist_ok=True)

        self._documents: dict[str, StoredDocument] = {}
        self._chunk_lookup: dict[str, tuple[StoredDocument, Chunk]] = {}
        self._rows: list[str] = []
        self._vectors: np.ndarray | None = None
        self._index: faiss.IndexFlatIP | None = None
        self._embedding_model: str | None = None
        self._dimension: int | None = None
        self._lock = threading.RLock()

        self._documents_path = self.index_dir / "documents.json"
        self._rows_path = self.index_dir / "index.json"
        self._vectors_path = self.index_dir / "embeddings.npy"

        self._load()

    # ------------------------------------------------------------------ load
    def _load(self) -> None:
        with self._lock:
            if self._documents_path.exists():
                try:
                    payload = json.loads(self._documents_path.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError) as exc:
                    raise StoreError(
                        f"Could not read document metadata: {exc}"
                    ) from exc

                documents = payload.get("documents", []) if isinstance(payload, dict) else []
                for raw in documents:
                    try:
                        chunks = [Chunk(**chunk) for chunk in raw.pop("chunks", [])]
                        document = StoredDocument(chunks=chunks, **raw)
                    except (TypeError, KeyError) as exc:
                        raise StoreError(
                            "Document metadata is corrupted and could not be loaded."
                        ) from exc
                    self._documents[document.id] = document

            self._rebuild_chunk_lookup_locked()

            if self._rows_path.exists():
                try:
                    index_payload = json.loads(
                        self._rows_path.read_text(encoding="utf-8")
                    )
                except (OSError, json.JSONDecodeError) as exc:
                    raise StoreError(f"Could not read index metadata: {exc}") from exc
                self._embedding_model = index_payload.get("embedding_model")
                self._dimension = index_payload.get("dimension")
                rows = index_payload.get("rows", [])
                if isinstance(rows, list):
                    self._rows = [str(row) for row in rows]

            if self._vectors_path.exists():
                try:
                    vectors = np.load(self._vectors_path, allow_pickle=False)
                    vectors = np.asarray(vectors, dtype=np.float32)
                    if vectors.ndim == 2:
                        self._vectors = vectors
                    else:
                        self._vectors = None
                except (OSError, ValueError) as exc:
                    raise StoreError(f"Could not read the vector index: {exc}") from exc

            if (
                self._vectors is None
                or len(self._rows) != self._vectors.shape[0]
                or self._vectors.shape[0] == 0
            ):
                self._vectors = None
                self._rows = []
                self._index = None
            else:
                self._dimension = int(self._vectors.shape[1])
                self._rebuild_faiss_locked()

    def _rebuild_chunk_lookup_locked(self) -> None:
        self._chunk_lookup = {}
        for document in self._documents.values():
            for chunk in document.chunks:
                self._chunk_lookup[chunk.id] = (document, chunk)

    def _rebuild_faiss_locked(self) -> None:
        if self._vectors is None or self._vectors.shape[0] == 0:
            self._index = None
            return
        index = faiss.IndexFlatIP(int(self._vectors.shape[1]))
        index.add(np.ascontiguousarray(self._vectors, dtype=np.float32))
        self._index = index

    # --------------------------------------------------------------- persist
    def _atomic_write_text(self, path: Path, content: str) -> None:
        temporary = path.with_name(path.name + ".tmp")
        temporary.write_text(content, encoding="utf-8")
        os.replace(temporary, path)

    def _save_locked(self) -> None:
        payload = {
            "version": 1,
            "documents": [
                {**asdict(document)} for document in self._documents.values()
            ],
        }
        self._atomic_write_text(
            self._documents_path,
            json.dumps(payload, ensure_ascii=False, indent=2),
        )

        index_payload = {
            "version": 1,
            "embedding_model": self._embedding_model,
            "dimension": self._dimension,
            "rows": self._rows,
        }
        self._atomic_write_text(
            self._rows_path,
            json.dumps(index_payload, ensure_ascii=False),
        )

        if self._vectors is None or self._vectors.shape[0] == 0:
            if self._vectors_path.exists():
                self._vectors_path.unlink(missing_ok=True)
            return

        temporary = self._vectors_path.with_name(self._vectors_path.name + ".tmp")
        with open(temporary, "wb") as handle:
            np.save(handle, self._vectors)
        os.replace(temporary, self._vectors_path)

    # ----------------------------------------------------------------- write
    def ensure_embedding_compatibility(self, embedder: EmbeddingService) -> None:
        """Re-embed all chunks if the configured embedding model changed."""
        if not embedder.ready:
            return
        with self._lock:
            if not self._documents:
                self._embedding_model = embedder.model_name
                self._dimension = embedder.dimension
                self._vectors = None
                self._rows = []
                self._index = None
                self._save_locked()
                return

            expected_ids = {
                chunk.id
                for document in self._documents.values()
                for chunk in document.chunks
            }
            same_model = self._embedding_model == embedder.model_name
            same_dimension = (
                self._dimension is None
                or embedder.dimension is None
                or self._dimension == embedder.dimension
            )
            rows_cover_chunks = expected_ids.issubset(set(self._rows))

            if same_model and same_dimension and rows_cover_chunks and self._vectors is not None:
                return

            self._rebuild_embeddings_locked(embedder)

    def _rebuild_embeddings_locked(self, embedder: EmbeddingService) -> None:
        all_chunks: list[Chunk] = [
            chunk
            for document in self._documents.values()
            for chunk in document.chunks
        ]
        if not all_chunks:
            self._vectors = None
            self._rows = []
            self._index = None
            self._embedding_model = embedder.model_name
            self._dimension = embedder.dimension
            self._save_locked()
            return

        vectors, chunk_indices = embedder.embed_chunks(
            [chunk.text for chunk in all_chunks]
        )
        if vectors.shape[0] == 0:
            raise StoreError("Embedding generation returned no vectors.")

        vectors = _normalize_matrix(vectors)
        self._vectors = vectors
        self._rows = [all_chunks[index].id for index in chunk_indices]
        self._embedding_model = embedder.model_name
        self._dimension = int(vectors.shape[1])
        self._rebuild_faiss_locked()
        self._save_locked()

    def add_document(
        self,
        extraction: ExtractionResult,
        text_chunks: list[TextChunk],
        raw_bytes: bytes,
    ) -> dict:
        if not text_chunks:
            raise StoreError("The document did not produce any text chunks.")

        with self._lock:
            if not self.embedder.ready:
                raise StoreError("The embedding model is not ready.")

            document_id = uuid4().hex
            extension = Path(extraction.filename).suffix.lower()
            stored_filename = f"{document_id}{extension}"
            file_path = self.uploads_dir / stored_filename

            chunks = [
                Chunk(
                    id=f"{document_id}:{index}",
                    chunk_index=index,
                    page=chunk.page,
                    text=chunk.text,
                    token_estimate=chunk.token_estimate,
                )
                for index, chunk in enumerate(text_chunks)
            ]
            document = StoredDocument(
                id=document_id,
                filename=extraction.filename,
                stored_filename=stored_filename,
                file_type=extraction.file_type,
                size_bytes=len(raw_bytes),
                pages=extraction.page_count if extraction.file_type == "pdf" else None,
                character_count=extraction.character_count,
                created_at=datetime.now(timezone.utc).isoformat(),
                chunks=chunks,
            )

            vectors, chunk_indices = self.embedder.embed_chunks(
                [chunk.text for chunk in chunks]
            )
            if vectors.shape[0] == 0:
                raise StoreError("Embedding generation returned no vectors.")

            vectors = _normalize_matrix(vectors)
            new_rows = [chunks[index].id for index in chunk_indices]

            previous_vectors = self._vectors
            previous_rows = list(self._rows)
            previous_document = self._documents.get(document_id)
            file_written = False

            try:
                file_path.write_bytes(raw_bytes)
                file_written = True

                self._documents[document_id] = document
                if self._vectors is None or self._vectors.shape[0] == 0:
                    self._vectors = vectors
                else:
                    if self._vectors.shape[1] != vectors.shape[1]:
                        raise StoreError(
                            "The new embeddings use a different dimension than "
                            "the existing index. Re-upload after clearing the library."
                        )
                    self._vectors = np.vstack([self._vectors, vectors])
                self._rows = previous_rows + new_rows
                self._embedding_model = self.embedder.model_name
                self._dimension = int(self._vectors.shape[1])
                self._rebuild_chunk_lookup_locked()
                self._rebuild_faiss_locked()
                self._save_locked()
            except Exception:
                self._vectors = previous_vectors
                self._rows = previous_rows
                if previous_document is None:
                    self._documents.pop(document_id, None)
                else:
                    self._documents[document_id] = previous_document
                self._rebuild_chunk_lookup_locked()
                self._rebuild_faiss_locked()
                if file_written:
                    file_path.unlink(missing_ok=True)
                raise

            return document.summary()

    def delete_document(self, document_id: str) -> bool:
        with self._lock:
            document = self._documents.get(document_id)
            if document is None:
                return False

            chunk_ids = {chunk.id for chunk in document.chunks}
            keep_mask = np.array(
                [chunk_id not in chunk_ids for chunk_id in self._rows],
                dtype=bool,
            )

            if self._vectors is not None and self._vectors.shape[0] == len(self._rows):
                self._vectors = self._vectors[keep_mask]
                if self._vectors.shape[0] == 0:
                    self._vectors = None
            else:
                self._vectors = None

            self._rows = [
                chunk_id
                for chunk_id, keep in zip(self._rows, keep_mask)
                if keep
            ]
            self._documents.pop(document_id, None)
            self._rebuild_chunk_lookup_locked()
            self._rebuild_faiss_locked()
            self._save_locked()

            (self.uploads_dir / document.stored_filename).unlink(missing_ok=True)
            return True

    # ------------------------------------------------------------------ read
    def list_documents(self) -> list[dict]:
        with self._lock:
            documents = sorted(
                self._documents.values(),
                key=lambda item: item.created_at,
                reverse=True,
            )
            return [document.summary() for document in documents]

    def document_count(self) -> int:
        with self._lock:
            return len(self._documents)

    def chunk_count(self) -> int:
        with self._lock:
            return sum(len(document.chunks) for document in self._documents.values())

    def index_vector_count(self) -> int:
        with self._lock:
            return 0 if self._index is None else int(self._index.ntotal)

    def has_document(self, document_id: str) -> bool:
        with self._lock:
            return document_id in self._documents

    def get_document(self, document_id: str) -> StoredDocument | None:
        with self._lock:
            return self._documents.get(document_id)

    def search(
        self,
        query_vector: np.ndarray,
        *,
        document_ids: list[str] | None = None,
        top_k: int = 5,
        threshold: float = 0.2,
    ) -> list[RetrievedChunk]:
        if top_k <= 0 or threshold > 1.0:
            return []

        with self._lock:
            if self._index is None or self._index.ntotal == 0 or self._vectors is None:
                return []

            query = np.asarray(query_vector, dtype=np.float32).reshape(1, -1)
            if query.shape[1] != self._vectors.shape[1]:
                raise StoreError(
                    "The query embedding dimension does not match the index."
                )
            query = _normalize_matrix(query)

            allowed: set[str] | None = set(document_ids) if document_ids is not None else None
            if allowed is not None and not allowed:
                return []

            search_k = int(self._index.ntotal)
            scores, row_ids = self._index.search(np.ascontiguousarray(query), search_k)

            best: dict[str, RetrievedChunk] = {}
            for score, row_id in zip(scores[0], row_ids[0]):
                if row_id < 0 or row_id >= len(self._rows):
                    continue
                if float(score) < threshold:
                    break

                chunk_id = self._rows[int(row_id)]
                found = self._chunk_lookup.get(chunk_id)
                if found is None:
                    continue
                document, chunk = found
                if allowed is not None and document.id not in allowed:
                    continue

                existing = best.get(chunk_id)
                if existing is None or score > existing.score:
                    best[chunk_id] = RetrievedChunk(
                        document=document,
                        chunk=chunk,
                        score=float(score),
                    )

            results = sorted(best.values(), key=lambda item: item.score, reverse=True)
            return results[:top_k]

    def counts(self) -> dict:
        with self._lock:
            return {
                "documents": len(self._documents),
                "chunks": self.chunk_count(),
                "index_vectors": 0 if self._index is None else int(self._index.ntotal),
            }
