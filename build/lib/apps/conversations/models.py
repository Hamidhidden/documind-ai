from django.contrib.auth import get_user_model
from django.db import models

from apps.documents.models import Document
from apps.shared.models import TimestampedUUIDModel

User = get_user_model()


class Conversation(TimestampedUUIDModel):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="conversations")
    title = models.CharField(max_length=160, default="New conversation")
    document = models.ForeignKey(
        Document, null=True, blank=True, on_delete=models.CASCADE, related_name="conversations"
    )

    class Meta:
        ordering = ("-updated_at",)
        indexes = [models.Index(fields=("owner", "updated_at"), name="conversation_owner_updated_idx")]


class MessageRole(models.TextChoices):
    USER = "user", "User"
    ASSISTANT = "assistant", "Assistant"


class Message(TimestampedUUIDModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=12, choices=MessageRole.choices)
    content = models.TextField()
    sources = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ("created_at",)
        indexes = [models.Index(fields=("conversation", "created_at"), name="message_conversation_created_idx")]


class SummaryStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    READY = "READY", "Ready"
    FAILED = "FAILED", "Failed"


class DocumentSummary(TimestampedUUIDModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="summaries")
    mode = models.CharField(max_length=20)
    status = models.CharField(max_length=16, choices=SummaryStatus.choices, default=SummaryStatus.PENDING)
    content = models.TextField(blank=True)
    error_message = models.CharField(max_length=500, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("document", "mode"), name="unique_document_summary_mode")]

