from __future__ import annotations

from rest_framework import serializers

from .models import Document, DocumentChunk
from .services.validation import validate_upload


class DocumentSerializer(serializers.ModelSerializer[Document]):
    class Meta:
        model = Document
        fields = (
            "id", "filename", "original_filename", "mime_type", "file_size", "status", "page_count",
            "word_count", "created_at", "updated_at", "processed_at", "error_message",
        )
        read_only_fields = tuple(fields)


class DocumentUploadSerializer(serializers.ModelSerializer[Document]):
    file = serializers.FileField(write_only=True)

    class Meta:
        model = Document
        fields = ("file",)

    def validate_file(self, value: object) -> object:
        validate_upload(value)  # type: ignore[arg-type]
        return value

    def create(self, validated_data: dict[str, object]) -> Document:
        upload = validated_data["file"]
        original_filename, mime_type = validate_upload(upload)  # type: ignore[arg-type]
        owner = self.context["request"].user
        return Document.objects.create(
            owner=owner,
            file=upload,
            filename=original_filename,
            original_filename=original_filename,
            mime_type=mime_type,
            file_size=upload.size,  # type: ignore[attr-defined]
        )


class DocumentRenameSerializer(serializers.ModelSerializer[Document]):
    class Meta:
        model = Document
        fields = ("filename",)


class ChunkSearchResultSerializer(serializers.ModelSerializer[DocumentChunk]):
    document_id = serializers.UUIDField(source="document.id", read_only=True)
    document_name = serializers.CharField(source="document.filename", read_only=True)

    class Meta:
        model = DocumentChunk
        fields = ("id", "document_id", "document_name", "page_number", "content", "token_count")

