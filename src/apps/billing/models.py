from django.contrib.auth import get_user_model
from django.db import models

from apps.shared.models import TimestampedUUIDModel

User = get_user_model()


class SubscriptionStatus(models.TextChoices):
    TRIALING = "trialing", "Trialing"
    ACTIVE = "active", "Active"
    EXPIRED = "expired", "Expired"


class Subscription(TimestampedUUIDModel):
    """A workspace's paid plan. Without one, the workspace is on its trial or the free plan."""

    owner = models.OneToOneField(User, on_delete=models.CASCADE, related_name="subscription")
    plan = models.CharField(max_length=20)
    interval = models.CharField(max_length=10)
    status = models.CharField(
        max_length=10, choices=SubscriptionStatus.choices, default=SubscriptionStatus.ACTIVE
    )
    current_period_end = models.DateTimeField()


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"


class Payment(TimestampedUUIDModel):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payments")
    plan = models.CharField(max_length=20)
    interval = models.CharField(max_length=10)
    amount_toman = models.PositiveBigIntegerField()
    gateway = models.CharField(max_length=20)
    authority = models.CharField(max_length=100, unique=True)
    status = models.CharField(
        max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    reference_id = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ("-created_at",)
