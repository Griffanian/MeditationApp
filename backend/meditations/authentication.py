from rest_framework.authentication import BaseAuthentication


class SessionAuthNoCsrf(BaseAuthentication):
    """Read the user from Django's session without enforcing CSRF."""

    def authenticate(self, request):
        user = getattr(request._request, "user", None)
        if not user or not user.is_active:
            return None
        return (user, None)
