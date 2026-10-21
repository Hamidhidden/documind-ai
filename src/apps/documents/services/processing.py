from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.documents.models import Document, DocumentChunk, DocumentStatus

from .chunking import TextChunker
from .embeddings import embedding_provider
from .extraction import extractor_for, normalize_text


def process_document(document: Document) -> None:
    """Extract, chunk, embed, and atomically replace a document's derived data."""
    pages = extractor_for(document.original_filename).extract(Path(document.file.path))
    normalized_pages = [
        type(page)(content=normalize_text(page.content), page_number=page.page_number)
        for page in pages
        if normalize_text(page.content)
    ]
    chunks = TextChunker(settings.CHUNK_SIZE, settings.CHUNK_OVERLAP).chunk(normalized_pages)
    embeddings = (
        embedding_provider().embed_many([chunk.content for chunk in chunks]) if chunks else []
    )
    with transaction.atomic():
        locked = Document.objects.select_for_update().get(pk=document.pk)
        # Replacing inside one transaction makes Celery retries idempotent.
        locked.chunks.all().delete()
        DocumentChunk.objects.bulk_create(
            [
                DocumentChunk(
                    document=locked,
                    chunk_index=index,
                    page_number=chunk.page_number,
                    content=chunk.content,
                    token_count=chunk.token_count,
                    embedding=embeddings[index],
                )
                for index, chunk in enumerate(chunks)
            ],
            batch_size=250,
        )
        locked.page_count = len(pages) if any(page.page_number for page in pages) else None
        locked.word_count = sum(chunk.token_count for chunk in chunks)
        locked.status = DocumentStatus.READY
        locked.error_message = ""
        locked.processed_at = timezone.now()
        locked.save(
            update_fields=[
                "page_count",
                "word_count",
                "status",
                "error_message",
                "processed_at",
                "updated_at",
            ]
        )
