from __future__ import annotations

from uuid import UUID

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.documents.models import Document
from apps.documents.serializers import DocumentSerializer

from .models import Collection
from .serializers import CollectionDocumentSerializer, CollectionSerializer


class CollectionViewSet(viewsets.ModelViewSet):
    serializer_class = CollectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> object:
        return Collection.objects.filter(owner=self.request.user).prefetch_related("documents")

    def perform_create(self, serializer: CollectionSerializer) -> None:
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get"])
    def documents(self, _request: Request, pk: UUID | None = None) -> Response:
        collection = self.get_object()
        return Response(DocumentSerializer(collection.documents.all(), many=True).data)

    @documents.mapping.post
    def add_document(self, request: Request, pk: UUID | None = None) -> Response:
        collection = self.get_object()
        serializer = CollectionDocumentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        collection.documents.add(serializer.validated_data["document_id"])
        return Response(CollectionSerializer(collection).data)

    @documents.mapping.delete
    def remove_document(self, request: Request, pk: UUID | None = None) -> Response:
        collection = self.get_object()
        serializer = CollectionDocumentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        collection.documents.remove(serializer.validated_data["document_id"])
        return Response(status=204)

