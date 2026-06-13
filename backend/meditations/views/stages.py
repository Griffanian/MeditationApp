from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Meditation, Stage
from ..services.generate_stage_script import generate_stage_script


class VariablesView(APIView):
    def get(self, request, name, stage_id):
        try:
            stage = Stage.objects.get(meditation_id=name, stage_id=stage_id)
            return Response(stage.variables or {})
        except Stage.DoesNotExist:
            return Response({})

    def put(self, request, name, stage_id):
        meditation, _ = Meditation.objects.get_or_create(name=name)
        stage, _ = Stage.objects.get_or_create(
            meditation=meditation, stage_id=stage_id,
        )
        stage.variables = request.data
        stage.save()
        return Response({"status": "ok"})


class GenerateStageScriptView(APIView):
    def post(self, request, name, stage_id):
        m = get_object_or_404(Meditation, name=name)
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

        # Save script and variables to the Stage model
        meditation, _ = Meditation.objects.get_or_create(name=name)
        stage, _ = Stage.objects.get_or_create(
            meditation=meditation, stage_id=stage_id,
        )
        stage.script = result.get("script", [])
        stage.variables = result.get("variables", {})
        stage.save()

        return Response(result)
