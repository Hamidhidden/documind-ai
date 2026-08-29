import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("documents", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Conversation",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(default="New conversation", max_length=160)),
                (
                    "document",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="conversations",
                        to="documents.document",
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="conversations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ("-updated_at",)},
        ),
        migrations.AddIndex(
            model_name="conversation",
            index=models.Index(
                fields=["owner", "updated_at"], name="conversation_owner_updated_idx"
            ),
        ),
        migrations.CreateModel(
            name="Message",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "role",
                    models.CharField(
                        choices=[("user", "User"), ("assistant", "Assistant")], max_length=12
                    ),
                ),
                ("content", models.TextField()),
                ("sources", models.JSONField(blank=True, default=list)),
                (
                    "conversation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="conversations.conversation",
                    ),
                ),
            ],
            options={"ordering": ("created_at",)},
        ),
        migrations.AddIndex(
            model_name="message",
            index=models.Index(
                fields=["conversation", "created_at"], name="message_conv_created_idx"
            ),
        ),
        migrations.CreateModel(
            name="DocumentSummary",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("mode", models.CharField(max_length=20)),
                (
                    "status",
                    models.CharField(
                        choices=[("PENDING", "Pending"), ("READY", "Ready"), ("FAILED", "Failed")],
                        default="PENDING",
                        max_length=16,
                    ),
                ),
                ("content", models.TextField(blank=True)),
                ("error_message", models.CharField(blank=True, max_length=500)),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="summaries",
                        to="documents.document",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="documentsummary",
            constraint=models.UniqueConstraint(
                fields=("document", "mode"), name="unique_document_summary_mode"
            ),
        ),
    ]
