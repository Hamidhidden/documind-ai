from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

logger = logging.getLogger(__name__)


class RequestContextMiddleware:
    """Provides a request id without logging credentials or document bodies."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        started = time.perf_counter()
        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        logger.info(
            "request_complete",
            extra={
                "request_id": request_id,
                "endpoint": request.path,
                "status_code": response.status_code,
                "latency_ms": round((time.perf_counter() - started) * 1000, 2),
                "user_id": getattr(request.user, "id", None),
            },
        )
        return response
