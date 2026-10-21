from rest_framework import generics, permissions
from rest_framework.request import Request
from rest_framework.response import Response

from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self) -> object:
        return self.request.user


class LogoutView(generics.GenericAPIView):
    """Blacklist a refresh token; access tokens remain short lived by design."""

    def post(self, request: Request) -> Response:
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import RefreshToken

        token = request.data.get("refresh")
        if not token:
            return Response(
                {"error": {"code": 400, "details": {"refresh": ["Required."]}}}, status=400
            )
        try:
            RefreshToken(token).blacklist()
        except TokenError:
            return Response(
                {"error": {"code": 400, "details": {"refresh": ["Invalid or expired token."]}}},
                status=400,
            )
        return Response(status=204)
