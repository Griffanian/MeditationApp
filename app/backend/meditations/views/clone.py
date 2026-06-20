import uuid

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Component, Meditation, Practice, Stage
from ..permissions import CanViewContent, IsContentCreator


class CloneMeditationView(APIView):
    permission_classes = [IsContentCreator]

    def post(self, request, name):
        source = get_object_or_404(Meditation, name=name)
        if not CanViewContent().has_object_permission(request, None, source):
            return Response({"error": "Forbidden"}, status=403)

        # Generate unique slug
        new_name = f"med-{uuid.uuid4().hex[:12]}"
        new_display = f"{source.display_name or source.name} (copy)"

        # Clone meditation
        clone = Meditation.objects.create(
            name=new_name,
            display_name=new_display,
            category="uncategorised",
            instructions=source.instructions,
            script=source.script,
            created_by=request.user,
            is_public=False,
        )

        # Clone stages
        stage_map = {}  # old stage pk -> new stage object
        for stage in source.stages.all():
            new_stage = Stage.objects.create(
                meditation=clone,
                stage_id=stage.stage_id,
                script=stage.script,
                variables=stage.variables,
            )
            stage_map[stage.pk] = new_stage

        # Clone components — reuse same audio_file paths (no storage duplication)
        for comp in source.components.all():
            new_stage = stage_map.get(comp.stage_id) if comp.stage_id else None
            Component.objects.create(
                meditation=clone,
                stage=new_stage,
                seg_id=comp.seg_id,
                text_hash=comp.text_hash,
                timestamps=comp.timestamps,
                trim_meta=comp.trim_meta,
                audio_file=comp.audio_file,
            )

        return Response({
            "name": new_name,
            "display_name": new_display,
            "category": clone.category,
            "group": "",
            "stages": [],
            "created_by": request.user.username,
            "is_public": False,
        }, status=201)


class ClonePracticeView(APIView):
    permission_classes = [IsContentCreator]

    def post(self, request, name):
        source = get_object_or_404(Practice, name=name)
        if not CanViewContent().has_object_permission(request, None, source):
            return Response({"error": "Forbidden"}, status=403)

        new_name = f"prac-{uuid.uuid4().hex[:12]}"
        new_display = f"{source.display_name or source.name} (copy)"

        clone = Practice.objects.create(
            name=new_name,
            display_name=new_display,
            items=source.items,  # JSON references to meditations by slug — stay valid
            created_by=request.user,
            is_public=False,
        )

        return Response({
            "name": new_name,
            "display_name": new_display,
            "items": clone.items or [],
            "created_by": request.user.username,
            "is_public": False,
        }, status=201)
