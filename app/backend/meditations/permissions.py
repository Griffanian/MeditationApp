from rest_framework.permissions import BasePermission

SAFE_METHODS = ("GET", "HEAD", "OPTIONS")


class IsAdmin(BasePermission):
    """Only allow staff (admin) users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class IsAdminOrReadOnly(BasePermission):
    """Any authenticated user may read; only staff may write."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_staff)
