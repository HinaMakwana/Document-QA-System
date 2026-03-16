"""
Tests for accounts app.
"""
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            email='user@test.com',
            password='testpass123'
        )
        assert user.email == 'user@test.com'
        assert user.check_password('testpass123')
        assert user.tier == 'free'

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email='admin@test.com',
            password='adminpass123'
        )
        assert admin.is_staff
        assert admin.is_superuser

    def test_token_limits(self):
        user = User.objects.create_user(email='t@t.com', password='p')
        assert user.can_use_tokens(100)
        user.tokens_used_today = user.daily_token_limit
        assert not user.can_use_tokens(1)


@pytest.mark.django_db
class TestAuthAPI:
    def test_register(self, api_client):
        response = api_client.post('/api/v1/auth/register/', {
            'email': 'new@test.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!'
        })
        assert response.status_code == 201

    def test_login(self, api_client, user):
        response = api_client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        assert response.status_code == 200

    def test_profile(self, authenticated_client):
        response = authenticated_client.get('/api/v1/auth/profile/')
        assert response.status_code == 200
