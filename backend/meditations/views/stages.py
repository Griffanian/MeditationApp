from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Meditation, Stage


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
