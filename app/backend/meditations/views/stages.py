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
            return Response(stage.variables or {})
        except Stage.DoesNotExist:
            return Response({})

    def put(self, request, name, stage_id):
        m, err = _check_med_perm(request, name, write=True)
        if err:
            return err
        stage, _ = Stage.objects.get_or_create(
            meditation=m, stage_id=stage_id,
        )
        stage.variables = request.data
        stage.save()
        return Response({"status": "ok"})


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
