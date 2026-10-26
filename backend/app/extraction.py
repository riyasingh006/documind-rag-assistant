from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import pymupdf

from .chunking import normalize_text

DOCUMENT_NOT_TEXT = (
    "No extractable text was found in this PDF. Scanned or image-only PDFs "
    "require OCR, which is not included in this version."
)


class ExtractionError(ValueError):
    """Raised when a file cannot be accepted or read."""


@dataclass(frozen=True)
class ExtractionResult:
    filename: str
    file_type: str
    pages: list[tuple[int | None, str]]
    page_count: int
    character_count: int


def sanitize_filename(filename: str | None) -> str:
    if not filename:
        raise ExtractionError("A filename is required.")
    name = Path(filename.replace("\\", "/")).name.strip()
    name = re.sub(r"[\x00-\x1f\x7f]", "", name)
    if not name or name in {".", ".."}:
        raise ExtractionError("The uploaded filename is invalid.")
    if len(name) > 180:
        stem = Path(name).stem[:150]
        suffix = Path(name).suffix[:20]
        name = f"{stem}{suffix}"
    return name


def file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def _decode_text(data: bytes) -> str:
    if not data:
        raise ExtractionError("The uploaded file is empty.")

    if data.startswith((b"\xff\xfe", b"\xfe\xff")):
        candidates = ("utf-16",)
    else:
        candidates = ("utf-8-sig", "cp1252")

    decoded: str | None = None
    for encoding in candidates:
        try:
            decoded = data.decode(encoding)
            break
        except (UnicodeDecodeError, LookupError):
            continue

    if decoded is None:
        raise ExtractionError("The file could not be decoded as plain text.")

    if "\x00" in decoded:
        raise ExtractionError("The file appears to be binary, not plain text.")

    normalized = normalize_text(decoded)
    if not normalized:
        raise ExtractionError("The uploaded text file is empty.")
    return normalized


def _extract_pdf(data: bytes, max_pages: int) -> tuple[list[tuple[int | None, str]], int]:
    if b"%PDF-" not in data[:1024]:
        raise ExtractionError("The uploaded file is not a valid PDF.")

    try:
        document = pymupdf.open(stream=data, filetype="pdf")
    except Exception as exc:  # pragma: no cover - depends on malformed PDFs
        raise ExtractionError("The PDF could not be opened. It may be corrupted.") from exc

    try:
        if document.needs_pass:
            raise ExtractionError("Password-protected PDFs are not supported.")
        if document.page_count == 0:
            raise ExtractionError("The PDF does not contain any pages.")
        if document.page_count > max_pages:
            raise ExtractionError(
                f"The PDF has {document.page_count} pages, exceeding the "
                f"{max_pages}-page limit."
            )

        pages: list[tuple[int | None, str]] = []
        for page_index in range(document.page_count):
            page = document.load_page(page_index)
            text = normalize_text(page.get_text("text"))
            if text:
                pages.append((page_index + 1, text))

        if not pages:
            raise ExtractionError(DOCUMENT_NOT_TEXT)

        return pages, document.page_count
    finally:
        document.close()


def extract_document(
    data: bytes,
    filename: str,
    *,
    max_pages: int = 500,
) -> ExtractionResult:
    clean_name = sanitize_filename(filename)
    extension = file_extension(clean_name)

    if extension not in {".pdf", ".txt"}:
        raise ExtractionError("Only PDF and TXT files are supported.")
    if not data:
        raise ExtractionError("The uploaded file is empty.")

    if extension == ".pdf":
        pages, page_count = _extract_pdf(data, max_pages)
        file_type = "pdf"
    else:
        text = _decode_text(data)
        pages = [(None, text)]
        page_count = 1
        file_type = "txt"

    character_count = sum(len(text) for _, text in pages)
    if character_count == 0:
        raise ExtractionError("No text content was found in the uploaded file.")

    return ExtractionResult(
        filename=clean_name,
        file_type=file_type,
        pages=pages,
        page_count=page_count,
        character_count=character_count,
    )

