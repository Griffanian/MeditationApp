import uuid

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Meditation, Practice, Stage
from ..permissions import IsAdminOrReadOnly


class PracticeListView(APIView):
    permission_classes = [IsAdminOrReadOnly]
    def get(self, request):
        practices = []
        for p in Practice.objects.order_by("display_name"):
            practices.append({
                "name": p.name,
                "display_name": p.display_name or p.name,
                "items": p.items or [],
            })
        return Response(practices)

    def post(self, request):
        display_name = (request.data.get("display_name") or "").strip()
        if not display_name:
            return Response({"error": "display_name required"}, status=400)
        practice_id = f"prac-{uuid.uuid4().hex[:12]}"
        Practice.objects.create(
            name=practice_id, display_name=display_name,
        )
        return Response({
            "name": practice_id,
            "display_name": display_name,
            "items": [],
        }, status=201)


class PracticeDetailView(APIView):
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request, name):
        p = get_object_or_404(Practice, name=name)
        return Response({
            "name": p.name,
            "display_name": p.display_name or p.name,
            "items": p.items or [],
        })

    def put(self, request, name):
        p = get_object_or_404(Practice, name=name)
        if "display_name" in request.data:
            p.display_name = request.data["display_name"]
        if "items" in request.data:
            p.items = request.data["items"]
        p.save()
        return Response({"status": "ok"})

    def delete(self, request, name):
        p = get_object_or_404(Practice, name=name)
        p.delete()
        return Response({"status": "ok"})


class PracticeStagesView(APIView):
    """Return all available exercises and their stages for the stage picker."""
    def get(self, request):
        result = []
        for m in Meditation.objects.prefetch_related("stages").order_by("display_name"):
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
                    "stages": stages,
                })
        return Response(result)
