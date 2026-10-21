"""Payment gateways. Zarinpal for real (and sandbox) payments; `dev` simulates one locally."""

from __future__ import annotations

import json
import urllib.request
import uuid
from abc import ABC, abstractmethod
from collections.abc import Mapping
from urllib.parse import urlencode

from django.conf import settings

from .models import Payment


class GatewayError(RuntimeError):
    pass


class Gateway(ABC):
    name: str

    @abstractmethod
    def start(
        self, payment_amount_toman: int, description: str, callback_url: str
    ) -> tuple[str, str]:
        """Return (authority, URL to send the payer to)."""

    @abstractmethod
    def verify(self, payment: Payment, params: Mapping[str, str]) -> str | None:
        """Return the gateway's reference id when the payment succeeded, otherwise None."""


class DevGateway(Gateway):
    """Local development only: "pays" immediately by redirecting straight to the callback."""

    name = "dev"

    def start(
        self, payment_amount_toman: int, description: str, callback_url: str
    ) -> tuple[str, str]:
        authority = f"DEV-{uuid.uuid4().hex}"
        return authority, f"{callback_url}?{urlencode({'Authority': authority, 'Status': 'OK'})}"

    def verify(self, payment: Payment, params: Mapping[str, str]) -> str | None:
        return f"DEV-REF-{payment.authority[-8:]}" if params.get("Status") == "OK" else None


class ZarinpalGateway(Gateway):
    """Zarinpal payment gateway, REST API v4. Amounts are sent in Rial."""

    name = "zarinpal"

    @property
    def _base(self) -> str:
        host = "sandbox.zarinpal.com" if settings.ZARINPAL_SANDBOX else "payment.zarinpal.com"
        return f"https://{host}/pg"

    def _post(self, path: str, body: dict[str, object]) -> dict[str, object]:
        request = urllib.request.Request(
            f"{self._base}/v4/payment/{path}",
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode())
        except (OSError, ValueError) as exc:
            raise GatewayError("The payment gateway could not be reached.") from exc
        data = payload.get("data")
        return data if isinstance(data, dict) else {}

    def start(
        self, payment_amount_toman: int, description: str, callback_url: str
    ) -> tuple[str, str]:
        if not settings.ZARINPAL_MERCHANT_ID:
            raise GatewayError("ZARINPAL_MERCHANT_ID is not configured.")
        data = self._post(
            "request.json",
            {
                "merchant_id": settings.ZARINPAL_MERCHANT_ID,
                "amount": payment_amount_toman * 10,
                "callback_url": callback_url,
                "description": description,
            },
        )
        if data.get("code") != 100 or not data.get("authority"):
            raise GatewayError("The payment gateway rejected the request.")
        authority = str(data["authority"])
        return authority, f"{self._base}/StartPay/{authority}"

    def verify(self, payment: Payment, params: Mapping[str, str]) -> str | None:
        if params.get("Status") != "OK":
            return None
        data = self._post(
            "verify.json",
            {
                "merchant_id": settings.ZARINPAL_MERCHANT_ID,
                "amount": payment.amount_toman * 10,
                "authority": payment.authority,
            },
        )
        # 100: verified now; 101: already verified (e.g. the payer reloaded the callback).
        return str(data.get("ref_id")) if data.get("code") in (100, 101) else None


def gateway() -> Gateway:
    return ZarinpalGateway() if settings.BILLING_GATEWAY == "zarinpal" else DevGateway()
