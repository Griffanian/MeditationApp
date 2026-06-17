import io

from django.shortcuts import get_object_or_404
from pydub import AudioSegment
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Asset, Component, Meditation, Stage
from ..permissions import CanEditContent, IsAdminOrEditor
from ..services import storage


def _check_med_perm(request, name):
    """Check edit permission on parent meditation."""
    med = get_object_or_404(Meditation, name=name)
    if not CanEditContent().has_object_permission(request, None, med):
        return Response({"error": "Forbidden"}, status=403)
    return None


class TrimMixin:
    def _get_component(self, name, stage_id, seg_id):
        return get_object_or_404(
            Component,
            meditation_id=name,
            stage__stage_id=stage_id if stage_id else None,
            seg_id=seg_id,
        )

    def _get_trim_meta(self, name, stage_id, seg_id):
        try:
            component = self._get_component(name, stage_id, seg_id)
            return Response(component.trim_meta or {})
        except Exception:
            return Response({})

    def _save_trim_meta(self, request, name, stage_id, seg_id):
        meditation, _ = Meditation.objects.get_or_create(name=name)
        stage = None
        if stage_id:
            stage, _ = Stage.objects.get_or_create(
                meditation=meditation, stage_id=stage_id,
            )
        component, _ = Component.objects.get_or_create(
            meditation=meditation, stage=stage, seg_id=seg_id,
        )
        component.trim_meta = request.data
        component.save()
        return Response({"status": "ok"})

    def _delete_trim_meta(self, name, stage_id, seg_id):
        try:
            component = self._get_component(name, stage_id, seg_id)
            component.trim_meta = {}
            component.save()
        except Exception:
            pass
        return Response({"status": "ok"})


# --- Stage-level trim meta ---

class StageTrimMetaView(TrimMixin, APIView):
    def get(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name)
        if err:
            return err
        return self._get_trim_meta(name, stage_id, seg_id)

    def put(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name)
        if err:
            return err
        return self._save_trim_meta(request, name, stage_id, seg_id)

    def delete(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name)
        if err:
            return err
        return self._delete_trim_meta(name, stage_id, seg_id)


# --- Root-level trim meta ---

class RootTrimMetaView(TrimMixin, APIView):
    def get(self, request, name, seg_id):
        err = _check_med_perm(request, name)
        if err:
            return err
        return self._get_trim_meta(name, None, seg_id)

    def put(self, request, name, seg_id):
        err = _check_med_perm(request, name)
        if err:
            return err
        return self._save_trim_meta(request, name, None, seg_id)

    def delete(self, request, name, seg_id):
        err = _check_med_perm(request, name)
        if err:
            return err
        return self._delete_trim_meta(name, None, seg_id)


# --- Trim execution (in-place audio trimming) ---

class RootTrimComponentView(APIView):
    def post(self, request, name, seg_id):
        err = _check_med_perm(request, name)
        if err:
            return err
        data = request.data
        if not data or "start" not in data or "end" not in data:
            return Response({"error": "missing start/end"}, status=400)

        component = get_object_or_404(
            Component, meditation_id=name, stage=None, seg_id=seg_id,
        )
        if not component.audio_file:
            return Response({"error": "not found"}, status=404)

        audio_data = storage.download_file(component.audio_file.name)
        audio = AudioSegment.from_mp3(io.BytesIO(audio_data))

        start_ms = int(data["start"] * 1000)
        end_ms = int(data["end"] * 1000)
        trimmed = audio[start_ms:end_ms]

        buf = io.BytesIO()
        trimmed.export(buf, format="mp3", bitrate="192k")
        buf.seek(0)
        storage.upload_file(component.audio_file.name, buf.read(), content_type="audio/mpeg")

        return Response({"status": "ok", "duration": len(trimmed) / 1000})


# --- Asset trim meta (global assets — admin/editor only) ---

class AssetTrimMetaView(APIView):
    permission_classes = [IsAdminOrEditor]

    def get(self, request, filename):
        try:
            asset = Asset.objects.get(filename=filename)
            return Response(asset.trim_meta or {})
        except Asset.DoesNotExist:
            return Response({})

    def put(self, request, filename):
        asset, _ = Asset.objects.get_or_create(
            filename=filename,
            defaults={"audio_file": storage.asset_path(filename)},
        )
        asset.trim_meta = request.data
        asset.save()
        return Response({"status": "ok"})

    def delete(self, request, filename):
        try:
            asset = Asset.objects.get(filename=filename)
            asset.trim_meta = {}
            asset.save()
        except Asset.DoesNotExist:
            pass
        return Response({"status": "ok"})


class TrimAssetView(APIView):
    permission_classes = [IsAdminOrEditor]

    def post(self, request, filename):
        data = request.data
        start_ms = int(data["start"] * 1000)
        end_ms = int(data["end"] * 1000)

        asset = get_object_or_404(Asset, filename=filename)
        audio_data = storage.download_file(asset.audio_file.name)
        audio = AudioSegment.from_mp3(io.BytesIO(audio_data))

        trimmed = audio[start_ms:end_ms]
        buf = io.BytesIO()
        trimmed.export(buf, format="mp3", bitrate="192k")
        buf.seek(0)
        storage.upload_file(asset.audio_file.name, buf.read(), content_type="audio/mpeg")

        return Response({"status": "ok", "duration": len(trimmed) / 1000})
