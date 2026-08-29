from __future__ import annotations

from uuid import UUID

from rest_framework import serializers

from apps.documents.models import Document
from apps.documents.serializers import DocumentSerializer

from .models import Collection


class CollectionSerializer(serializers.ModelSerializer[Collection]):
    document_count = serializers.IntegerField(source="documents.count", read_only=True)

    class Meta:
        model = Collection
        fields = ("id", "name", "document_count", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class CollectionDocumentSerializer(serializers.Serializer[dict[str, UUID]]):
    document_id = serializers.UUIDField()

    def validate_document_id(self, value: UUID) -> UUID:
        user = self.context["request"].user
        if not Document.objects.filter(pk=value, owner=user).exists():
            raise serializers.ValidationError("Document not found.")
        return value

