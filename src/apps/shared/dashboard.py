"""Workspace analytics for the dashboard, always scoped to the requesting user."""

from __future__ import annotations

from collections import Counter
from datetime import timedelta
from pathlib import PurePath

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.collections.models import Collection
from apps.conversations.models import Conversation, Message, MessageRole
from apps.documents.models import Document

ACTIVITY_DAYS = 14
# Citation counts come from recent answers only, which keeps the query cheap.
CITATION_WINDOW = 500


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        user_id = request.user.id
        documents = Document.objects.filter(owner_id=user_id)
        totals = documents.aggregate(
            storage_bytes=Sum("file_size"), pages=Sum("page_count"), words=Sum("word_count")
        )
        by_status = dict(documents.values_list("status").annotate(count=Count("id")))
        by_type = Counter(
            PurePath(name).suffix.lower().lstrip(".") or "other"
            for name in documents.values_list("original_filename", flat=True)
        )

        messages = Message.objects.filter(conversation__owner_id=user_id)
        questions = messages.filter(role=MessageRole.USER)
        answers = messages.filter(role=MessageRole.ASSISTANT)
        unanswered = answers.filter(sources=[])

        since = timezone.now() - timedelta(days=ACTIVITY_DAYS - 1)
        per_day = dict(
            questions.filter(created_at__gte=since)
            .annotate(day=TruncDate("created_at"))
            .values_list("day")
            .annotate(count=Count("id"))
        )
        today = timezone.localdate()
        activity = [
            {"date": day.isoformat(), "questions": per_day.get(day, 0)}
            for day in (
                today - timedelta(days=offset) for offset in range(ACTIVITY_DAYS - 1, -1, -1)
            )
        ]

        cited: Counter[str] = Counter()
        names: dict[str, str] = {}
        for sources in answers.order_by("-created_at").values_list("sources", flat=True)[
            :CITATION_WINDOW
        ]:
            for document_id in {str(source["document_id"]) for source in sources or []}:
                cited[document_id] += 1
            for source in sources or []:
                names[str(source["document_id"])] = str(source["document_name"])
        existing = set(map(str, documents.values_list("id", flat=True)))
        top_documents = [
            {"id": document_id, "filename": names[document_id], "citations": count}
            for document_id, count in cited.most_common(10)
            if document_id in existing
        ][:5]

        gaps = []
        for answer in unanswered.select_related("conversation").order_by("-created_at")[:5]:
            question = (
                questions.filter(
                    conversation=answer.conversation, created_at__lte=answer.created_at
                )
                .order_by("-created_at")
                .first()
            )
            if question:
                gaps.append(
                    {
                        "question": question.content,
                        "conversation_id": str(answer.conversation_id),
                        "asked_at": question.created_at.isoformat(),
                    }
                )

        total_answers = answers.count()
        return Response(
            {
                "documents": {
                    "total": documents.count(),
                    "by_status": by_status,
                    "by_type": dict(by_type.most_common()),
                    "storage_bytes": totals["storage_bytes"] or 0,
                    "pages": totals["pages"] or 0,
                    "words": totals["words"] or 0,
                },
                "collections": Collection.objects.filter(owner_id=user_id).count(),
                "conversations": Conversation.objects.filter(owner_id=user_id).count(),
                "questions": {
                    "total": questions.count(),
                    "answered": total_answers - unanswered.count(),
                    "answer_rate": (
                        round((total_answers - unanswered.count()) / total_answers, 3)
                        if total_answers
                        else None
                    ),
                },
                "activity": activity,
                "top_documents": top_documents,
                "knowledge_gaps": gaps,
            }
        )
