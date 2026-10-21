from __future__ import annotations

from pathlib import Path
from uuid import UUID

from django.db import transaction
from django.http import FileResponse
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.plans import ADVANCED_SUMMARIES, CONTRACT_RADAR
from apps.billing.services import check_upload, effective_plan, require_feature

from .models import Document, DocumentInsight, DocumentStatus, InsightStatus
from .serializers import (
    ChunkSearchResultSerializer,
    DocumentRenameSerializer,
    DocumentSerializer,
    DocumentUploadSerializer,
)
from .services.insights import upcoming_dates
from .services.search import keyword_search, semantic_search
from .tasks import generate_insights_task, process_document_task


def _insight_json(insight: DocumentInsight | None) -> dict[str, object]:
    if insight is None:
        return {"status": None, "data": None}
    return {
        "status": insight.status,
        "data": insight.data or None,
        "updated_at": insight.updated_at.isoformat(),
    }


class RadarView(APIView):
    """Upcoming deadlines and flagged risks across every analyzed document."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        if not effective_plan(request.user.id).plan.has(CONTRACT_RADAR):
            return Response({"locked": True, "upcoming": [], "risks": [], "analyzed": 0})
        insights = list(
            DocumentInsight.objects.filter(
                document__owner_id=request.user.id, status=InsightStatus.READY
            ).select_related("document")
        )
        pairs = [(insight.document, insight.data) for insight in insights]
        risks = [
            {**risk, "document_id": str(document.id), "document_name": document.filename}
            for document, data in pairs
            for risk in data.get("risks") or []
            if isinstance(risk, dict)
        ]
        order = {"high": 0, "medium": 1, "low": 2}
        return Response(
            {
                "locked": False,
                "upcoming": upcoming_dates(pairs, timezone.localdate()),
                "risks": sorted(risks, key=lambda risk: order.get(str(risk.get("severity")), 1)),
                "analyzed": len(insights),
            }
        )


class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self) -> object:
        queryset = Document.objects.filter(owner=self.request.user).prefetch_related("collections")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def get_serializer_class(self) -> type[DocumentSerializer]:
        if self.action == "create":
            return DocumentUploadSerializer  # type: ignore[return-value]
        if self.action in {"partial_update", "update"}:
            return DocumentRenameSerializer  # type: ignore[return-value]
        return DocumentSerializer

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        check_upload(request.user.id, serializer.validated_data["file"].size or 0)
        with transaction.atomic():
            document = serializer.save()
            transaction.on_commit(lambda: process_document_task.delay(str(document.id)))
        # The upload serializer only accepts the file; respond with the full document.
        return Response(DocumentSerializer(document).data, status=201)

    @action(detail=True, methods=["get"])
    def download(self, _request: Request, pk: UUID | None = None) -> FileResponse:
        document = self.get_object()
        return FileResponse(
            document.file.open("rb"), as_attachment=True, filename=Path(document.filename).name
        )

    @action(detail=True, methods=["get"])
    def processing_status(self, _request: Request, pk: UUID | None = None) -> Response:
        document = self.get_object()
        return Response(
            {
                "id": str(document.id),
                "status": document.status,
                "error_message": document.error_message,
            }
        )

    @action(detail=True, methods=["get", "post"])
    def insights(self, request: Request, pk: UUID | None = None) -> Response:
        """GET the contract-radar analysis; POST to (re)run it. A premium feature."""
        document = self.get_object()
        if request.method == "POST":
            require_feature(request.user.id, CONTRACT_RADAR)
            if document.status != DocumentStatus.READY:
                raise ValidationError("Document must be ready before analysis.")
            insight, _ = DocumentInsight.objects.update_or_create(
                document=document, defaults={"status": InsightStatus.PENDING, "error_message": ""}
            )
            transaction.on_commit(lambda: generate_insights_task.delay(str(document.id)))
            return Response(_insight_json(insight), status=202)
        insight = DocumentInsight.objects.filter(document=document).first()
        return Response(_insight_json(insight))

    @action(detail=True, methods=["post"])
    def summarize(self, request: Request, pk: UUID | None = None) -> Response:
        document = self.get_object()
        if request.data.get("mode", "short") != "short":
            require_feature(request.user.id, ADVANCED_SUMMARIES)
        from apps.conversations.views import SummaryViewSet

        return SummaryViewSet().create_for_document(
            request, document, request.data.get("mode", "short")
        )


class SearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        query = request.query_params.get("q", "").strip()
        if not query:
            raise ValidationError({"q": "A search query is required."})
        mode = request.query_params.get("mode", "semantic")
        try:
            document_id = (
                UUID(request.query_params["document_id"])
                if request.query_params.get("document_id")
                else None
            )
            collection_id = (
                UUID(request.query_params["collection_id"])
                if request.query_params.get("collection_id")
                else None
            )
            limit = min(max(int(request.query_params.get("limit", "5")), 1), 25)
        except ValueError as exc:
            raise ValidationError(
                "document_id and collection_id must be UUIDs and limit must be an integer."
            ) from exc
        if mode == "keyword":
            results = list(keyword_search(user_id=request.user.id, query=query))
            return Response({"results": ChunkSearchResultSerializer(results, many=True).data})
        if mode != "semantic":
            raise ValidationError({"mode": "Must be semantic or keyword."})
        semantic_results = semantic_search(
            user_id=request.user.id,
            query=query,
            document_id=document_id,
            collection_id=collection_id,
            limit=limit,
        )
        serialized = ChunkSearchResultSerializer(
            [result.chunk for result in semantic_results], many=True
        ).data
        for data, result in zip(serialized, semantic_results, strict=True):
            data["score"] = result.score
        return Response({"results": serialized})
