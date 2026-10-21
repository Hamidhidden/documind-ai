from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.billing import license as licensing
from apps.billing.models import Payment, PaymentStatus, Subscription
from apps.billing.plans import FREE, PRO
from apps.billing.services import effective_plan
from apps.documents.models import (
    Document,
    DocumentChunk,
    DocumentInsight,
    DocumentStatus,
    InsightStatus,
)
from apps.documents.services.insights import _merge
from apps.documents.tasks import generate_insights_task
from apps.shared.jalali import jalali_to_gregorian, parse_iso_date


def end_trial(user) -> None:
    user.date_joined = timezone.now() - timedelta(days=30)
    user.save(update_fields=["date_joined"])


def ready_document(owner, text: str = "Rent is 50 million toman.", name: str = "lease.txt"):
    document = Document.objects.create(
        owner=owner,
        filename=name,
        original_filename=name,
        mime_type="text/plain",
        file_size=len(text),
        status=DocumentStatus.READY,
        file=SimpleUploadedFile(name, text.encode()),
    )
    DocumentChunk.objects.create(document=document, chunk_index=0, content=text, token_count=5)
    return document


# Plans


@pytest.mark.django_db
def test_new_workspace_is_on_trial_then_falls_back_to_free(user) -> None:
    assert effective_plan(user.id).source == "trial"
    assert effective_plan(user.id).plan == PRO
    end_trial(user)
    assert effective_plan(user.id).plan == FREE


@pytest.mark.django_db
def test_active_subscription_beats_free(user) -> None:
    end_trial(user)
    Subscription.objects.create(
        owner=user,
        plan="pro",
        interval="monthly",
        current_period_end=timezone.now() + timedelta(days=3),
    )
    assert effective_plan(user.id).source == "subscription"


@pytest.mark.django_db
def test_free_plan_blocks_premium_features_with_402(client_for, user) -> None:
    end_trial(user)
    document = ready_document(user)
    summary = client_for.post(
        f"/api/v1/documents/{document.id}/summarize/", {"mode": "executive"}, format="json"
    )
    assert summary.status_code == 402
    assert summary.data["error"]["details"]["reason"] == "advanced_summaries"
    assert client_for.post(f"/api/v1/documents/{document.id}/insights/").status_code == 402
    assert client_for.get("/api/v1/radar/").data["locked"] is True
    dashboard = client_for.get("/api/v1/dashboard/").data
    assert dashboard["knowledge_gaps_locked"] is True


@pytest.mark.django_db
def test_free_plan_document_limit(client_for, user, settings) -> None:
    end_trial(user)
    for index in range(FREE.max_documents):
        ready_document(user, name=f"doc{index}.txt")
    upload = SimpleUploadedFile("one-more.txt", b"text", content_type="text/plain")
    response = client_for.post("/api/v1/documents/", {"file": upload}, format="multipart")
    assert response.status_code == 402
    assert response.data["error"]["details"]["reason"] == "max_documents"


# Licenses


@pytest.fixture
def keys():
    return licensing.generate_keypair()


def test_license_round_trip_and_tampering(keys) -> None:
    private, public = keys
    token = licensing.issue(
        private, customer="هلدینگ نمونه", plan="enterprise", seats=50, expires=date(2027, 3, 20)
    )
    verified = licensing.verify(token, public)
    assert (verified.customer, verified.plan, verified.seats) == ("هلدینگ نمونه", "enterprise", 50)
    payload, signature = token.split(".")
    forged = licensing._b64encode(licensing._b64decode(payload).replace(b"50", b"99"))
    with pytest.raises(licensing.InvalidLicense):
        licensing.verify(f"{forged}.{signature}", public)
    with pytest.raises(licensing.InvalidLicense):
        licensing.verify(token, licensing.generate_keypair()[1])


@pytest.mark.django_db
def test_license_sets_plan_and_limits_seats(keys, settings, user) -> None:
    private, public = keys
    end_trial(user)
    settings.DOCUMIND_LICENSE_PUBLIC_KEY = public
    settings.DOCUMIND_LICENSE = licensing.issue(
        private, customer="Holding", plan="enterprise", seats=1, expires=date.today() + timedelta(1)
    )
    assert effective_plan(user.id).source == "license"
    response = APIClient().post(
        "/api/v1/auth/register/",
        {
            "username": "second",
            "email": "s@example.test",
            "password": "SafePass123!",
            "password_confirm": "SafePass123!",
        },
        format="json",
    )
    assert response.status_code == 402
    settings.DOCUMIND_LICENSE = licensing.issue(
        private, customer="Holding", plan="enterprise", seats=1, expires=date.today() - timedelta(1)
    )
    assert effective_plan(user.id).plan == FREE


# Payments


@pytest.mark.django_db
def test_dev_checkout_activates_and_extends_subscription(client_for, user, settings) -> None:
    settings.BILLING_GATEWAY = "dev"
    settings.FRONTEND_URL = "http://app.test"
    end_trial(user)
    for expected_days in (30, 60):
        url = client_for.post(
            "/api/v1/billing/checkout/", {"plan": "pro", "interval": "monthly"}, format="json"
        ).data["payment_url"]
        callback = APIClient().get(url.replace("http://localhost:8000", ""))
        assert callback.status_code == 302
        assert callback["Location"] == "http://app.test/billing?payment=success"
        remaining = Subscription.objects.get(owner=user).current_period_end - timezone.now()
        assert expected_days - 1 <= remaining.days <= expected_days
    assert Payment.objects.filter(status=PaymentStatus.PAID).count() == 2
    assert effective_plan(user.id).source == "subscription"
    # Replaying a paid callback changes nothing.
    APIClient().get(url.replace("http://localhost:8000", ""))
    assert Payment.objects.filter(status=PaymentStatus.PAID).count() == 2


@pytest.mark.django_db
def test_cancelled_payment_does_not_activate(client_for, user, settings) -> None:
    settings.BILLING_GATEWAY = "dev"
    end_trial(user)
    client_for.post(
        "/api/v1/billing/checkout/", {"plan": "pro", "interval": "yearly"}, format="json"
    )
    payment = Payment.objects.get()
    assert payment.amount_toman == settings.BILLING_PRICES_TOMAN["pro"]["yearly"]
    response = APIClient().get(
        f"/api/v1/billing/callback/?Authority={payment.authority}&Status=NOK"
    )
    assert response["Location"].endswith("payment=failed")
    assert not Subscription.objects.exists()


@pytest.mark.django_db
def test_enterprise_and_free_are_not_sold_online(client_for) -> None:
    for plan in ("enterprise", "free"):
        response = client_for.post(
            "/api/v1/billing/checkout/", {"plan": plan, "interval": "monthly"}, format="json"
        )
        assert response.status_code == 400


@pytest.mark.django_db
def test_billing_summary(client_for, user) -> None:
    ready_document(user)
    data = client_for.get("/api/v1/billing/").data
    assert data["source"] == "trial" and data["plan"]["code"] == "pro"
    assert data["usage"]["documents"] == 1
    assert [plan["code"] for plan in data["catalog"]] == ["free", "pro", "enterprise"]


# Calendar


def test_jalali_conversion() -> None:
    assert jalali_to_gregorian(1404, 1, 1) == date(2025, 3, 21)
    assert jalali_to_gregorian(1405, 12, 29) == date(2027, 3, 20)
    assert jalali_to_gregorian(1403, 12, 30) == date(2025, 3, 20)  # leap year
    assert parse_iso_date("۱۴۰۵/۰۷/۲۹", jalali=True) == date(2026, 10, 21)
    assert parse_iso_date("1404-12-30", jalali=True) is None  # not a leap year
    assert parse_iso_date("1404-07-31", jalali=True) is None  # Mehr has 30 days


# Contract radar


def test_merge_cleans_and_deduplicates_model_output() -> None:
    part = {
        "document_type": "contract",
        "dates": [
            {"label": "end", "jalali": "1405-12-29", "kind": "end", "text": "پایان اسفند ۱۴۰۵"},
            {"label": "bad", "jalali": "1405-13-40"},
            "not a dict",
        ],
        "risks": [{"clause": "5", "risk": "penalty", "severity": "critical"}],
        "parties": [{"name": "A"}, {"name": "A"}],
    }
    merged = _merge([part, part])
    assert merged["dates"] == [
        {"label": "end", "text": "پایان اسفند 1405", "kind": "end", "date": "2027-03-20"}
    ]
    assert merged["risks"][0]["severity"] == "medium"
    assert merged["parties"] == [{"name": "A"}]
    assert merged["obligations"] == []


@pytest.mark.django_db
def test_radar_lists_upcoming_deadlines(client_for, user) -> None:
    soon = timezone.localdate() + timedelta(days=10)
    document = ready_document(user, text=f"Lease ends {soon.isoformat()}.")
    DocumentInsight.objects.create(
        document=document,
        status=InsightStatus.READY,
        data={
            "dates": [
                {"label": "end", "kind": "end", "text": "", "date": soon.isoformat()},
                {"label": "old", "kind": "start", "text": "", "date": "2020-01-01"},
            ],
            "risks": [
                {"clause": "a", "severity": "low"},
                {"clause": "b", "severity": "high"},
            ],
        },
    )
    data = client_for.get("/api/v1/radar/").data
    assert data["analyzed"] == 1
    assert [(row["label"], row["days_left"]) for row in data["upcoming"]] == [("end", 10)]
    assert [risk["clause"] for risk in data["risks"]] == ["b", "a"]


@pytest.mark.django_db
def test_insight_task_extracts_with_mock_provider(user, settings) -> None:
    settings.AI_PROVIDER = "mock"
    document = ready_document(user, text="قرارداد اجاره تا 1405/12/29 با اجاره 50 میلیون تومان")
    generate_insights_task.apply(args=[str(document.id)]).get()
    insight = DocumentInsight.objects.get(document=document)
    assert insight.status == InsightStatus.READY
    assert insight.data["document_type"] == "contract"
    assert insight.data["dates"][0]["date"] == "2027-03-20"
    assert insight.data["amounts"][0]["value"] == "50 میلیون تومان"


@pytest.mark.django_db
def test_seat_limit_does_not_apply_without_license() -> None:
    get_user_model().objects.create_user(username="existing", password="x")
    response = APIClient().post(
        "/api/v1/auth/register/",
        {
            "username": "newbie",
            "email": "n@example.test",
            "password": "SafePass123!",
            "password_confirm": "SafePass123!",
        },
        format="json",
    )
    assert response.status_code == 201


def test_written_date_wins_over_model_conversion_and_kind_is_inferred() -> None:
    # Seen with qwen2.5:7b: correct text, wrong self-made Gregorian conversion, kind "other".
    merged = _merge(
        [
            {
                "dates": [
                    {
                        "label": "پرداخت قسط اول",
                        "text": "۱۴۰۵/۰۸/۱۵",
                        "jalali": None,
                        "gregorian": "2026-11-29",
                        "kind": "other",
                    },
                    {"label": "Contract end", "text": "2027-01-31", "kind": ""},
                ]
            }
        ]
    )
    assert [(item["date"], item["kind"]) for item in merged["dates"]] == [
        ("2026-11-06", "payment"),
        ("2027-01-31", "end"),
    ]
