from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .gateways import GatewayError, gateway
from .license import installed_license
from .models import Payment, PaymentStatus, Subscription, SubscriptionStatus
from .plans import INTERVALS, PLANS, Plan
from .services import effective_plan, usage, workspace_id

PERIOD_DAYS = {"monthly": 30, "yearly": 365}


def _plan_json(plan: Plan) -> dict[str, object]:
    return {
        "code": plan.code,
        "prices": {interval: plan.price(interval) for interval in INTERVALS},
        "purchasable": plan.purchasable,
        "limits": {
            "documents": plan.max_documents,
            "storage_mb": plan.max_storage_mb,
            "monthly_questions": plan.monthly_questions,
            "seats": plan.seats,
        },
        "features": sorted(plan.features),
    }


class PlansView(APIView):
    """The public price list, for the landing page."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list[type] = []

    def get(self, request: Request) -> Response:
        return Response(
            {
                "plans": [_plan_json(plan) for plan in PLANS.values()],
                "trial_days": settings.BILLING_TRIAL_DAYS,
            }
        )


class BillingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        current = effective_plan(workspace_id(request))
        used = usage(workspace_id(request))
        license = installed_license()
        return Response(
            {
                "plan": _plan_json(current.plan),
                "source": current.source,
                "ends_at": current.ends_at.isoformat() if current.ends_at else None,
                "usage": {
                    "documents": used.documents,
                    "storage_bytes": used.storage_bytes,
                    "questions_this_month": used.questions_this_month,
                },
                "catalog": [_plan_json(plan) for plan in PLANS.values()],
                "license": (
                    {
                        "customer": license.customer,
                        "plan": license.plan,
                        "seats": license.seats,
                        "expires": license.expires.isoformat(),
                        "expired": license.expired,
                    }
                    if license
                    else None
                ),
                "gateway": gateway().name,
                "payments": [
                    {
                        "id": str(payment.id),
                        "plan": payment.plan,
                        "interval": payment.interval,
                        "amount_toman": payment.amount_toman,
                        "status": payment.status,
                        "reference_id": payment.reference_id,
                        "created_at": payment.created_at.isoformat(),
                    }
                    for payment in Payment.objects.filter(owner_id=workspace_id(request))[:10]
                ],
            }
        )


class CheckoutSerializer(serializers.Serializer[dict[str, str]]):
    plan = serializers.ChoiceField(
        choices=[code for code, plan in PLANS.items() if plan.purchasable]
    )
    interval = serializers.ChoiceField(choices=INTERVALS)


class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request) -> Response:
        if installed_license():
            raise ValidationError(
                {"plan": ["This install is licensed; the license sets the plan."]}
            )
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = PLANS[serializer.validated_data["plan"]]
        interval = serializer.validated_data["interval"]
        amount = plan.price(interval)
        if not amount:
            raise ValidationError({"plan": ["This plan is not sold online."]})
        provider = gateway()
        try:
            authority, url = provider.start(
                amount, f"DocuMind {plan.code} ({interval})", settings.BILLING_CALLBACK_URL
            )
        except GatewayError as exc:
            raise ValidationError({"gateway": [str(exc)]}) from exc
        Payment.objects.create(
            owner_id=workspace_id(request),
            plan=plan.code,
            interval=interval,
            amount_toman=amount,
            gateway=provider.name,
            authority=authority,
        )
        return Response({"payment_url": url})


class CallbackView(APIView):
    """Where the gateway sends the payer back. Trust comes from verifying with the gateway."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list[type] = []

    def get(self, request: Request) -> HttpResponseRedirect:
        outcome = "failed"
        payment = Payment.objects.filter(
            authority=request.query_params.get("Authority", "")
        ).first()
        if payment and payment.status == PaymentStatus.PENDING:
            provider = gateway()
            try:
                reference = (
                    provider.verify(payment, request.query_params)
                    if provider.name == payment.gateway
                    else None
                )
            except GatewayError:
                reference = None
            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(pk=payment.pk)
                if payment.status == PaymentStatus.PENDING:
                    payment.status = PaymentStatus.PAID if reference else PaymentStatus.FAILED
                    payment.reference_id = reference or ""
                    payment.save(update_fields=["status", "reference_id", "updated_at"])
                    if reference:
                        _activate(payment)
            outcome = "success" if payment.status == PaymentStatus.PAID else "failed"
        elif payment and payment.status == PaymentStatus.PAID:
            outcome = "success"
        return HttpResponseRedirect(f"{settings.FRONTEND_URL}/billing?payment={outcome}")


def _activate(payment: Payment) -> None:
    """Extend the subscription; paying again before it ends adds to the remaining time."""
    subscription, _ = Subscription.objects.select_for_update().get_or_create(
        owner_id=payment.owner_id,
        defaults={
            "plan": payment.plan,
            "interval": payment.interval,
            "current_period_end": timezone.now(),
        },
    )
    start = max(subscription.current_period_end, timezone.now())
    subscription.plan = payment.plan
    subscription.interval = payment.interval
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.current_period_end = start + timedelta(days=PERIOD_DAYS[payment.interval])
    subscription.save()
