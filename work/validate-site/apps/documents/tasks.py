from __future__ import annotations

from celery import shared_task
from django.utils import timezone

from .models import Document, DocumentProcessingJob, DocumentStatus
from .services.processing import process_document


@shared_task(bind=True, autoretry_for=(OSError, RuntimeError), retry_backoff=True, retry_kwargs={"max_retries": 3})
def process_document_task(self: object, document_id: str) -> None:
    document = Document.objects.get(pk=document_id)
    if document.status == DocumentStatus.READY:
        return
    job, _ = DocumentProcessingJob.objects.get_or_create(document=document, task_id=getattr(self.request, "id", ""))
    job.attempt_count += 1
    job.save(update_fields=["attempt_count", "updated_at"])
    document.status = DocumentStatus.PROCESSING
    document.error_message = ""
    document.save(update_fields=["status", "error_message", "updated_at"])
    try:
        process_document(document)
    except Exception as exc:
        document.status = DocumentStatus.FAILED
        document.error_message = "Document processing failed. Retry the upload or contact support."
        document.save(update_fields=["status", "error_message", "updated_at"])
        job.error_message = str(exc)[:500]
        job.save(update_fields=["error_message", "updated_at"])
        raise
    else:
        job.completed_at = timezone.now()
        job.save(update_fields=["completed_at", "updated_at"])

