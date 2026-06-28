from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Category, Group, Meditation, PendingInvitation, Practice, PracticeSession, StageAssignment, UserProfile, ViewerAccess
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
        """Send an invitation to an existing user to become a viewer."""
        username = request.data.get("username", "").strip()
        if not username:
            return Response({"error": "Username required"}, status=400)

        try:
            viewer_user = User.objects.get(username=username, is_active=True)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if viewer_user == request.user:
            return Response({"error": "Cannot add yourself"}, status=400)

        if ViewerAccess.objects.filter(viewer=viewer_user, builder=request.user).exists():
            return Response({"error": "Already a viewer"}, status=400)

        _, created = PendingInvitation.objects.get_or_create(
            from_user=request.user, to_user=viewer_user
        )
        if not created:
            return Response({"error": "Invitation already sent"}, status=400)

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

        # Stage assignments from this builder
        assignments = StageAssignment.objects.filter(
            viewer=viewer, assigned_by=request.user
        ).select_related("meditation")

        # Look up stage display names from exercise instructions
        stage_results = []
        for a in assignments:
            stage_name = a.stage_id
            instr = a.meditation.instructions or {}
            for s in instr.get("stages", []):
                if s.get("id") == a.stage_id:
                    stage_name = s.get("name", a.stage_id)
                    break
            stage_results.append({
                "meditation": a.meditation_id,
                "meditation_display": a.meditation.display_name or a.meditation_id,
                "stage_id": a.stage_id,
                "stage_name": stage_name,
            })

        return Response({
            "groups": [{"name": g.name, "display_name": g.display_name} for g in shared_groups],
            "categories": [{"name": c.name, "display_name": c.display_name, "group": c.group.display_name if c.group else ""} for c in shared_categories],
            "exercises": [{"name": m.name, "display_name": m.display_name or m.name} for m in shared_meditations],
            "stages": stage_results,
            "programmes": [{"name": p.name, "display_name": p.display_name or p.name} for p in shared_practices],
        })


class MyViewerStageView(APIView):
    """Assign or unassign a stage to a viewer."""
    permission_classes = [IsContentCreator]

    def post(self, request, user_id):
        try:
            viewer = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not ViewerAccess.objects.filter(viewer=viewer, builder=request.user).exists():
            return Response({"error": "Not your viewer"}, status=403)

        meditation_name = request.data.get("meditation", "")
        stage_id = request.data.get("stage_id", "")
        if not meditation_name or not stage_id:
            return Response({"error": "meditation and stage_id required"}, status=400)

        try:
            med = Meditation.objects.get(name=meditation_name)
        except Meditation.DoesNotExist:
            return Response({"error": "Exercise not found"}, status=404)

        _, created = StageAssignment.objects.get_or_create(
            viewer=viewer, meditation=med, stage_id=stage_id,
            defaults={"assigned_by": request.user},
        )
        if not created:
            return Response({"error": "Already assigned"}, status=400)
        return Response({"ok": True}, status=201)

    def delete(self, request, user_id):
        try:
            viewer = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not ViewerAccess.objects.filter(viewer=viewer, builder=request.user).exists():
            return Response({"error": "Not your viewer"}, status=403)

        meditation_name = request.data.get("meditation", "")
        stage_id = request.data.get("stage_id", "")
        deleted, _ = StageAssignment.objects.filter(
            viewer=viewer, meditation_id=meditation_name, stage_id=stage_id,
            assigned_by=request.user,
        ).delete()
        if not deleted:
            return Response({"error": "Not found"}, status=404)
        return Response({"ok": True})


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


class PendingInvitationListView(APIView):
    """List invitations received by the logged-in user."""

    def get(self, request):
        invitations = PendingInvitation.objects.filter(
            to_user=request.user
        ).select_related("from_user", "from_user__profile").order_by("-created_at")

        results = []
        for inv in invitations:
            photo = ""
            try:
                if inv.from_user.profile.profile_photo:
                    photo = storage.file_url(inv.from_user.profile.profile_photo)
            except UserProfile.DoesNotExist:
                pass
            display_name = ""
            try:
                display_name = inv.from_user.profile.display_name
            except UserProfile.DoesNotExist:
                pass
            results.append({
                "id": inv.pk,
                "from_username": inv.from_user.username,
                "from_display_name": display_name or inv.from_user.username,
                "from_profile_photo": photo,
                "created_at": inv.created_at.isoformat(),
            })
        return Response(results)


class PendingInvitationRespondView(APIView):
    """Accept or reject a pending invitation."""

    def post(self, request, invitation_id):
        try:
            inv = PendingInvitation.objects.get(pk=invitation_id, to_user=request.user)
        except PendingInvitation.DoesNotExist:
            return Response({"error": "Invitation not found"}, status=404)

        action = request.data.get("action", "")
        if action not in ("accept", "reject"):
            return Response({"error": "action must be 'accept' or 'reject'"}, status=400)

        if action == "accept":
            ViewerAccess.objects.get_or_create(
                viewer=request.user, builder=inv.from_user
            )

        inv.delete()
        return Response({"ok": True, "action": action})


class SentInvitationListView(APIView):
    """List pending invitations sent by the logged-in builder."""
    permission_classes = [IsContentCreator]

    def get(self, request):
        invitations = PendingInvitation.objects.filter(
            from_user=request.user
        ).select_related("to_user", "to_user__profile").order_by("-created_at")

        results = []
        for inv in invitations:
            photo = ""
            try:
                if inv.to_user.profile.profile_photo:
                    photo = storage.file_url(inv.to_user.profile.profile_photo)
            except UserProfile.DoesNotExist:
                pass
            results.append({
                "id": inv.pk,
                "username": inv.to_user.username,
                "profile_photo": photo,
                "created_at": inv.created_at.isoformat(),
            })
        return Response(results)


class CancelSentInvitationView(APIView):
    """Cancel a pending invitation sent by the logged-in builder."""
    permission_classes = [IsContentCreator]

    def delete(self, request, invitation_id):
        deleted, _ = PendingInvitation.objects.filter(
            pk=invitation_id, from_user=request.user
        ).delete()
        if not deleted:
            return Response({"error": "Invitation not found"}, status=404)
        return Response({"ok": True})
