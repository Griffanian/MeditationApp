from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Category, Group, Meditation, Practice, PracticeSession, UserProfile, ViewerAccess
from ..permissions import IsAdmin, IsContentCreator, get_role
from ..services import storage


class UserListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        """List all users with their roles and viewer-builder links."""
        users = User.objects.select_related("profile").order_by("username")

        # Build viewer -> builder mapping
        viewer_builders = {}
        for va in ViewerAccess.objects.select_related("viewer", "builder").all():
            viewer_builders.setdefault(va.viewer_id, []).append(va.builder.username)

        result = []
        for u in users:
            display_name = ""
            try:
                display_name = u.profile.display_name
            except Exception:
                pass
            result.append({
                "id": u.pk,
                "username": u.username,
                "display_name": display_name or u.username,
                "role": get_role(u),
                "builders": viewer_builders.get(u.pk, []),
                "is_active": u.is_active,
                "date_joined": u.date_joined.isoformat(),
            })
        return Response(result)


class UserRoleView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, user_id):
        """Change a user's role. Syncs is_staff for admin role."""
        try:
            user = User.objects.select_related("profile").get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if user == request.user:
            return Response({"error": "Cannot change your own role"}, status=400)

        new_role = request.data.get("role", "")
        if new_role not in ("admin", "editor", "builder", "viewer"):
            return Response({"error": "Invalid role"}, status=400)

        profile = user.profile
        profile.role = new_role
        profile.save()

        # Sync is_staff
        user.is_staff = (new_role == "admin")
        user.save(update_fields=["is_staff"])

        return Response({
            "ok": True,
            "id": user.pk,
            "username": user.username,
            "role": new_role,
        })


class UserDeleteView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, user_id):
        """Deactivate a user. If builder, also deactivate their viewers."""
        try:
            user = User.objects.select_related("profile").get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if user == request.user:
            return Response({"error": "Cannot deactivate yourself"}, status=400)

        deactivated = [user.pk]
        user.is_active = False
        user.save(update_fields=["is_active"])

        # If builder, deactivate all their viewers too
        if get_role(user) == "builder":
            viewer_ids = ViewerAccess.objects.filter(
                builder=user
            ).values_list("viewer_id", flat=True)
            User.objects.filter(pk__in=viewer_ids).update(is_active=False)
            deactivated.extend(viewer_ids)

        return Response({"ok": True, "deactivated": deactivated})

    def patch(self, request, user_id):
        """Reactivate a user. If builder, also reactivate their viewers."""
        try:
            user = User.objects.select_related("profile").get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        user.is_active = True
        user.save(update_fields=["is_active"])

        reactivated = [user.pk]
        if get_role(user) == "builder":
            viewer_ids = ViewerAccess.objects.filter(
                builder=user
            ).values_list("viewer_id", flat=True)
            User.objects.filter(pk__in=viewer_ids).update(is_active=True)
            reactivated.extend(viewer_ids)

        return Response({"ok": True, "reactivated": reactivated})


class MyViewerListView(APIView):
    permission_classes = [IsContentCreator]

    def get(self, request):
        """List viewers who have access to this builder's content."""
        grants = ViewerAccess.objects.filter(
            builder=request.user
        ).select_related("viewer", "viewer__profile")

        result = []
        for g in grants:
            photo_url = ""
            try:
                if g.viewer.profile.profile_photo:
                    photo_url = storage.file_url(g.viewer.profile.profile_photo)
            except UserProfile.DoesNotExist:
                pass
            result.append({
                "id": g.viewer.pk,
                "username": g.viewer.username,
                "profile_photo": photo_url,
                "show_public": g.show_public,
                "granted_at": g.created_at.isoformat(),
            })
        return Response(result)

    def post(self, request):
        """Add an existing user as a viewer of this builder's content."""
        username = request.data.get("username", "").strip()
        if not username:
            return Response({"error": "Username required"}, status=400)

        try:
            viewer_user = User.objects.get(username=username, is_active=True)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if viewer_user == request.user:
            return Response({"error": "Cannot add yourself"}, status=400)

        _, created = ViewerAccess.objects.get_or_create(
            viewer=viewer_user, builder=request.user
        )
        if not created:
            return Response({"error": "Already a viewer"}, status=400)

        return Response({"ok": True, "username": username}, status=201)


class MyViewerDetailView(APIView):
    permission_classes = [IsContentCreator]

    def patch(self, request, user_id):
        """Update viewer settings (e.g. show_public)."""
        try:
            grant = ViewerAccess.objects.get(viewer_id=user_id, builder=request.user)
        except ViewerAccess.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if "show_public" in request.data:
            grant.show_public = bool(request.data["show_public"])
            grant.save(update_fields=["show_public"])
        return Response({"ok": True})

    def delete(self, request, user_id):
        """Remove a viewer's access to this builder's content."""
        deleted, _ = ViewerAccess.objects.filter(
            viewer_id=user_id, builder=request.user
        ).delete()
        if not deleted:
            return Response({"error": "Not found"}, status=404)
        return Response({"ok": True})


class MyViewerContentView(APIView):
    permission_classes = [IsContentCreator]

    def get(self, request, user_id):
        """Return what content a specific viewer has access to from this builder."""
        try:
            viewer = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        # Check this viewer is linked to the requesting builder
        if not ViewerAccess.objects.filter(viewer=viewer, builder=request.user).exists():
            return Response({"error": "Not your viewer"}, status=403)

        # Groups shared with this viewer (owned by this builder)
        shared_groups = Group.objects.filter(
            created_by=request.user, shared_with=viewer
        )
        # Categories shared with this viewer
        shared_categories = Category.objects.filter(
            shared_with=viewer
        ).select_related("group")
        # Exercises shared with this viewer (owned by this builder)
        shared_meditations = Meditation.objects.filter(
            created_by=request.user, shared_with=viewer
        )
        # Programmes shared with this viewer (owned by this builder)
        shared_practices = Practice.objects.filter(
            created_by=request.user, shared_with=viewer
        )

        return Response({
            "groups": [{"name": g.name, "display_name": g.display_name} for g in shared_groups],
            "categories": [{"name": c.name, "display_name": c.display_name, "group": c.group.display_name if c.group else ""} for c in shared_categories],
            "exercises": [{"name": m.name, "display_name": m.display_name or m.name} for m in shared_meditations],
            "programmes": [{"name": p.name, "display_name": p.display_name or p.name} for p in shared_practices],
        })


class MyViewerHistoryView(APIView):
    permission_classes = [IsContentCreator]

    def get(self, request, user_id):
        """Return a viewer's practice history."""
        from .history import _serialize_sessions

        try:
            viewer = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if not ViewerAccess.objects.filter(viewer=viewer, builder=request.user).exists():
            return Response({"error": "Not your viewer"}, status=403)

        sessions = list(PracticeSession.objects.filter(
            user=viewer
        ).select_related("practice")[:200])
        return Response(_serialize_sessions(sessions))
