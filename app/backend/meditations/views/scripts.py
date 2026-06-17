from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Meditation, Stage
from ..permissions import CanEditContent, CanViewContent


def _check_med_perm(request, name, write=False):
    med = get_object_or_404(Meditation, name=name)
    perm = CanEditContent() if write else CanViewContent()
    if not perm.has_object_permission(request, None, med):
        return None, Response({"error": "Forbidden"}, status=403)
    return med, None


class RootScriptView(APIView):
    def get(self, request, name):
        m, err = _check_med_perm(request, name)
        if err:
            return err
        return Response(m.script or [])

    def put(self, request, name):
        m, err = _check_med_perm(request, name, write=True)
        if err:
            return err
        m.script = request.data
        m.save()
        return Response({"status": "ok"})


class StageScriptView(APIView):
    def get(self, request, name, stage_id):
        _, err = _check_med_perm(request, name)
        if err:
            return err
        try:
            stage = Stage.objects.get(meditation_id=name, stage_id=stage_id)
            return Response(stage.script or [])
        except Stage.DoesNotExist:
            return Response([])

    def put(self, request, name, stage_id):
        m, err = _check_med_perm(request, name, write=True)
        if err:
            return err
        stage, _ = Stage.objects.get_or_create(
            meditation=m, stage_id=stage_id,
        )
        stage.script = request.data
        stage.save()
        return Response({"status": "ok"})
