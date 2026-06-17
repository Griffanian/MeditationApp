import uuid

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Meditation, Practice, Stage
from ..permissions import (
    CanEditContent, CanViewContent, IsContentCreator, get_role, visible_qs,
)


def _check_practice_perm(request, name, write=False):
    """Fetch practice and check object-level permission."""
    p = get_object_or_404(Practice, name=name)
    perm = CanEditContent() if write else CanViewContent()
    if not perm.has_object_permission(request, None, p):
        return None, Response({"error": "Forbidden"}, status=403)
    return p, None


def _serialize_practice(p):
    return {
        "name": p.name,
        "display_name": p.display_name or p.name,
        "items": p.items or [],
        "created_by": p.created_by.username if p.created_by else None,
        "created_by_display": p.created_by.profile.name if p.created_by and hasattr(p.created_by, 'profile') else (p.created_by.username if p.created_by else None),
        "is_public": p.is_public,
    }


class PracticeListView(APIView):
    def get(self, request):
        qs = visible_qs(
            Practice.objects.select_related("created_by__profile").order_by("display_name"),
            request.user,
        )
        return Response([_serialize_practice(p) for p in qs])

    def post(self, request):
        if not IsContentCreator().has_permission(request, self):
            return Response({"error": "Forbidden"}, status=403)
        display_name = (request.data.get("display_name") or "").strip()
        if not display_name:
            return Response({"error": "display_name required"}, status=400)
        practice_id = f"prac-{uuid.uuid4().hex[:12]}"
        p = Practice.objects.create(
            name=practice_id, display_name=display_name,
            created_by=request.user,
            is_public=get_role(request.user) in ("admin", "editor"),
        )
        return Response(_serialize_practice(p), status=201)


class PracticeDetailView(APIView):
    def get(self, request, name):
        p, err = _check_practice_perm(request, name)
        if err:
            return err
        return Response(_serialize_practice(p))

    def put(self, request, name):
        p, err = _check_practice_perm(request, name, write=True)
        if err:
            return err
        if "display_name" in request.data:
            p.display_name = request.data["display_name"]
        if "items" in request.data:
            p.items = request.data["items"]
        if "is_public" in request.data:
            p.is_public = request.data["is_public"]
        p.save()
        return Response({"status": "ok"})

    def delete(self, request, name):
        p, err = _check_practice_perm(request, name, write=True)
        if err:
            return err
        p.delete()
        return Response({"status": "ok"})


class PracticeStagesView(APIView):
    """Return all available exercises and their stages for the stage picker."""
    def get(self, request):
        qs = visible_qs(
            Meditation.objects.prefetch_related("stages").select_related("created_by__profile").order_by("display_name"),
            request.user,
        )
        result = []
        for m in qs:
            stage_objs = {s.stage_id: s for s in m.stages.all()}
            instr_stages = (m.instructions or {}).get("stages", [])
            stages = []
            for s in instr_stages:
                stage_id = s.get("id")
                if not stage_id:
                    continue
                stage_obj = stage_objs.get(stage_id)
                variables = stage_obj.variables if stage_obj else {}
                stages.append({
                    "id": stage_id,
                    "name": s.get("name", ""),
                    "variables": variables or {},
                })
            if stages:
                result.append({
                    "name": m.name,
                    "display_name": m.display_name or m.name,
                    "category": m.category,
                    "created_by": m.created_by.username if m.created_by else None,
                    "created_by_display": m.created_by.profile.name if m.created_by and hasattr(m.created_by, 'profile') else None,
                    "is_public": m.is_public,
                    "stages": stages,
                })
        return Response(result)
