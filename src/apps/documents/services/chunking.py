from __future__ import annotations

from dataclasses import dataclass

from .extraction import ExtractedPage


@dataclass(frozen=True)
class ChunkDraft:
    content: str
    page_number: int | None
    token_count: int


class TextChunker:
    """A deterministic, independently testable word-window chunker."""

    def __init__(self, chunk_size: int, overlap: int) -> None:
        if not 0 <= overlap < chunk_size:
            raise ValueError("overlap must be non-negative and smaller than chunk_size")
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, pages: list[ExtractedPage]) -> list[ChunkDraft]:
        chunks: list[ChunkDraft] = []
        for page in pages:
            words = page.content.split()
            start = 0
            while start < len(words):
                window = words[start : start + self.chunk_size]
                if window:
                    chunks.append(ChunkDraft(" ".join(window), page.page_number, len(window)))
                if start + self.chunk_size >= len(words):
                    break
                start += self.chunk_size - self.overlap
        return chunks
