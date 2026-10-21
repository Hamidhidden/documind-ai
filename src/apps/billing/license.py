"""Offline licenses for self-hosted installs.

A license is `<base64url payload>.<base64url Ed25519 signature>`. The vendor signs it with a
private key that never ships; installs verify it with the public key in settings, so an
on-premises server needs no connection to a licensing service.
"""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from datetime import date

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
)
from django.conf import settings

from .plans import PLANS


@dataclass(frozen=True)
class License:
    customer: str
    plan: str
    seats: int | None
    expires: date

    @property
    def expired(self) -> bool:
        return self.expires < date.today()


class InvalidLicense(ValueError):
    pass


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _b64decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def generate_keypair() -> tuple[str, str]:
    """Return (private, public) keys as base64 strings."""
    private = Ed25519PrivateKey.generate()
    private_raw = private.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    public_raw = private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    return _b64encode(private_raw), _b64encode(public_raw)


def issue(private_key: str, *, customer: str, plan: str, seats: int | None, expires: date) -> str:
    if plan not in PLANS:
        raise InvalidLicense(f"Unknown plan {plan!r}.")
    payload = json.dumps(
        {"customer": customer, "plan": plan, "seats": seats, "expires": expires.isoformat()},
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode()
    signature = Ed25519PrivateKey.from_private_bytes(_b64decode(private_key)).sign(payload)
    return f"{_b64encode(payload)}.{_b64encode(signature)}"


def verify(token: str, public_key: str) -> License:
    try:
        payload_part, signature_part = token.strip().split(".")
        payload = _b64decode(payload_part)
        Ed25519PublicKey.from_public_bytes(_b64decode(public_key)).verify(
            _b64decode(signature_part), payload
        )
        data = json.loads(payload)
        result = License(
            customer=str(data["customer"]),
            plan=str(data["plan"]),
            seats=data.get("seats"),
            expires=date.fromisoformat(data["expires"]),
        )
    except (ValueError, KeyError, TypeError, InvalidSignature) as exc:
        raise InvalidLicense("The license is not valid for this product.") from exc
    if result.plan not in PLANS:
        raise InvalidLicense(f"Unknown plan {result.plan!r}.")
    return result


def installed_license() -> License | None:
    """The license configured for this install, or None when there is none or it is invalid."""
    if not settings.DOCUMIND_LICENSE or not settings.DOCUMIND_LICENSE_PUBLIC_KEY:
        return None
    try:
        return verify(settings.DOCUMIND_LICENSE, settings.DOCUMIND_LICENSE_PUBLIC_KEY)
    except InvalidLicense:
        return None
