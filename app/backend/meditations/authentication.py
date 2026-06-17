from django.contrib.auth.models import User
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

import hashlib
import hmac
import time

from django.conf import settings

TOKEN_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


def make_token(user):
    """Create a simple signed token: user_id:timestamp:signature."""
    ts = str(int(time.time()))
    payload = f"{user.pk}:{ts}"
    sig = hmac.new(
        settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()[:20]
    return f"{payload}:{sig}"


def verify_token(token):
    """Verify token and return user, or None."""
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return None
        user_id, ts, sig = parts
        payload = f"{user_id}:{ts}"
        expected = hmac.new(
            settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()[:20]
        if not hmac.compare_digest(sig, expected):
            return None
        if time.time() - int(ts) > TOKEN_MAX_AGE:
            return None
        return User.objects.select_related("profile").get(pk=int(user_id))
    except (ValueError, User.DoesNotExist):
        return None


class TokenAuthentication(BaseAuthentication):
    """Authenticate via Authorization: Token <token> header."""

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Token "):
            return None
        token = auth_header[6:]
        user = verify_token(token)
        if not user or not user.is_active:
            return None
        return (user, token)
