from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.conversations.models import Conversation, Message
from apps.conversations.services.rag import RAGAnswer
from apps.documents.models import Document, DocumentChunk, DocumentStatus


def create_ready_document(owner) -> Document:
    document = Document.objects.create(
        owner=owner,
        filename="research.txt",
        original_filename="research.txt",
        mime_type="text/plain",
        file_size=21,
        status=DocumentStatus.READY,
        word_count=4,
        file=SimpleUploadedFile("research.txt", b"secure retrieval matters"),
    )
    DocumentChunk.objects.create(
        document=document,
        chunk_index=0,
        content="Secure retrieval matters for private document systems.",
        token_count=7,
    )
    return document


@pytest.mark.django_db
def test_collections_can_group_only_owned_documents(client_for, user, other_user) -> None:
    owned_document = create_ready_document(user)
    other_document = create_ready_document(other_user)
    created = client_for.post("/api/v1/collections/", {"name": "Research"}, format="json")
    assert created.status_code == 201
    collection_id = created.data["id"]
    added = client_for.post(
        f"/api/v1/collections/{collection_id}/documents/",
        {"document_id": str(owned_document.id)},
        format="json",
    )
    assert added.status_code == 200
    assert added.data["document_count"] == 1
    rejected = client_for.post(
        f"/api/v1/collections/{collection_id}/documents/",
        {"document_id": str(other_document.id)},
        format="json",
    )
    assert rejected.status_code == 400
    assert client_for.get(f"/api/v1/collections/{collection_id}/documents/").data[0]["id"] == str(
        owned_document.id
    )
    assert (
        client_for.delete(
            f"/api/v1/collections/{collection_id}/documents/",
            {"document_id": str(owned_document.id)},
            format="json",
        ).status_code
        == 204
    )


@pytest.mark.django_db
def test_conversation_persists_grounded_answer(client_for, monkeypatch) -> None:
    monkeypatch.setattr(
        "apps.conversations.views.answer_question",
        lambda **_kwargs: RAGAnswer(
            content="Grounded answer.",
            citations=[
                {
                    "document_id": "00000000-0000-0000-0000-000000000001",
                    "document_name": "research.txt",
                    "page": 1,
                    "chunk_id": "00000000-0000-0000-0000-000000000002",
                }
            ],
        ),
    )
    conversation = client_for.post(
        "/api/v1/conversations/", {"title": "New conversation"}, format="json"
    )
    response = client_for.post(
        f"/api/v1/conversations/{conversation.data['id']}/messages/",
        {"content": "What matters?"},
        format="json",
    )
    assert response.status_code == 201
    assert response.data["sources"][0]["document_name"] == "research.txt"
    assert Message.objects.count() == 2
    assert Conversation.objects.get().title == "What matters?"


@pytest.mark.django_db
def test_ready_document_generates_synchronous_summary(client_for, user) -> None:
    document = create_ready_document(user)
    response = client_for.post(
        f"/api/v1/documents/{document.id}/summarize/", {"mode": "key_points"}, format="json"
    )
    assert response.status_code == 201
    assert response.data["status"] == "READY"
    assert "Secure retrieval" in response.data["content"]
