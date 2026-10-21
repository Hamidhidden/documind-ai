"""Which plan applies to a workspace, what it has used, and the checks views call before work."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import cast

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone, translation
from rest_framework.exceptions import APIException
from rest_framework.request import Request

from .license import installed_license
from .models import Subscription, SubscriptionStatus
from .plans import FREE, PLANS, TRIAL, Plan

User = get_user_model()


def workspace_id(request: Request) -> int:
    """The id of the authenticated user, whose workspace the request acts on."""
    return cast(int, request.user.id)


@dataclass(frozen=True)
class EffectivePlan:
    plan: Plan
    source: str  # "license", "subscription", "trial", or "free"
    ends_at: datetime | None


def effective_plan(user_id: int) -> EffectivePlan:
    now = timezone.now()
    license = installed_license()
    if license and not license.expired:
        ends = timezone.make_aware(datetime.combine(license.expires, datetime.max.time()))
        return EffectivePlan(PLANS[license.plan], "license", ends)
    subscription = Subscription.objects.filter(owner_id=user_id).first()
    if (
        subscription
        and subscription.status == SubscriptionStatus.ACTIVE
        and subscription.current_period_end > now
    ):
        return EffectivePlan(
            PLANS[subscription.plan], "subscription", subscription.current_period_end
        )
    joined = User.objects.filter(pk=user_id).values_list("date_joined", flat=True).first()
    if joined and joined + timedelta(days=settings.BILLING_TRIAL_DAYS) > now:
        return EffectivePlan(TRIAL, "trial", joined + timedelta(days=settings.BILLING_TRIAL_DAYS))
    return EffectivePlan(FREE, "free", None)


def month_start() -> datetime:
    return timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


@dataclass(frozen=True)
class Usage:
    documents: int
    storage_bytes: int
    questions_this_month: int


def usage(user_id: int) -> Usage:
    from apps.conversations.models import Message, MessageRole
    from apps.documents.models import Document

    documents = Document.objects.filter(owner_id=user_id)
    return Usage(
        documents=documents.count(),
        storage_bytes=documents.aggregate(total=Sum("file_size"))["total"] or 0,
        questions_this_month=Message.objects.filter(
            conversation__owner_id=user_id, role=MessageRole.USER, created_at__gte=month_start()
        ).count(),
    )


def _message(fa: str, en: str) -> str:
    return fa if (translation.get_language() or "fa").startswith("fa") else en


class PlanRequired(APIException):
    """402: the request needs a higher plan. The client shows an upgrade prompt."""

    status_code = 402
    default_code = "plan_required"

    def __init__(self, reason: str, message: str) -> None:
        super().__init__({"plan": [message], "reason": reason})


def require_feature(user_id: int, feature: str) -> None:
    if not effective_plan(user_id).plan.has(feature):
        raise PlanRequired(
            feature,
            _message(
                "این قابلیت در پلن حرفه‌ای و سازمانی در دسترس است.",
                "This feature is available on the Pro and Enterprise plans.",
            ),
        )


def check_upload(user_id: int, size: int) -> None:
    plan, used = effective_plan(user_id).plan, usage(user_id)
    if plan.max_documents is not None and used.documents >= plan.max_documents:
        raise PlanRequired(
            "max_documents",
            _message(
                f"به سقف {plan.max_documents} سند پلن فعلی رسیده‌اید.",
                f"You have reached your plan's limit of {plan.max_documents} documents.",
            ),
        )
    if (
        plan.max_storage_mb is not None
        and used.storage_bytes + size > plan.max_storage_mb * 1024 * 1024
    ):
        raise PlanRequired(
            "max_storage",
            _message(
                f"فضای ذخیره‌سازی پلن فعلی ({plan.max_storage_mb} مگابایت) پر شده است.",
                f"This upload exceeds your plan's {plan.max_storage_mb} MB of storage.",
            ),
        )


def check_question(user_id: int) -> None:
    plan, used = effective_plan(user_id).plan, usage(user_id)
    if plan.monthly_questions is not None and used.questions_this_month >= plan.monthly_questions:
        raise PlanRequired(
            "monthly_questions",
            _message(
                f"سقف {plan.monthly_questions} پرسش این ماه پر شده است.",
                f"You have used all {plan.monthly_questions} questions for this month.",
            ),
        )


def check_new_seat() -> None:
    """Self-hosted installs are licensed per user; registration stops at the seat count."""
    license = installed_license()
    if license and license.seats is not None and User.objects.count() >= license.seats:
        raise PlanRequired(
            "seats",
            _message(
                "ظرفیت کاربران این مجوز تکمیل شده است. با مدیر سامانه تماس بگیرید.",
                "This license's user seats are all taken. Contact your administrator.",
            ),
        )
