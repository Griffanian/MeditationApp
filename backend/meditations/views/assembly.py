import hashlib
import io
import json

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import AssembledOutput, Meditation, Stage
from ..services import storage
from ..services.synthesize import (
    _collect_variables,
    _preload_asset_durations,
    _preload_component_durations,
    assemble,
    compute_stage_duration,
    generate_components,
)


class AssemblyMixin:
    def _parse_variables(self, variables_data):
        """Pass through variable objects as-is so synthesize can handle units."""
        return dict(variables_data or {})

    def _content_hash(self, script, variables=None):
        blob = json.dumps({"s": script, "v": variables or {}}, sort_keys=True)
        return hashlib.md5(blob.encode()).hexdigest()[:10]

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

        h = self._content_hash(script, extra_vars)

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
                blob = json.dumps({"s": stage.script or [], "v": stage.variables or {}}, sort_keys=True)
                content_hash = hashlib.md5(blob.encode()).hexdigest()[:10]
                output = AssembledOutput.objects.get(
                    meditation_id=med_name, stage=stage, script_hash=content_hash,
                )
                results[key] = output.duration
            except (Stage.DoesNotExist, AssembledOutput.DoesNotExist):
                results[key] = None
        return Response(results)


class ComputeDurationsView(APIView):
    """Compute expected durations for items with specific variable overrides."""
    def post(self, request):
        items = request.data.get("items", [])

        # Group items by stage to preload caches once per unique stage
        stage_groups = {}
        for item in items:
            key = (item.get("meditation"), item.get("stage_id"))
            if key[0] and key[1]:
                stage_groups.setdefault(key, []).append(item)

        # Preload script + component + asset caches per unique stage
        caches = {}
        for (med_name, stage_id) in stage_groups:
            stage = Stage.objects.filter(
                meditation_id=med_name, stage_id=stage_id,
            ).first()
            script = stage.script if stage else []
            base_vars = _collect_variables(script)
            caches[(med_name, stage_id)] = {
                "script": script,
                "base_vars": base_vars,
                "comp": _preload_component_durations(med_name, stage_id),
                "asset": _preload_asset_durations(script),
            }

        results = {}
        for item in items:
            item_id = item.get("id")
            med_name = item.get("meditation")
            stage_id = item.get("stage_id")
            variables = item.get("variables")
            if not item_id or not med_name or not stage_id:
                continue
            cache = caches.get((med_name, stage_id))
            if not cache:
                continue
            try:
                merged = {**cache["base_vars"]}
                if variables:
                    merged.update(variables)
                from ..services.synthesize import _compute_duration
                dur = _compute_duration(
                    cache["script"], merged,
                    comp_cache=cache["comp"],
                    asset_cache=cache["asset"],
                )
                results[item_id] = round(dur, 1)
            except Exception:
                results[item_id] = None
        return Response(results)


class RootAssembleView(AssemblyMixin, APIView):
    def post(self, request, name):
        return self._assemble(name)


class StageAssembleView(AssemblyMixin, APIView):
    def post(self, request, name, stage_id):
        return self._assemble(name, stage_id)
