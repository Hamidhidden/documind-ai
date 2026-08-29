from django.db import connections
from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def health(_request: object) -> JsonResponse:
    return JsonResponse({"status": "ok"})


@require_GET
def ready(_request: object) -> JsonResponse:
    try:
        connections["default"].cursor().execute("SELECT 1")
    except Exception:
        return JsonResponse({"status": "unavailable"}, status=503)
    return JsonResponse({"status": "ready"})
