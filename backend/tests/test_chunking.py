from __future__ import annotations

import pytest

from app.chunking import (
    chunk_pages,
    chunk_text,
    count_tokens,
    normalize_text,
)


def test_count_tokens_and_normalize() -> None:
    assert count_tokens("Hello, world!") == 4
    assert normalize_text("  A\r\n\r\n\r\nB\t C  ") == "A\n\nB  C"


def test_short_text_returns_single_chunk() -> None:
    chunks = chunk_text("A short note about retrieval.", chunk_size=100, overlap=0)
    assert len(chunks) == 1
    assert chunks[0].page is None
    assert chunks[0].text == "A short note about retrieval."
    assert chunks[0].token_estimate == count_tokens(chunks[0].text)


def test_long_text_chunks_overlap_and_cover_end() -> None:
    text = " ".join(f"word{index}" for index in range(300))
    chunks = chunk_text(text, chunk_size=100, overlap=25, page=7)

    assert len(chunks) > 1
    assert all(chunk.page == 7 for chunk in chunks)
    assert all(chunk.token_estimate <= 100 for chunk in chunks)
    assert chunks[-1].text.rstrip().endswith("word299")
    assert chunks[0].text.startswith("word0")
    assert chunks[0].text != chunks[1].text


def test_chunk_boundaries_are_whitespace_readable() -> None:
    text = "Alpha beta gamma. " * 80
    chunks = chunk_text(text, chunk_size=50, overlap=10)
    for chunk in chunks:
        assert not chunk.text.startswith(" ")
        assert not chunk.text.endswith(" ")
        assert "\n\n\n" not in chunk.text


def test_pages_are_chunked_independently() -> None:
    pages = [
        (1, "First page text " * 30),
        (2, "Second page text " * 30),
    ]
    chunks = chunk_pages(pages, chunk_size=50, overlap=5)
    assert {chunk.page for chunk in chunks} == {1, 2}
    assert all(chunk.text for chunk in chunks)


@pytest.mark.parametrize(
    ("chunk_size", "overlap"),
    [(0, 0), (-1, 0), (100, -1), (100, 100), (100, 101)],
)
def test_invalid_chunk_configuration(chunk_size: int, overlap: int) -> None:
    with pytest.raises(ValueError):
        chunk_text("Some text", chunk_size=chunk_size, overlap=overlap)


def test_blank_text_returns_no_chunks() -> None:
    assert chunk_text("   \n\t ") == []
    assert chunk_pages([(1, "   ")]) == []
