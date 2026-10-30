from __future__ import annotations

import threading

import numpy as np

from .config import Settings


class EmbeddingError(RuntimeError):
    """Raised when the embedding model cannot be used."""


class EmbeddingService:
    """Local sentence-transformers embeddings with safe context windowing.

    all-MiniLM-L6-v2 has a maximum sequence length of 256 tokens. Since
    chunks are larger (default ~800 approximate tokens), each chunk is split
    into overlapping model windows for embedding. Retrieval deduplicates
    window hits back to their parent chunk.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self.model_name = settings.embedding_model
        self.device = settings.embedding_device
        self.dimension: int | None = None
        self.max_seq_length: int | None = None
        self.error: str | None = None

        self._model = None
        self._tokenizer = None
        self._load_lock = threading.Lock()
        self._inference_lock = threading.Lock()

    @property
    def ready(self) -> bool:
        return self._model is not None

    def load(self) -> None:
        with self._load_lock:
            if self._model is not None:
                return

            try:
                from sentence_transformers import SentenceTransformer

                model = SentenceTransformer(
                    self.model_name,
                    device=self.device,
                )

                dimension_getter = getattr(
                    model,
                    "get_embedding_dimension",
                    None,
                ) or getattr(
                    model,
                    "get_sentence_embedding_dimension",
                    None,
                )

                if not callable(dimension_getter):
                    raise EmbeddingError(
                        "The embedding model does not expose its output dimension."
                    )

                dimension = int(dimension_getter())

                max_length = getattr(model, "max_seq_length", None)

                # Publish state only after everything succeeded, and set
                # _model last, so `ready` is never True while dimension is None.
                self._tokenizer = model.tokenizer
                self.dimension = dimension
                self.max_seq_length = int(max_length) if max_length else 256
                self._model = model

                self.error = None

            except Exception as exc:
                self.error = f"{type(exc).__name__}: {exc}"
                self._model = None
                self._tokenizer = None
                self.dimension = None

                raise EmbeddingError(
                    "The embedding model could not be loaded. Check that "
                    "sentence-transformers is installed and the model is "
                    f"available: {self.error}"
                ) from exc

    def _require_model(self):
        if self._model is None:
            self.load()

        if self._model is None:
            raise EmbeddingError(
                "The embedding model is not ready. See the server logs and "
                "/api/health for details."
            )

        return self._model

    def _windows_for_text(self, text: str) -> list[str]:
        self._require_model()

        tokenizer = self._tokenizer
        stripped = text.strip()

        if not stripped:
            return []

        if tokenizer is None:
            return [stripped]

        limit = max(32, (self.max_seq_length or 256) - 4)

        try:
            token_ids = tokenizer.encode(
                stripped,
                add_special_tokens=False,
            )
        except Exception:
            return [stripped]

        if len(token_ids) <= limit:
            return [stripped]

        stride = max(1, int(limit * 0.8))
        windows: list[str] = []
        start = 0

        while start < len(token_ids):
            end = min(start + limit, len(token_ids))
            window_ids = token_ids[start:end]

            if len(window_ids) < 8 and windows:
                break

            window = tokenizer.decode(
                window_ids,
                skip_special_tokens=True,
                clean_up_tokenization_spaces=True,
            ).strip()

            if window:
                windows.append(window)

            if end >= len(token_ids):
                break

            start += stride

        if not windows:
            return [stripped]

        return windows

    def embed_query(self, text: str) -> np.ndarray:
        model = self._require_model()
        cleaned = text.strip()

        if not cleaned:
            raise EmbeddingError("The query is empty.")

        with self._inference_lock:
            vector = model.encode(
                [cleaned],
                batch_size=1,
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )

        return np.asarray(vector, dtype=np.float32)[0]

    def embed_chunks(
        self,
        texts: list[str],
    ) -> tuple[np.ndarray, list[int]]:
        model = self._require_model()

        if not texts:
            dimension = self.dimension or 384
            return np.zeros((0, dimension), dtype=np.float32), []

        window_texts: list[str] = []
        chunk_indices: list[int] = []

        for index, text in enumerate(texts):
            for window in self._windows_for_text(text):
                window_texts.append(window)
                chunk_indices.append(index)

        if not window_texts:
            dimension = self.dimension or 384
            return np.zeros((0, dimension), dtype=np.float32), []

        with self._inference_lock:
            vectors = model.encode(
                window_texts,
                batch_size=self.settings.embedding_batch_size,
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )

        return np.asarray(vectors, dtype=np.float32), chunk_indices
