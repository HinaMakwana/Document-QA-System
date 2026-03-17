"""
Custom API Key authentication backend for DRF.

Usage:
  - Website users authenticate via JWT (Authorization: Bearer <token>)
  - External/programmatic clients authenticate via API key (X-API-Key: <key>)

DRF tries each authentication class in order. If the request carries a JWT
header, JWTAuthentication handles it. If it carries an X-API-Key header,
this class handles it. If neither header is present, the request is
unauthenticated.
"""
import hashlib
import logging

from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger('ai_doc')


class APIKeyAuthentication(BaseAuthentication):
    """
    Authenticate requests using an API key passed in the X-API-Key header.

    The key is hashed with SHA-256 and compared against stored hashes.
    """

    HEADER_NAME = 'HTTP_X_API_KEY'  # Django converts X-API-Key → HTTP_X_API_KEY

    def authenticate(self, request):
        """
        Returns (user, auth_info) if a valid API key is provided,
        or None if no X-API-Key header is present (so DRF falls through
        to the next authentication class).
        """
        raw_key = request.META.get(self.HEADER_NAME)

        if not raw_key:
            # No X-API-Key header — skip this backend, let JWT handle it
            return None

        raw_key = raw_key.strip()
        if not raw_key:
            return None

        # Hash the provided key and look it up
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        from accounts.models import UserAPIKey

        try:
            api_key = UserAPIKey.objects.select_related('user').get(
                key_hash=key_hash,
                is_active=True,
            )
        except UserAPIKey.DoesNotExist:
            raise AuthenticationFailed('Invalid or revoked API key.')

        # Check expiration
        if api_key.expires_at and api_key.expires_at < timezone.now():
            raise AuthenticationFailed('API key has expired.')

        # Check that the owner account is active
        if not api_key.user.is_active:
            raise AuthenticationFailed('User account is disabled.')

        # Update last_used_at timestamp (fire-and-forget, don't block the request)
        UserAPIKey.objects.filter(pk=api_key.pk).update(last_used_at=timezone.now())

        logger.info(
            f"API key authentication successful: key='{api_key.name}' "
            f"user={api_key.user.email}"
        )

        # Return (user, auth_info) — auth_info is available as request.auth
        return (api_key.user, api_key)

    def authenticate_header(self, request):
        """
        Return a string for the WWW-Authenticate header when auth fails.
        This tells the client how to authenticate.
        """
        return 'X-API-Key'
