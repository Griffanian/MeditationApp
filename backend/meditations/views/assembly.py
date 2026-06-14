import hashlib
import io
import json

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import AssembledOutput, Meditation, Stage
from ..services import storage
from ..services.synthesize import _collect_variables, assemble, generate_components


class AssemblyMixin:
    def _parse_variables(self, variables_data):
        """Pass through variable objects as-is so synthesize can handle units."""
        return dict(variables_data or {})

    def _script_hash(self, script):
        return hashlib.md5(json.dumps(script, sort_keys=True).encode()).hexdigest()[:10]

    def _assemble(self, name, stage_id=None):
        meditation = get_object_or_404(Meditation, name=name)

        if stage_id:
            stage = get_object_or_404(Stage, meditation=meditation, stage_id=stage_id)
            script = stage.script
            extra_vars = self._parse_variables(stage.variables)
        else:
            stage = None
            script = meditation.script
            extra_vars = {}

        if not script:
            return Response({"error": "not found"}, status=404)

        h = self._script_hash(script)

        # Check for cached output
        try:
            cached = AssembledOutput.objects.get(
                meditation=meditation, stage=stage, script_hash=h,
            )
            return Response({
                "status": "cached",
                "filename": f"output_{h}.mp3",
                "duration": cached.duration,
            })
        except AssembledOutput.DoesNotExist:
            pass

        # Generate components and assemble
        generate_components(script, name, stage_id, extra_variables=extra_vars)
        try:
            audio = assemble(script, name, stage_id, variables=extra_vars)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

        # Upload assembled output
        buf = io.BytesIO()
        audio.export(buf, format="mp3", bitrate="192k")
        buf.seek(0)

        filename = f"output_{h}.mp3"
        file_path = storage.output_path(name, filename, stage_id)
        storage.upload_file(file_path, buf.read(), content_type="audio/mpeg")

        # Save record
        output = AssembledOutput.objects.create(
            meditation=meditation,
            stage=stage,
            script_hash=h,
            audio_file=file_path,
            duration=len(audio) / 1000,
        )

        return Response({
            "status": "ok",
            "filename": filename,
            "duration": output.duration,
        })


class StageDurationsView(APIView):
    """Return cached durations for a list of meditation/stage pairs."""
    def post(self, request):
        items = request.data.get("items", [])
        results = {}
        for item in items:
            med_name = item.get("meditation")
            stage_id = item.get("stage_id")
            if not med_name or not stage_id:
                continue
            key = f"{med_name}/{stage_id}"
            try:
                stage = Stage.objects.get(meditation_id=med_name, stage_id=stage_id)
                script_hash = hashlib.md5(
                    json.dumps(stage.script or [], sort_keys=True).encode()
                ).hexdigest()[:10]
                output = AssembledOutput.objects.get(
                    meditation_id=med_name, stage=stage, script_hash=script_hash,
                )
                results[key] = output.duration
            except (Stage.DoesNotExist, AssembledOutput.DoesNotExist):
                results[key] = None
        return Response(results)


class RootAssembleView(AssemblyMixin, APIView):
    def post(self, request, name):
        return self._assemble(name)


class StageAssembleView(AssemblyMixin, APIView):
    def post(self, request, name, stage_id):
        return self._assemble(name, stage_id)
