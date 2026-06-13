import hashlib
import json
import re

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Meditation, Stage
from ..services import storage


class MeditationListView(APIView):
    def get(self, request):
        meds = []
        for m in Meditation.objects.all().order_by("name"):
            loops = _extract_loops(m.script)
            meds.append({
                "name": m.name,
                "display_name": m.display_name or m.name.capitalize(),
                "category": m.category,
                "loops": loops,
            })
        return Response(meds)


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
