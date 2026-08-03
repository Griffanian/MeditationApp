from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Meditation, Stage
from ..permissions import CanEditContent, CanViewContent
from ..services.generate_stage_script import generate_stage_script


def _check_med_perm(request, name, write=False):
    med = get_object_or_404(Meditation, name=name)
    perm = CanEditContent() if write else CanViewContent()
    if not perm.has_object_permission(request, None, med):
        return None, Response({"error": "Forbidden"}, status=403)
    return med, None


class VariablesView(APIView):
    def get(self, request, name, stage_id):
        _, err = _check_med_perm(request, name)
        if err:
            return err
        try:
            stage = Stage.objects.get(meditation_id=name, stage_id=stage_id)
            variables = stage.variables or {}
        except Stage.DoesNotExist:
            return Response({})
        # Enrich with computed minimums for variable mismatch detection
        try:
            from meditations.services.synthesize import compute_variable_mins
            mins = compute_variable_mins(name, stage_id)
            enriched = {}
            for var_name, var_data in variables.items():
                entry = dict(var_data) if isinstance(var_data, dict) else {"value": var_data}
                if var_name in mins:
                    entry["computed_min"] = mins[var_name]
                enriched[var_name] = entry
            return Response(enriched)
        except Exception:
            return Response(variables)

    def put(self, request, name, stage_id):
        m, err = _check_med_perm(request, name, write=True)
        if err:
            return err
        stage, _ = Stage.objects.get_or_create(
            meditation=m, stage_id=stage_id,
        )
        # Strip computed_min before saving — it's a read-only enrichment
        cleaned = {}
        for var_name, var_data in request.data.items():
            if isinstance(var_data, dict):
                cleaned[var_name] = {k: v for k, v in var_data.items() if k != 'computed_min'}
            else:
                cleaned[var_name] = var_data
        stage.variables = cleaned
        stage.save()
        return Response({"status": "ok"})


class BeforeYouBeginView(APIView):
    def get(self, request, name, stage_id):
        _, err = _check_med_perm(request, name)
        if err:
            return err
        try:
            stage = Stage.objects.get(meditation_id=name, stage_id=stage_id)
        except Stage.DoesNotExist:
            return Response({"before_you_begin": "", "blocks": []})
        # Prefer structured blocks; fall back to wrapping legacy text
        blocks = stage.before_you_begin_blocks or []
        if not blocks and stage.before_you_begin:
            blocks = [{"type": "text", "content": stage.before_you_begin}]
        return Response({
            "before_you_begin": stage.before_you_begin,
            "blocks": blocks,
        })

    def put(self, request, name, stage_id):
        m, err = _check_med_perm(request, name, write=True)
        if err:
            return err
        stage, _ = Stage.objects.get_or_create(meditation=m, stage_id=stage_id)
        if "blocks" in request.data:
            stage.before_you_begin_blocks = request.data["blocks"]
            # Keep legacy field in sync with text blocks for backwards compat
            texts = [b["content"] for b in request.data["blocks"] if b.get("type") == "text" and b.get("content")]
            stage.before_you_begin = "\n\n".join(texts)
        else:
            stage.before_you_begin = request.data.get("before_you_begin", "")
        stage.save()
        return Response({"status": "ok"})


class StageInfoBatchView(APIView):
    """Batch-fetch Before You Begin blocks + variables for several stages at once.

    One round trip for the setup wizard instead of two requests per stage.
    Variables are returned raw — no computed_min enrichment, which the wizard
    doesn't use and which makes the per-stage variables endpoint slow.
    """

    def post(self, request):
        items = request.data.get("items", [])
        unique = []
        seen = set()
        for item in items:
            med = item.get("meditation")
            sid = item.get("stage_id")
            if med and sid and (med, sid) not in seen:
                seen.add((med, sid))
                unique.append((med, sid))
        if not unique:
            return Response({})

        meds = {
            m.name: m
            for m in Meditation.objects.filter(name__in={med for med, _ in unique})
        }
        perm = CanViewContent()
        allowed = {
            name for name, m in meds.items()
            if perm.has_object_permission(request, None, m)
        }

        from django.db.models import Q
        stage_q = Q()
        for med, sid in unique:
            if med in allowed:
                stage_q |= Q(meditation_id=med, stage_id=sid)
        stage_map = {}
        if stage_q:
            for s in Stage.objects.filter(stage_q):
                stage_map[(s.meditation_id, s.stage_id)] = s

        results = {}
        for med, sid in unique:
            if med not in allowed:
                continue
            stage = stage_map.get((med, sid))
            if not stage:
                results[f"{med}/{sid}"] = {"blocks": [], "variables": {}}
                continue
            blocks = stage.before_you_begin_blocks or []
            if not blocks and stage.before_you_begin:
                blocks = [{"type": "text", "content": stage.before_you_begin}]
            results[f"{med}/{sid}"] = {
                "blocks": blocks,
                "variables": stage.variables or {},
            }
        return Response(results)


class GenerateStageScriptView(APIView):
    throttle_scope = "ai-generation"

    def post(self, request, name, stage_id):
        m, err = _check_med_perm(request, name, write=True)
        if err:
            return err
        instructions = m.instructions or {}
        stage_instr = None
        for s in instructions.get("stages", []):
            if s.get("id") == stage_id:
                stage_instr = s
                break
        if not stage_instr:
            return Response({"error": "Stage not found in instructions"}, status=404)

        try:
            result = generate_stage_script(stage_instr)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

        stage, _ = Stage.objects.get_or_create(
            meditation=m, stage_id=stage_id,
        )
        stage.script = result.get("script", [])
        stage.variables = result.get("variables", {})
        stage.save()

        return Response(result)
