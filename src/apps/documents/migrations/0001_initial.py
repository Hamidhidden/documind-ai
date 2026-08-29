# Generated manually to keep the pgvector extension explicit and reviewable.
import uuid

import django.db.models.deletion
import pgvector.django.vector
from django.conf import settings
from django.db import migrations, models
from pgvector.django import VectorExtension


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        VectorExtension(),
        migrations.CreateModel(
            name="Document",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("file", models.FileField(upload_to="documents/%Y/%m/%d")),
                ("filename", models.CharField(max_length=255)),
                ("original_filename", models.CharField(max_length=255)),
                ("mime_type", models.CharField(max_length=100)),
                ("file_size", models.PositiveBigIntegerField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("UPLOADED", "Uploaded"),
                            ("PROCESSING", "Processing"),
                            ("READY", "Ready"),
                            ("FAILED", "Failed"),
                        ],
                        default="UPLOADED",
                        max_length=16,
                    ),
                ),
                ("page_count", models.PositiveIntegerField(blank=True, null=True)),
                ("word_count", models.PositiveIntegerField(blank=True, null=True)),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                ("error_message", models.CharField(blank=True, max_length=500)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="documents",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ("-created_at",)},
        ),
        migrations.AddIndex(
            model_name="document",
            index=models.Index(fields=["owner", "status"], name="document_owner_status_idx"),
        ),
        migrations.AddIndex(
            model_name="document",
            index=models.Index(fields=["owner", "created_at"], name="document_owner_created_idx"),
        ),
        migrations.CreateModel(
            name="DocumentChunk",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("chunk_index", models.PositiveIntegerField()),
                ("page_number", models.PositiveIntegerField(blank=True, null=True)),
                ("content", models.TextField()),
                ("token_count", models.PositiveIntegerField()),
                (
                    "embedding",
                    pgvector.django.vector.VectorField(
                        blank=True, dimensions=settings.EMBEDDING_DIMENSIONS, null=True
                    ),
                ),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chunks",
                        to="documents.document",
                    ),
                ),
            ],
            options={"ordering": ("document_id", "chunk_index")},
        ),
        migrations.AddConstraint(
            model_name="documentchunk",
            constraint=models.UniqueConstraint(
                fields=("document", "chunk_index"), name="unique_document_chunk_index"
            ),
        ),
        migrations.AddIndex(
            model_name="documentchunk",
            index=models.Index(fields=["document", "chunk_index"], name="chunk_document_index_idx"),
        ),
        migrations.CreateModel(
            name="DocumentProcessingJob",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("task_id", models.CharField(blank=True, max_length=255)),
                ("attempt_count", models.PositiveIntegerField(default=0)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("error_message", models.CharField(blank=True, max_length=500)),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="processing_jobs",
                        to="documents.document",
                    ),
                ),
            ],
            options={"ordering": ("-created_at",)},
        ),
    ]
