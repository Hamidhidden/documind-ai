from celery import shared_task

from .models import DocumentSummary, SummaryStatus
from .services.rag import summarize_document


@shared_task(
    bind=True,
    autoretry_for=(OSError, RuntimeError),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def generate_summary_task(self: object, summary_id: str) -> None:
    summary = DocumentSummary.objects.select_related("document").get(pk=summary_id)
    try:
        summary.content = summarize_document(summary.document, summary.mode)
        summary.status = SummaryStatus.READY
        summary.error_message = ""
    except Exception:
        summary.status = SummaryStatus.FAILED
        summary.error_message = "Summary generation failed. Please retry."
        summary.save(update_fields=["status", "error_message", "updated_at"])
        raise
    summary.save(update_fields=["content", "status", "error_message", "updated_at"])
