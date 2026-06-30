import uuid

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Meditation, Practice, PracticeProgress, Stage
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


def _serialize_progress(progress):
    if not progress:
        return None
    return {
        "completed_days": progress.completed_days or {},
        "current_week": progress.current_week,
        "current_day": progress.current_day,
    }


class PracticeListView(APIView):
    def get(self, request):
        from django.db.models import Q

        qs = visible_qs(
            Practice.objects.select_related("created_by__profile").order_by("display_name"),
            request.user,
        )
        practices = list(qs)
        progress_map = {}
        if request.user.is_authenticated:
            for prog in PracticeProgress.objects.filter(
                user=request.user, practice__in=practices
            ):
                progress_map[prog.practice_id] = prog

        # For viewers, compute which programmes are specifically shared
        is_viewer = get_role(request.user) == "viewer"
        shared_names = set()
        if is_viewer:
            shared_names = set(
                Practice.objects.filter(shared_with=request.user)
                .values_list("name", flat=True)
            )

        result = []
        for p in practices:
            data = _serialize_practice(p)
            data["progress"] = _serialize_progress(progress_map.get(p.name))
            if is_viewer:
                data["shared"] = p.name in shared_names
            result.append(data)
        return Response(result)

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
        data = _serialize_practice(p)
        progress = PracticeProgress.objects.filter(
            user=request.user, practice=p
        ).first()
        data["progress"] = _serialize_progress(progress)
        return Response(data)

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
        from meditations.services.synthesize import compute_variable_mins

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
                # Enrich variables with computed minimums
                if variables:
                    try:
                        mins = compute_variable_mins(m.name, stage_id)
                        if mins:
                            enriched = {}
                            for var_name, var_data in variables.items():
                                entry = dict(var_data) if isinstance(var_data, dict) else {"value": var_data}
                                if var_name in mins:
                                    entry["computed_min"] = mins[var_name]
                                enriched[var_name] = entry
                            variables = enriched
                    except Exception:
                        pass
                stages.append({
                    "id": stage_id,
                    "name": s.get("name", ""),
                    "variables": variables or {},
                    "before_you_begin": stage_obj.before_you_begin if stage_obj else "",
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


class PracticeProgressView(APIView):
    def get(self, request, name):
        p, err = _check_practice_perm(request, name)
        if err:
            return err
        progress = PracticeProgress.objects.filter(
            user=request.user, practice=p
        ).first()
        return Response(_serialize_progress(progress) or {
            "completed_days": {}, "current_week": 0, "current_day": 0,
        })

    def put(self, request, name):
        p, err = _check_practice_perm(request, name)
        if err:
            return err
        progress, _ = PracticeProgress.objects.get_or_create(
            user=request.user, practice=p,
        )
        if "completed_days" in request.data:
            progress.completed_days = request.data["completed_days"]
        if "current_week" in request.data:
            progress.current_week = request.data["current_week"]
        if "current_day" in request.data:
            progress.current_day = request.data["current_day"]
        progress.save()
        return Response({"status": "ok"})
