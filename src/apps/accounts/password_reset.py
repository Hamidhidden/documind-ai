"""Password reset by email. Requests never reveal whether an address has an account."""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils import translation
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import permissions, serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

User = get_user_model()

SUBJECT = {"fa": "بازیابی رمز عبور داکیومایند", "en": "Reset your DocuMind password"}
BODY = {
    "fa": (
        "سلام {name}،\n\n"
        "برای انتخاب رمز عبور جدید روی پیوند زیر بزنید. این پیوند تا ۳ ساعت معتبر است و فقط "
        "یک بار کار می‌کند:\n\n{link}\n\n"
        "اگر شما درخواست بازیابی رمز نداده‌اید، این ایمیل را نادیده بگیرید؛ رمز فعلی شما "
        "تغییری نمی‌کند."
    ),
    "en": (
        "Hello {name},\n\n"
        "Use the link below to choose a new password. It is valid for 3 hours and works once:"
        "\n\n{link}\n\n"
        "If you did not ask for this, ignore this email; your password stays the same."
    ),
}


def _language() -> str:
    return "fa" if (translation.get_language() or "fa").startswith("fa") else "en"


class ResetRequestSerializer(serializers.Serializer[dict[str, str]]):
    email = serializers.EmailField()


class ResetConfirmSerializer(serializers.Serializer[dict[str, str]]):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "password_reset"

    def post(self, request: Request) -> Response:
        serializer = ResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        language = _language()
        for user in User.objects.filter(
            email__iexact=serializer.validated_data["email"], is_active=True
        ):
            if not user.has_usable_password():
                continue
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_mail(
                SUBJECT[language],
                BODY[language].format(name=user.get_full_name() or user.username, link=link),
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
            )
        # The same answer whether or not the address exists, so accounts cannot be probed.
        return Response({"detail": "If an account uses this email, a reset link is on its way."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "password_reset"

    def post(self, request: Request) -> Response:
        serializer = ResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(data["uid"])))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None
        if user is None or not default_token_generator.check_token(user, data["token"]):
            raise serializers.ValidationError({"token": ["This reset link is invalid or expired."]})
        try:
            validate_password(data["password"], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        user.set_password(data["password"])
        user.save(update_fields=["password"])
        # A reset usually means the old password may be known: sign out every other session.
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
        return Response(status=204)
