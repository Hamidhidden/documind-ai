from __future__ import annotations

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

from docx import Document as DocxDocument
from pypdf import PdfReader


@dataclass(frozen=True)
class ExtractedPage:
    content: str
    page_number: int | None


class DocumentExtractor(ABC):
    @abstractmethod
    def extract(self, path: Path) -> list[ExtractedPage]: ...


class PDFExtractor(DocumentExtractor):
    def extract(self, path: Path) -> list[ExtractedPage]:
        reader = PdfReader(path)
        return [ExtractedPage(page.extract_text() or "", index + 1) for index, page in enumerate(reader.pages)]


class TXTExtractor(DocumentExtractor):
    def extract(self, path: Path) -> list[ExtractedPage]:
        return [ExtractedPage(path.read_text(encoding="utf-8"), None)]


class MarkdownExtractor(TXTExtractor):
    pass


class DOCXExtractor(DocumentExtractor):
    def extract(self, path: Path) -> list[ExtractedPage]:
        document = DocxDocument(path)
        return [ExtractedPage("\n".join(p.text for p in document.paragraphs), None)]


EXTRACTORS: dict[str, DocumentExtractor] = {
    ".pdf": PDFExtractor(),
    ".txt": TXTExtractor(),
    ".md": MarkdownExtractor(),
    ".markdown": MarkdownExtractor(),
    ".docx": DOCXExtractor(),
}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def extractor_for(filename: str) -> DocumentExtractor:
    extension = Path(filename).suffix.lower()
    try:
        return EXTRACTORS[extension]
    except KeyError as exc:
        raise ValueError(f"No extractor for {extension}.") from exc

