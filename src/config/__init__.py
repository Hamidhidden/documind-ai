# Load the Celery app whenever Django starts so `shared_task.delay()` uses the configured broker.
from .celery import app as celery_app

__all__ = ("celery_app",)
