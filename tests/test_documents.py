import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.models import Document, DocumentStatus
from apps.documents.services.chunking import TextChunker
from apps.documents.services.extraction import ExtractedPage
from apps.documents.services.processing import process_document
from apps.documents.tasks import process_document_task


def test_chunker_preserves_overlap_and_page() -> None:
    chunks = TextChunker(chunk_size=4, overlap=1).chunk(
        [ExtractedPage("one two three four five six", 7)]
    )
    assert [chunk.content for chunk in chunks] == ["one two three four", "four five six"]
    assert all(chunk.page_number == 7 for chunk in chunks)


def test_mock_embeddings_are_deterministic(settings) -> None:
    from apps.documents.services.embeddings import MockEmbeddingProvider

    settings.EMBEDDING_DIMENSIONS = 4
    provider = MockEmbeddingProvider()
    assert provider.embed_one("private retrieval") == provider.embed_one("private retrieval")
    assert len(provider.embed_one("private retrieval")) == 4


@pytest.mark.django_db
def test_upload_is_queued_and_scoped_to_owner(
    client_for, monkeypatch, django_capture_on_commit_callbacks
) -> None:
    queued: list[str] = []
    monkeypatch.setattr(
        "apps.documents.views.process_document_task.delay",
        lambda document_id: queued.append(document_id),
    )
    upload = SimpleUploadedFile("notes.txt", b"a brief private note", content_type="text/plain")
    with django_capture_on_commit_callbacks(execute=True):
        response = client_for.post("/api/v1/documents/", {"file": upload}, format="multipart")
    assert response.status_code == 201
    document = Document.objects.get()
    assert document.status == DocumentStatus.UPLOADED
    assert queued == [str(document.id)]


@pytest.mark.django_db
def test_owner_cannot_read_another_users_document(client_for, other_user) -> None:
    document = Document.objects.create(
        owner=other_user,
        filename="secret.txt",
        original_filename="secret.txt",
        mime_type="text/plain",
        file_size=2,
        file=SimpleUploadedFile("secret.txt", b"no"),
    )
    assert client_for.get(f"/api/v1/documents/{document.id}/").status_code == 404


@pytest.mark.django_db
def test_invalid_extension_is_rejected(client_for) -> None:
    response = client_for.post(
        "/api/v1/documents/",
        {"file": SimpleUploadedFile("danger.exe", b"MZ", content_type="application/octet-stream")},
        format="multipart",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_processing_replaces_derived_chunks_idempotently(user, monkeypatch) -> None:
    document = Document.objects.create(
        owner=user,
        filename="brief.txt",
        original_filename="brief.txt",
        mime_type="text/plain",
        file_size=5,
        file=SimpleUploadedFile("brief.txt", b"brief"),
    )

    class Extractor:
        def extract(self, _path):
            return [ExtractedPage("alpha beta gamma", 1)]

    class Embeddings:
        def embed_many(self, values):
            return [[0.0] * 1536 for _ in values]

    monkeypatch.setattr(
        "apps.documents.services.processing.extractor_for", lambda _name: Extractor()
    )
    monkeypatch.setattr(
        "apps.documents.services.processing.embedding_provider", lambda: Embeddings()
    )
    process_document(document)
    document.refresh_from_db()
    assert document.status == DocumentStatus.READY
    assert document.chunks.count() == 1
    process_document(document)
    assert document.chunks.count() == 1


@pytest.mark.django_db
def test_processing_task_tracks_job_and_ready_state(user, monkeypatch) -> None:
    document = Document.objects.create(
        owner=user,
        filename="task.txt",
        original_filename="task.txt",
        mime_type="text/plain",
        file_size=4,
        file=SimpleUploadedFile("task.txt", b"task"),
    )

    def mark_ready(item: Document) -> None:
        item.status = DocumentStatus.READY
        item.save(update_fields=["status", "updated_at"])

    monkeypatch.setattr("apps.documents.tasks.process_document", mark_ready)
    process_document_task.apply(args=[str(document.id)]).get()
    document.refresh_from_db()
    assert document.status == DocumentStatus.READY
    assert document.processing_jobs.count() == 1
