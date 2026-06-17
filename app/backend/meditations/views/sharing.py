"""Endpoints for builders to share content with specific viewers."""

from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Category, Group, Meditation, Practice
from ..permissions import CanEditContent, IsContentCreator


def _share_view(request, obj):
    """Generic share handler for any model with a shared_with M2M."""
    if request.method == "GET":
        return Response([
            {"id": u.pk, "username": u.username} for u in obj.shared_with.all()
        ])

    if request.method == "POST":
        username = request.data.get("username", "").strip()
        if not username:
            return Response({"error": "username required"}, status=400)
        try:
            viewer = User.objects.get(username=username, is_active=True)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        obj.shared_with.add(viewer)
        return Response({"ok": True}, status=201)

    if request.method == "DELETE":
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id required"}, status=400)
        obj.shared_with.remove(user_id)
        return Response({"ok": True})


class MeditationShareView(APIView):
    permission_classes = [IsContentCreator]

    def _get_obj(self, request, name):
        med = get_object_or_404(Meditation, name=name)
        if not CanEditContent().has_object_permission(request, None, med):
            return None, Response({"error": "Forbidden"}, status=403)
        return med, None

    def get(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)

    def post(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)

    def delete(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)


class PracticeShareView(APIView):
    permission_classes = [IsContentCreator]

    def _get_obj(self, request, name):
        p = get_object_or_404(Practice, name=name)
        if not CanEditContent().has_object_permission(request, None, p):
            return None, Response({"error": "Forbidden"}, status=403)
        return p, None

    def get(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)

    def post(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)

    def delete(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)


class GroupShareView(APIView):
    permission_classes = [IsContentCreator]

    def _get_obj(self, request, name):
        g = get_object_or_404(Group, name=name)
        if g.created_by != request.user and not request.user.is_staff:
            return None, Response({"error": "Forbidden"}, status=403)
        return g, None

    def get(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)

    def post(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)

    def delete(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)


class CategoryShareView(APIView):
    permission_classes = [IsContentCreator]

    def _get_obj(self, request, name):
        c = get_object_or_404(Category, name=name)
        # Check ownership via the group
        if c.group and c.group.created_by != request.user and not request.user.is_staff:
            return None, Response({"error": "Forbidden"}, status=403)
        return c, None

    def get(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)

    def post(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)

    def delete(self, request, name):
        obj, err = self._get_obj(request, name)
        return err or _share_view(request, obj)
