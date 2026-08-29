from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.db.models import QuerySet
from pgvector.django import CosineDistance

from apps.documents.models import DocumentChunk, DocumentStatus

from .embeddings import embedding_provider


@dataclass(frozen=True)
class SearchResult:
    chunk: DocumentChunk
    score: float


def semantic_search(
    *,
    user_id: int,
    query: str,
    limit: int = 5,
    threshold: float = 0.65,
    document_id: UUID | None = None,
    collection_id: UUID | None = None,
) -> list[SearchResult]:
    embedding = embedding_provider().embed_one(query)
    chunks: QuerySet[DocumentChunk] = DocumentChunk.objects.filter(
        document__owner_id=user_id,
        document__status=DocumentStatus.READY,
        embedding__isnull=False,
    ).select_related("document")
    if document_id:
        chunks = chunks.filter(document_id=document_id)
    if collection_id:
        chunks = chunks.filter(document__collections__id=collection_id)
    ranked = chunks.annotate(distance=CosineDistance("embedding", embedding)).filter(
        distance__lte=threshold
    )
    return [
        SearchResult(chunk=item, score=1 - float(item.distance))
        for item in ranked.order_by("distance")[:limit]
    ]


def keyword_search(*, user_id: int, query: str, limit: int = 25) -> QuerySet[DocumentChunk]:
    return (
        DocumentChunk.objects.filter(
            document__owner_id=user_id,
            document__status=DocumentStatus.READY,
            content__icontains=query,
        )
        .select_related("document")
        .order_by("document_id", "chunk_index")[:limit]
    )
