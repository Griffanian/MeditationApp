from django.db.models import Q
from rest_framework.permissions import BasePermission

SAFE_METHODS = ("GET", "HEAD", "OPTIONS")


def get_role(user):
    """Return the user's role string, or None if not authenticated."""
    if not user or not user.is_authenticated:
        return None
    try:
        return user.profile.role
    except Exception:
        return "viewer"


def visible_qs(queryset, user):
    """Filter a Meditation or Practice queryset to what this user can see."""
    from .models import Category, Group

    role = get_role(user)
    if role in ("admin", "editor"):
        return queryset
    if role == "builder":
        return queryset.filter(Q(is_public=True) | Q(created_by=user))

    # viewer: public + directly shared + in shared category/group
    from .models import Practice

    q = Q(is_public=True) | Q(shared_with=user)

    # Check if this is a Meditation queryset (has 'category' field)
    model = queryset.model
    if hasattr(model, 'category'):
        shared_cat_names = Category.objects.filter(
            shared_with=user
        ).values_list("name", flat=True)
        shared_group_cat_names = Category.objects.filter(
            group__shared_with=user
        ).values_list("name", flat=True)
        q = q | Q(category__in=shared_cat_names) | Q(category__in=shared_group_cat_names)

        # Include exercises that belong to a shared programme
        shared_med_names = set()
        for items in Practice.objects.filter(
            shared_with=user
        ).values_list("items", flat=True):
            for item in (items or []):
                if "meditation" in item:
                    shared_med_names.add(item["meditation"])
        if shared_med_names:
            q = q | Q(name__in=shared_med_names)

    return queryset.filter(q).distinct()


class IsAdmin(BasePermission):
    """Only allow admin users."""

    def has_permission(self, request, view):
        return get_role(request.user) == "admin"


class IsAdminOrEditor(BasePermission):
    """Allow admin and editor users."""

    def has_permission(self, request, view):
        return get_role(request.user) in ("admin", "editor")


class IsAdminOrReadOnly(BasePermission):
    """Admin/editor can write; any authenticated user can read."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return get_role(request.user) in ("admin", "editor")


class IsContentCreator(BasePermission):
    """Allow admin, editor, and builder to create content."""

    def has_permission(self, request, view):
        return get_role(request.user) in ("admin", "editor", "builder")


class CanViewContent(BasePermission):
    """Object-level: can this user view this content item?"""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        from .models import Category, Group, Practice

        role = get_role(request.user)
        if role in ("admin", "editor"):
            return True
        if role == "builder":
            return obj.is_public or obj.created_by == request.user
        # viewer: public, directly shared, or via shared category/group
        if obj.is_public:
            return True
        if obj.shared_with.filter(pk=request.user.pk).exists():
            return True
        # Check category/group sharing for meditations
        if hasattr(obj, 'category') and obj.category:
            cat = Category.objects.filter(name=obj.category).first()
            if cat:
                if cat.shared_with.filter(pk=request.user.pk).exists():
                    return True
                if cat.group and cat.group.shared_with.filter(pk=request.user.pk).exists():
                    return True
        # Check if exercise belongs to a shared programme
        if hasattr(obj, 'category'):
            for practice in Practice.objects.filter(shared_with=request.user):
                for item in (practice.items or []):
                    if item.get("meditation") == obj.name:
                        return True
        return False


class CanEditContent(BasePermission):
    """Object-level: can this user edit/delete this content item?"""

    def has_permission(self, request, view):
        return get_role(request.user) in ("admin", "editor", "builder")

    def has_object_permission(self, request, view, obj):
        role = get_role(request.user)
        if role in ("admin", "editor"):
            return True
        # builder can only edit own content
        return obj.created_by == request.user
