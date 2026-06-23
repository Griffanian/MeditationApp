import uuid

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Meditation, Practice, SpeechSegmentAudio, Stage, VariableRecording
from ..permissions import CanViewContent, IsContentCreator


class CloneMeditationView(APIView):
    permission_classes = [IsContentCreator]

    def post(self, request, name):
        source = get_object_or_404(Meditation, name=name)
        if not CanViewContent().has_object_permission(request, None, source):
            return Response({"error": "Forbidden"}, status=403)

        new_name = f"med-{uuid.uuid4().hex[:12]}"
        new_display = f"{source.display_name or source.name} (copy)"

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

        # Clone SpeechSegmentAudio — shares GeneratedVoiceClip FKs (no storage duplication)
        for ssa in SpeechSegmentAudio.objects.filter(meditation=source).select_related("stage"):
            new_stage = stage_map.get(ssa.stage_id) if ssa.stage_id else None
            SpeechSegmentAudio.objects.create(
                meditation=clone,
                stage=new_stage,
                seg_id=ssa.seg_id,
                audio_clip=ssa.audio_clip,
                user_clip=ssa.user_clip,
                trim_start=ssa.trim_start,
                trim_end=ssa.trim_end,
            )

        # Clone VariableRecording — shares GeneratedVoiceClip FKs
        for vr in VariableRecording.objects.filter(meditation=source).select_related("stage"):
            new_stage = stage_map.get(vr.stage_id) if vr.stage_id else None
            VariableRecording.objects.create(
                meditation=clone,
                stage=new_stage,
                seg_id=vr.seg_id,
                variable_name=vr.variable_name,
                variable_order=vr.variable_order,
                variable_value=vr.variable_value,
                voice=vr.voice,
                audio_clip=vr.audio_clip,
                user_clip=vr.user_clip,
                trim_start=vr.trim_start,
                trim_end=vr.trim_end,
                source=vr.source,
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
            items=source.items,
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
