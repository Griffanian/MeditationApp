from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Meditation, Stage


class RootScriptView(APIView):
    def get(self, request, name):
        m = get_object_or_404(Meditation, name=name)
        return Response(m.script or [])

    def put(self, request, name):
        m, _ = Meditation.objects.get_or_create(name=name)
        m.script = request.data
        m.save()
        return Response({"status": "ok"})


class StageScriptView(APIView):
    def get(self, request, name, stage_id):
        try:
            stage = Stage.objects.get(meditation_id=name, stage_id=stage_id)
            return Response(stage.script or [])
        except Stage.DoesNotExist:
            return Response([])

    def put(self, request, name, stage_id):
        meditation, _ = Meditation.objects.get_or_create(name=name)
        stage, _ = Stage.objects.get_or_create(
            meditation=meditation, stage_id=stage_id,
        )
        stage.script = request.data
        stage.save()
        return Response({"status": "ok"})
