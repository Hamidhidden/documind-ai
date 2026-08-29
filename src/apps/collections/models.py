from django.contrib.auth import get_user_model
from django.db import models

from apps.documents.models import Document
from apps.shared.models import TimestampedUUIDModel

User = get_user_model()


class Collection(TimestampedUUIDModel):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="collections")
    name = models.CharField(max_length=120)
    documents = models.ManyToManyField(Document, blank=True, related_name="collections")

    class Meta:
        ordering = ("name",)
        constraints = [
            models.UniqueConstraint(
                fields=("owner", "name"), name="unique_collection_name_per_owner"
            )
        ]
