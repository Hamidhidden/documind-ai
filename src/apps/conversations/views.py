from __future__ import annotations

from uuid import UUID

from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from apps.documents.models import Document, DocumentStatus

from .models import Conversation, DocumentSummary, Message, MessageRole, SummaryStatus
from .serializers import (
    ConversationDetailSerializer,
    ConversationSerializer,
    MessageSerializer,
    SendMessageSerializer,
    SummarySerializer,
)
from .services.rag import answer_question, summarize_document
from .tasks import generate_summary_task


class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self) -> object:
        return (
            Conversation.objects.filter(owner=self.request.user)
            .select_related("document")
            .prefetch_related("messages")
        )

    def get_serializer_class(self) -> type[ConversationSerializer]:
        if self.action == "retrieve":
            return ConversationDetailSerializer  # type: ignore[return-value]
        return ConversationSerializer

    def perform_create(self, serializer: ConversationSerializer) -> None:
        serializer.save()

    @action(detail=True, methods=["get", "post"])
    def messages(self, request: Request, pk: UUID | None = None) -> Response:
        conversation = self.get_object()
        if request.method == "GET":
            return Response(MessageSerializer(conversation.messages.all(), many=True).data)
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.validated_data["content"]
        answer = answer_question(
            user_id=request.user.id,
            question=question,
            document_id=conversation.document_id,
        )
        with transaction.atomic():
            Message.objects.create(
                conversation=conversation, role=MessageRole.USER, content=question
            )
            assistant_message = Message.objects.create(
                conversation=conversation,
                role=MessageRole.ASSISTANT,
                content=answer.content,
                sources=answer.citations,
            )
            if conversation.title == "New conversation":
                conversation.title = question[:80]
                conversation.save(update_fields=["title", "updated_at"])
        return Response(MessageSerializer(assistant_message).data, status=status.HTTP_201_CREATED)


class SummaryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SummarySerializer

    def get_queryset(self) -> object:
        return DocumentSummary.objects.filter(document__owner=self.request.user).select_related(
            "document"
        )

    def create_for_document(self, request: Request, document: Document, mode: str) -> Response:
        if document.status != DocumentStatus.READY:
            raise ValidationError("Document must be ready before summarization.")
        if mode not in {"short", "detailed", "key_points", "executive"}:
            raise ValidationError({"mode": "Must be short, detailed, key_points, or executive."})
        summary, created = DocumentSummary.objects.get_or_create(document=document, mode=mode)
        # Regenerate a failed summary, but avoid a duplicate job while pending.
        if not created and summary.status == SummaryStatus.READY:
            return Response(SummarySerializer(summary).data)
        large_document = (document.word_count or 0) > 12_000
        if large_document and not created and summary.status == SummaryStatus.PENDING:
            return Response(SummarySerializer(summary).data, status=status.HTTP_202_ACCEPTED)
        if large_document:
            summary.status = SummaryStatus.PENDING
            summary.save(update_fields=["status", "updated_at"])
            transaction.on_commit(lambda: generate_summary_task.delay(str(summary.id)))
            return Response(SummarySerializer(summary).data, status=status.HTTP_202_ACCEPTED)
        summary.content = summarize_document(document, mode)
        summary.status = SummaryStatus.READY
        summary.error_message = ""
        summary.save(update_fields=["content", "status", "error_message", "updated_at"])
        return Response(SummarySerializer(summary).data, status=status.HTTP_201_CREATED)
