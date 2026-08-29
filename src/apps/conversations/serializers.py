from __future__ import annotations

from typing import cast
from uuid import UUID

from rest_framework import serializers

from apps.documents.models import Document

from .models import Conversation, DocumentSummary, Message


class MessageSerializer(serializers.ModelSerializer[Message]):
    class Meta:
        model = Message
        fields = ("id", "role", "content", "sources", "created_at")
        read_only_fields = fields


class SendMessageSerializer(serializers.Serializer[dict[str, str]]):
    content = serializers.CharField(max_length=4000, trim_whitespace=True)


class ConversationSerializer(serializers.ModelSerializer[Conversation]):
    document_id = serializers.UUIDField(required=False, allow_null=True)
    message_count = serializers.IntegerField(source="messages.count", read_only=True)

    class Meta:
        model = Conversation
        fields = ("id", "title", "document_id", "message_count", "created_at", "updated_at")
        read_only_fields = ("id", "message_count", "created_at", "updated_at")

    def validate_document_id(self, value: UUID | None) -> UUID | None:
        if value is None:
            return value
        user = self.context["request"].user
        if not Document.objects.filter(pk=value, owner=user).exists():
            raise serializers.ValidationError("Document not found.")
        return value

    def create(self, validated_data: dict[str, object]) -> Conversation:
        document_id = cast(UUID | None, validated_data.pop("document_id", None))
        return Conversation.objects.create(
            owner=self.context["request"].user,
            document_id=document_id,
            **validated_data,
        )


class ConversationDetailSerializer(ConversationSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationSerializer.Meta):
        fields = (*ConversationSerializer.Meta.fields, "messages")  # type: ignore[assignment]


class SummarySerializer(serializers.ModelSerializer[DocumentSummary]):
    class Meta:
        model = DocumentSummary
        fields = (
            "id",
            "document",
            "mode",
            "status",
            "content",
            "error_message",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
