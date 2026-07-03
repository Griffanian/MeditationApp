import io
import json
import time

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import AssembledOutput, Meditation, Practice, Stage
from ..permissions import CanViewContent
from ..services import storage
from ..services.synthesize import (
    _collect_variables,
    _compute_content_hash,
    _preload_asset_durations,
    _preload_segment_durations,
    assemble,
    compute_stage_duration,
    generate_components,
)
from ..services.synthesize import _compute_duration


class AssemblyMixin:
    def _parse_variables(self, variables_data):
        """Pass through variable objects as-is so synthesize can handle units."""
        return dict(variables_data or {})

    def _assemble(self, request, name, stage_id=None):
        t_total = time.monotonic()
        timings = {}

        t0 = time.monotonic()
        meditation = get_object_or_404(Meditation, name=name)
        if not CanViewContent().has_object_permission(request, None, meditation):
            return Response({"error": "Forbidden"}, status=403)

        if stage_id:
            stage = get_object_or_404(Stage, meditation=meditation, stage_id=stage_id)
            script = stage.script
            extra_vars = self._parse_variables(stage.variables)
            stage_variables = stage.variables or {}
        else:
            stage = None
            script = meditation.script
            extra_vars = {}
            stage_variables = {}

        # Allow variable overrides from request body
        body_vars = request.data.get("variables") if request.method == "POST" else None
        if body_vars and isinstance(body_vars, dict):
            extra_vars.update(self._parse_variables(body_vars))
        timings["db_fetch"] = round((time.monotonic() - t0) * 1000)

        if not script:
            return Response({"error": "not found"}, status=404)

        # Generate all components first (idempotent — reuses existing clips)
        t0 = time.monotonic()
        generate_components(script, name, stage_id, extra_variables=extra_vars)
        timings["generate_components"] = round((time.monotonic() - t0) * 1000)

        # Compute content hash (includes clip text_hashes for cache correctness)
        t0 = time.monotonic()
        h = _compute_content_hash(script, extra_vars, name, stage_id, stage_variables)
        timings["content_hash"] = round((time.monotonic() - t0) * 1000)

        # Check for cached output
        t0 = time.monotonic()
        try:
            cached = AssembledOutput.objects.get(
                meditation=meditation, stage=stage, content_hash=h,
            )
            timings["cache_check"] = round((time.monotonic() - t0) * 1000)
            timings["total"] = round((time.monotonic() - t_total) * 1000)
            print(f"[assemble] med={name} stage={stage_id} hash={h} cache=HIT timings={timings}")
            return Response({
                "status": "cached",
                "filename": f"output_{h}.mp3",
                "duration": cached.duration,
                "timings_ms": timings,
            })
        except AssembledOutput.DoesNotExist:
            timings["cache_check"] = round((time.monotonic() - t0) * 1000)

        t0 = time.monotonic()
        try:
            audio = assemble(script, name, stage_id, variables=extra_vars)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        timings["assemble_audio"] = round((time.monotonic() - t0) * 1000)

        t0 = time.monotonic()
        buf = io.BytesIO()
        audio.export(buf, format="mp3", bitrate="192k")
        buf.seek(0)
        timings["mp3_export"] = round((time.monotonic() - t0) * 1000)

        t0 = time.monotonic()
        filename = f"output_{h}.mp3"
        file_path = storage.output_path(name, filename, stage_id)
        storage.upload_file(file_path, buf.read(), content_type="audio/mpeg")
        timings["storage_upload"] = round((time.monotonic() - t0) * 1000)

        output, _created = AssembledOutput.objects.get_or_create(
            meditation=meditation,
            stage=stage,
            content_hash=h,
            defaults={
                "audio_file": file_path,
                "duration": len(audio) / 1000,
            },
        )

        timings["total"] = round((time.monotonic() - t_total) * 1000)
        print(f"[assemble] med={name} stage={stage_id} hash={h} cache=MISS timings={timings}")

        return Response({
            "status": "ok",
            "filename": filename,
            "duration": output.duration,
            "timings_ms": timings,
        })


class CheckCachedOutputsView(APIView):
    """Batch-check which stages have pre-assembled audio cached."""

    def post(self, request):
        items = request.data.get("items", [])
        if not items:
            return Response({})

        # Deduplicate by (meditation, stage_id, variables_json)
        unique = {}
        idx_map = {}  # maps dedupe key -> list of original indices
        for i, item in enumerate(items):
            med = item.get("meditation")
            sid = item.get("stage_id")
            if not med or not sid:
                continue
            vars_json = json.dumps(item.get("variables") or {}, sort_keys=True)
            key = (med, sid, vars_json)
            if key not in unique:
                unique[key] = item
                idx_map[key] = []
            idx_map[key].append(i)

        # Batch-load all Stage objects (1 query)
        from django.db.models import Q
        stage_q = Q()
        for med, sid, _ in unique:
            stage_q |= Q(meditation_id=med, stage_id=sid)
        stage_map = {}
        for s in Stage.objects.filter(stage_q):
            stage_map[(s.meditation_id, s.stage_id)] = s

        # Compute content hashes and collect them
        hash_to_key = {}
        for (med, sid, vars_json), item in unique.items():
            stage = stage_map.get((med, sid))
            if not stage or not stage.script:
                continue
            extra_vars = dict(stage.variables or {})
            item_vars = json.loads(vars_json)
            if item_vars:
                extra_vars.update(item_vars)
            h = _compute_content_hash(
                stage.script, extra_vars, med, sid, stage.variables or {},
            )
            hash_to_key[h] = (med, sid, vars_json)

        # Batch-check AssembledOutput for all hashes (1 query)
        results = {}
        for output in AssembledOutput.objects.filter(content_hash__in=hash_to_key.keys()):
            key = hash_to_key.get(output.content_hash)
            if not key:
                continue
            med, sid, _ = key
            filename = f"output_{output.content_hash}.mp3"
            entry = {"filename": filename, "duration": output.duration}
            for idx in idx_map.get(key, []):
                results[str(idx)] = entry

        return Response(results)


class StageDurationsView(APIView):
    """Return most-recent cached durations for a list of meditation/stage pairs."""
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
                output = AssembledOutput.objects.filter(
                    meditation_id=med_name,
                    stage__stage_id=stage_id,
                ).order_by("-id").first()
                results[key] = output.duration if output else None
            except Exception:
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

        # Preload caches per unique stage
        caches = {}
        for (med_name, stage_id) in stage_groups:
            stage = Stage.objects.filter(
                meditation_id=med_name, stage_id=stage_id,
            ).first()
            script = stage.script if stage else []
            stage_variables = stage.variables or {} if stage else {}
            base_vars = _collect_variables(script)
            caches[(med_name, stage_id)] = {
                "script": script,
                "stage_variables": stage_variables,
                "base_vars": base_vars,
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
                comp = _preload_segment_durations(
                    med_name, stage_id,
                    variables=merged,
                    stage_variables=cache["stage_variables"],
                )
                dur = _compute_duration(
                    cache["script"], merged,
                    comp_cache=comp,
                    asset_cache=cache["asset"],
                )
                results[item_id] = round(dur, 1)
            except Exception:
                results[item_id] = None
        return Response(results)


class RootAssembleView(AssemblyMixin, APIView):
    throttle_scope = "assembly"

    def post(self, request, name):
        return self._assemble(request, name)


class StageAssembleView(AssemblyMixin, APIView):
    throttle_scope = "assembly"

    def post(self, request, name, stage_id):
        return self._assemble(request, name, stage_id)


class DayAssembleView(APIView):
    """Assemble all stages for a programme day into one continuous MP3."""
    throttle_scope = "assembly"

    def post(self, request, name):
        practice = get_object_or_404(Practice, name=name)
        if not CanViewContent().has_object_permission(request, None, practice):
            return Response({"error": "Forbidden"}, status=403)
        week_idx = request.data.get("week", 0)
        day_idx = request.data.get("day", 0)

        weeks = practice.items or []
        if not weeks or week_idx >= len(weeks):
            return Response({"error": "Invalid week"}, status=400)
        week = weeks[week_idx]
        days = week.get("days", [])
        if not days or day_idx >= len(days):
            return Response({"error": "Invalid day"}, status=400)
        day_items = days[day_idx].get("items", [])
        if not day_items:
            return Response({"error": "Day has no stages"}, status=400)

        import hashlib, json as _json
        hash_input = []
        for item in day_items:
            stage = Stage.objects.filter(
                meditation_id=item["meditation"], stage_id=item["stage_id"]
            ).first()
            if not stage or not stage.script:
                continue
            merged_vars = dict(stage.variables or {})
            if item.get("variables"):
                merged_vars.update(item["variables"])
            hash_input.append({"s": stage.script, "v": merged_vars})

        content_hash = hashlib.md5(
            _json.dumps(hash_input, sort_keys=True).encode()
        ).hexdigest()[:12]

        filename = f"day_{content_hash}.mp3"
        file_path = f"programmes/{name}/{filename}"

        try:
            existing = storage.download_file(file_path)
            if existing:
                timestamps = self._compute_timestamps(day_items)
                return Response({
                    "status": "cached",
                    "url": f"/audio/programme/{name}/{filename}",
                    "timestamps": timestamps,
                })
        except Exception:
            pass

        from pydub import AudioSegment as PydubSegment

        combined = PydubSegment.empty()
        timestamps = []

        for item in day_items:
            med_name = item["meditation"]
            stage_id = item["stage_id"]
            stage = Stage.objects.filter(
                meditation_id=med_name, stage_id=stage_id
            ).first()
            if not stage or not stage.script:
                continue

            merged_vars = dict(stage.variables or {})
            if item.get("variables"):
                merged_vars.update(item["variables"])

            generate_components(stage.script, med_name, stage_id, extra_variables=merged_vars)
            stage_audio = assemble(stage.script, med_name, stage_id, variables=merged_vars)

            timestamps.append({
                "id": item.get("id", ""),
                "start": len(combined) / 1000,
                "duration": len(stage_audio) / 1000,
                "meditation": med_name,
                "meditation_display": item.get("meditation_display", ""),
                "stage_name": item.get("stage_name", ""),
            })

            combined += stage_audio

        if len(combined) == 0:
            return Response({"error": "No audio produced"}, status=400)

        buf = io.BytesIO()
        combined.export(buf, format="mp3", bitrate="192k")
        buf.seek(0)
        storage.upload_file(file_path, buf.read(), content_type="audio/mpeg")

        return Response({
            "status": "ok",
            "url": f"/audio/programme/{name}/{filename}",
            "timestamps": timestamps,
        })

    def _compute_timestamps(self, day_items):
        timestamps = []
        offset = 0.0
        for item in day_items:
            stage = Stage.objects.filter(
                meditation_id=item["meditation"], stage_id=item["stage_id"]
            ).first()
            if not stage or not stage.script:
                continue
            merged_vars = dict(stage.variables or {})
            if item.get("variables"):
                merged_vars.update(item["variables"])
            output = AssembledOutput.objects.filter(
                meditation_id=item["meditation"], stage=stage,
            ).order_by("-id").first()
            dur = output.duration if output else 0
            timestamps.append({
                "id": item.get("id", ""),
                "start": offset,
                "duration": dur,
                "meditation": item["meditation"],
                "meditation_display": item.get("meditation_display", ""),
                "stage_name": item.get("stage_name", ""),
            })
            offset += dur
        return timestamps
