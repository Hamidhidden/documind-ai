import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.mark.django_db
def test_register_creates_hashed_user() -> None:
    response = APIClient().post(
        "/api/v1/auth/register/",
        {
            "username": "new_user",
            "email": "new@example.test",
            "password": "SafePass123!",
            "password_confirm": "SafePass123!",
        },
        format="json",
    )
    assert response.status_code == 201
    user = get_user_model().objects.get(username="new_user")
    assert user.check_password("SafePass123!")


@pytest.mark.django_db
def test_protected_endpoint_rejects_anonymous_users() -> None:
    assert APIClient().get("/api/v1/documents/").status_code == 401


@pytest.mark.django_db
def test_profile_update_and_refresh_logout(client_for, user) -> None:
    profile = client_for.patch(
        "/api/v1/auth/me/",
        {"first_name": "Alice", "email": "updated@example.test"},
        format="json",
    )
    assert profile.status_code == 200
    assert profile.data["first_name"] == "Alice"
    refresh = str(RefreshToken.for_user(user))
    assert (
        client_for.post("/api/v1/auth/logout/", {"refresh": refresh}, format="json").status_code
        == 204
    )


@pytest.mark.django_db
def test_logout_rejects_invalid_refresh_token(client_for) -> None:
    response = client_for.post("/api/v1/auth/logout/", {"refresh": "not-a-token"}, format="json")
    assert response.status_code == 400
