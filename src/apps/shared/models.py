import uuid

from django.db import models


class TimestampedUUIDModel(models.Model):
    """A non-public abstract base with stable UUID public identifiers."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
