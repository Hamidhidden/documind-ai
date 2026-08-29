from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from pgvector.django import VectorField

from apps.shared.models import TimestampedUUIDModel

User = get_user_model()


class DocumentStatus(models.TextChoices):
    UPLOADED = "UPLOADED", "Uploaded"
    PROCESSING = "PROCESSING", "Processing"
    READY = "READY", "Ready"
    FAILED = "FAILED", "Failed"


class Document(TimestampedUUIDModel):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="documents")
    file = models.FileField(upload_to="documents/%Y/%m/%d")
    filename = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    file_size = models.PositiveBigIntegerField()
    status = models.CharField(
        max_length=16, choices=DocumentStatus.choices, default=DocumentStatus.UPLOADED
    )
    page_count = models.PositiveIntegerField(null=True, blank=True)
    word_count = models.PositiveIntegerField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("owner", "status"), name="document_owner_status_idx"),
            models.Index(fields=("owner", "created_at"), name="document_owner_created_idx"),
        ]


class DocumentChunk(TimestampedUUIDModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="chunks")
    chunk_index = models.PositiveIntegerField()
    page_number = models.PositiveIntegerField(null=True, blank=True)
    content = models.TextField()
    token_count = models.PositiveIntegerField()
    embedding = VectorField(dimensions=settings.EMBEDDING_DIMENSIONS, null=True, blank=True)

    class Meta:
        ordering = ("document_id", "chunk_index")
        constraints = [
            models.UniqueConstraint(
                fields=("document", "chunk_index"), name="unique_document_chunk_index"
            )
        ]
        indexes = [
            models.Index(fields=("document", "chunk_index"), name="chunk_document_index_idx")
        ]


class DocumentProcessingJob(TimestampedUUIDModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="processing_jobs")
    task_id = models.CharField(max_length=255, blank=True)
    attempt_count = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ("-created_at",)
