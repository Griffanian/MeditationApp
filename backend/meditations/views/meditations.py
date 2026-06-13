import hashlib
import json
import re
import uuid

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Category, Meditation, Stage
from ..services import storage
from ..services.extract_instructions import extract_instructions


class MeditationListView(APIView):
    def get(self, request):
        meds = []
        for m in Meditation.objects.prefetch_related("stages").order_by("name"):
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
            meds.append({
                "name": m.name,
                "display_name": m.display_name or m.name.capitalize(),
                "category": m.category,
                "stages": stages,
            })
        return Response(meds)

    def post(self, request):
        display_name = (request.data.get("display_name") or "").strip()
        category = (request.data.get("category") or "uncategorised").strip()
        if not display_name:
            return Response({"error": "display_name required"}, status=400)
        med_id = f"med-{uuid.uuid4().hex[:12]}"
        Meditation.objects.create(
            name=med_id, display_name=display_name, category=category,
        )
        return Response({
            "name": med_id,
            "display_name": display_name,
            "category": category,
            "stages": [],
        }, status=201)


class MetaView(APIView):
    def get(self, request, name):
        m = get_object_or_404(Meditation, name=name)
        return Response({
            "display_name": m.display_name,
            "category": m.category,
        })

    def put(self, request, name):
        m, _ = Meditation.objects.get_or_create(name=name)
        if "display_name" in request.data:
            m.display_name = request.data["display_name"]
        if "category" in request.data:
            m.category = request.data["category"]
        m.save()
        return Response({"status": "ok"})

    def delete(self, request, name):
        m = get_object_or_404(Meditation, name=name)
        m.delete()
        return Response({"status": "ok"})


class CategoryListView(APIView):
    def get(self, request):
        return Response([
            {"name": c.name, "display_name": c.display_name, "sort_order": c.sort_order}
            for c in Category.objects.all()
        ])

    def post(self, request):
        display_name = (request.data.get("display_name") or "").strip()
        if not display_name:
            return Response({"error": "display_name required"}, status=400)
        cat_id = f"cat-{uuid.uuid4().hex[:12]}"
        cat = Category.objects.create(
            name=cat_id, display_name=display_name, sort_order=50,
        )
        return Response({
            "name": cat.name, "display_name": cat.display_name,
            "sort_order": cat.sort_order,
        }, status=201)


class CategoryDetailView(APIView):
    def put(self, request, category):
        cat = get_object_or_404(Category, name=category)
        if "display_name" in request.data:
            cat.display_name = request.data["display_name"]
        if "sort_order" in request.data:
            cat.sort_order = request.data["sort_order"]
        cat.save()
        return Response({"status": "ok"})

    def delete(self, request, category):
        cat = get_object_or_404(Category, name=category)
        Meditation.objects.filter(category=category).update(category="uncategorised")
        cat.delete()
        return Response({"status": "ok"})


class InstructionsView(APIView):
    def get(self, request, name):
        m = get_object_or_404(Meditation, name=name)
        instructions = m.instructions or {"description": "", "stages": []}
        return Response(instructions)

    def put(self, request, name):
        m, _ = Meditation.objects.get_or_create(name=name)
        m.instructions = request.data
        m.save()
        return Response({"status": "ok"})


class InstructionsPdfView(APIView):
    def get(self, request, name):
        path = storage.pdf_path(name)
        return Response({"exists": storage.file_exists(path)})

    def post(self, request, name):
        if "file" not in request.FILES:
            return Response({"error": "no file"}, status=400)
        f = request.FILES["file"]
        path = storage.pdf_path(name)
        storage.upload_file(path, f.read(), content_type="application/pdf")
        return Response({"status": "ok"})

    def delete(self, request, name):
        path = storage.pdf_path(name)
        storage.delete_file(path)
        return Response({"status": "ok"})


class LoopsView(APIView):
    def put(self, request, name):
        m = get_object_or_404(Meditation, name=name)
        _apply_loops(m.script, request.data)
        m.save()
        return Response({"status": "ok"})


class ExtractInstructionsView(APIView):
    def post(self, request, name):
        youtube_url = request.data.get("youtube_url")
        try:
            result = extract_instructions(name, youtube_url=youtube_url)
        except FileNotFoundError as e:
            return Response({"error": str(e)}, status=404)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        return Response(result)


def _extract_loops(segments):
    result = []
    for seg in segments:
        if seg.get("type") == "loop":
            result.append({
                "variable": seg.get("variable", ""),
                "displayName": seg.get("variableDisplayName", seg.get("variable", "")),
                "repeat": seg.get("repeat", 1),
                "children": _extract_loops(seg.get("segments", [])),
            })
    return result


def _apply_loops(segments, loop_updates):
    loop_idx = 0
    for seg in segments:
        if seg["type"] == "loop" and loop_idx < len(loop_updates):
            seg["repeat"] = loop_updates[loop_idx].get("repeat", seg["repeat"])
            children = loop_updates[loop_idx].get("children", [])
            if children:
                _apply_loops(seg.get("segments", []), children)
            loop_idx += 1
