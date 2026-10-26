from __future__ import annotations

import pymupdf
import pytest

from app.extraction import (
    DOCUMENT_NOT_TEXT,
    ExtractionError,
    extract_document,
    file_extension,
    sanitize_filename,
)


def make_pdf(pages: list[str]) -> bytes:
    document = pymupdf.open()
    for content in pages:
        page = document.new_page()
        page.insert_text((72, 72), content, fontsize=11)
    data = document.tobytes()
    document.close()
    return data


def test_sanitize_filename_strips_paths_and_control_characters() -> None:
    assert sanitize_filename("../folder/report.txt") == "report.txt"
    assert sanitize_filename("C:\\Users\\test\\notes.txt") == "notes.txt"
    assert sanitize_filename("bad\x00name.txt") == "badname.txt"


def test_sanitize_filename_rejects_empty_values() -> None:
    for value in (None, "", "   ", ".", ".."):
        with pytest.raises(ExtractionError):
            sanitize_filename(value)


def test_file_extension_is_lowercase() -> None:
    assert file_extension("Report.PDF") == ".pdf"
    assert file_extension("notes.TXT") == ".txt"


def test_extract_utf8_text() -> None:
    result = extract_document("Hello world.\nSecond line.".encode(), "notes.txt")
    assert result.file_type == "txt"
    assert result.filename == "notes.txt"
    assert result.page_count == 1
    assert result.pages == [(None, "Hello world.\nSecond line.")]
    assert result.character_count == len("Hello world.\nSecond line.")


def test_extract_utf16_text() -> None:
    result = extract_document("Unicode café text".encode("utf-16"), "notes.txt")
    assert "café" in result.pages[0][1]


def test_extract_cp1252_text() -> None:
    result = extract_document("Price is 10 €".encode("cp1252"), "notes.txt")
    assert "€" in result.pages[0][1]


def test_rejects_empty_binary_and_unsupported_files() -> None:
    with pytest.raises(ExtractionError, match="empty"):
        extract_document(b"", "empty.txt")

    with pytest.raises(ExtractionError, match="binary"):
        extract_document(b"abc\x00def", "binary.txt")

    with pytest.raises(ExtractionError, match="Only PDF and TXT"):
        extract_document(b"markdown", "notes.md")

    with pytest.raises(ExtractionError, match="not a valid PDF"):
        extract_document(b"not a pdf", "fake.pdf")


def test_extract_pdf_pages_and_page_limit() -> None:
    data = make_pdf(["First page content", "Second page content"])
    result = extract_document(data, "report.pdf", max_pages=2)
    assert result.file_type == "pdf"
    assert result.page_count == 2
    assert [page for page, _ in result.pages] == [1, 2]
    assert "First page" in result.pages[0][1]
    assert "Second page" in result.pages[1][1]

    with pytest.raises(ExtractionError, match="exceeding the 1-page limit"):
        extract_document(data, "report.pdf", max_pages=1)


def test_pdf_without_extractable_text_is_rejected() -> None:
    data = make_pdf([""])
    with pytest.raises(ExtractionError, match=DOCUMENT_NOT_TEXT):
        extract_document(data, "scan.pdf")


def test_text_file_with_only_whitespace_is_rejected() -> None:
    with pytest.raises(ExtractionError, match="text file is empty"):
        extract_document(b"   \n\t  ", "blank.txt")
