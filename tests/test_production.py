import os
import re
import subprocess
import sys
from pathlib import Path

import pytest
from django.core import mail
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

ROOT = Path(__file__).resolve().parent.parent


def reset_link_parts() -> tuple[str, str]:
    match = re.search(r"reset-password\?uid=([\w-]+)&token=([\w-]+)", mail.outbox[-1].body)
    assert match, mail.outbox[-1].body
    return match.group(1), match.group(2)


@pytest.mark.django_db
def test_password_reset_flow_signs_out_other_sessions(user, settings) -> None:
    settings.FRONTEND_URL = "https://app.test"
    old_refresh = str(RefreshToken.for_user(user))
    client = APIClient()
    response = client.post("/api/v1/auth/password-reset/", {"email": "ALICE@example.test"})
    assert response.status_code == 200
    assert len(mail.outbox) == 1 and mail.outbox[0].to == ["alice@example.test"]
    assert "https://app.test/reset-password?uid=" in mail.outbox[0].body
    uid, token = reset_link_parts()
    confirmed = client.post(
        "/api/v1/auth/password-reset/confirm/",
        {"uid": uid, "token": token, "password": "Brand-New-Pass-42"},
    )
    assert confirmed.status_code == 204
    user.refresh_from_db()
    assert user.check_password("Brand-New-Pass-42")
    assert client.post("/api/v1/auth/refresh/", {"refresh": old_refresh}).status_code == 401
    # The link works once: the token depends on the password hash, which just changed.
    again = client.post(
        "/api/v1/auth/password-reset/confirm/",
        {"uid": uid, "token": token, "password": "Another-Pass-42"},
    )
    assert again.status_code == 400


@pytest.mark.django_db
def test_password_reset_does_not_reveal_unknown_emails(user) -> None:
    client = APIClient()
    known = client.post("/api/v1/auth/password-reset/", {"email": "alice@example.test"})
    unknown = client.post("/api/v1/auth/password-reset/", {"email": "nobody@example.test"})
    assert (known.status_code, known.data) == (unknown.status_code, unknown.data)
    assert len(mail.outbox) == 1


@pytest.mark.django_db
def test_password_reset_rejects_weak_password_and_bad_token(user) -> None:
    client = APIClient()
    client.post("/api/v1/auth/password-reset/", {"email": "alice@example.test"})
    uid, token = reset_link_parts()
    weak = client.post(
        "/api/v1/auth/password-reset/confirm/", {"uid": uid, "token": token, "password": "123"}
    )
    assert weak.status_code == 400
    forged = client.post(
        "/api/v1/auth/password-reset/confirm/",
        {"uid": uid, "token": "forged-token", "password": "Brand-New-Pass-42"},
    )
    assert forged.status_code == 400


@pytest.mark.django_db
def test_login_is_rate_limited(user, monkeypatch) -> None:
    # DRF binds the rates when the throttle class is imported, so patch them directly.
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "login", "3/min")
    client = APIClient()
    statuses = [
        client.post("/api/v1/auth/login/", {"username": "alice", "password": "wrong"}).status_code
        for _ in range(4)
    ]
    assert statuses == [401, 401, 401, 429]


@pytest.mark.django_db
def test_public_plan_list_needs_no_login() -> None:
    data = APIClient().get("/api/v1/billing/plans/").data
    assert [plan["code"] for plan in data["plans"]] == ["free", "pro", "enterprise"]
    assert data["trial_days"] == 14


def _settings_import(**env: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-c", "import django; django.setup()"],
        cwd=ROOT,
        env={
            **os.environ,
            "PYTHONPATH": str(ROOT / "src"),
            "DJANGO_SETTINGS_MODULE": "config.settings",
            "DJANGO_DEBUG": "false",
            **env,
        },
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_production_refuses_the_development_secret_key() -> None:
    result = _settings_import(DJANGO_ENV="production", DJANGO_SECRET_KEY="")
    assert result.returncode != 0
    assert "DJANGO_SECRET_KEY" in result.stderr
    assert _settings_import(DJANGO_ENV="production", DJANGO_SECRET_KEY="x" * 50).returncode == 0
