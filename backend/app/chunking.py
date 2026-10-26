from __future__ import annotations

import re
from dataclasses import dataclass

TOKEN_PATTERN = re.compile(r"\w+|[^\w\s]", re.UNICODE)


@dataclass(frozen=True)
class TextChunk:
    text: str
    page: int | None
    token_estimate: int


def count_tokens(text: str) -> int:
    """Approximate token count with a word/punctuation tokenizer.

    This is intentionally tokenizer-agnostic and deterministic. The embedding
    model applies its own subword tokenizer for windowing.
    """
    return len(TOKEN_PATTERN.findall(text))


def normalize_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\t", " ")
    lines = [line.rstrip() for line in text.split("\n")]
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(
    text: str,
    chunk_size: int = 800,
    overlap: int = 120,
    page: int | None = None,
) -> list[TextChunk]:
    """Split text into overlapping token windows.

    Boundaries are expanded to whitespace where possible so chunks stay
    readable. ``chunk_size`` and ``overlap`` are measured in approximate tokens.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")
    if overlap < 0:
        raise ValueError("overlap cannot be negative.")
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size.")

    cleaned = normalize_text(text)
    if not cleaned:
        return []

    tokens = list(TOKEN_PATTERN.finditer(cleaned))
    if not tokens:
        return []
    if len(tokens) <= chunk_size:
        return [TextChunk(text=cleaned, page=page, token_estimate=len(tokens))]

    chunks: list[TextChunk] = []
    start = 0
    total = len(tokens)
    step_overlap = min(overlap, chunk_size // 2)

    while start < total:
        end = min(start + chunk_size, total)
        char_start = tokens[start].start()
        char_end = tokens[end - 1].end()
        window = cleaned[char_start:char_end].strip()

        if window:
            chunks.append(
                TextChunk(
                    text=window,
                    page=page,
                    token_estimate=end - start,
                )
            )

        if end >= total:
            break

        next_start = end - step_overlap
        if next_start <= start:
            next_start = start + 1
        start = next_start

    return chunks


def chunk_pages(
    pages: list[tuple[int | None, str]],
    chunk_size: int = 800,
    overlap: int = 120,
) -> list[TextChunk]:
    chunks: list[TextChunk] = []
    for page_number, page_text in pages:
        chunks.extend(
            chunk_text(
                page_text,
                chunk_size=chunk_size,
                overlap=overlap,
                page=page_number,
            )
        )
    return chunks
