import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        username="alice", email="alice@example.test", password="SafePass123!"
    )


@pytest.fixture
def other_user(db):
    return get_user_model().objects.create_user(
        username="bob", email="bob@example.test", password="SafePass123!"
    )


@pytest.fixture
def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client
