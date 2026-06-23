import io

from django.shortcuts import get_object_or_404
from pydub import AudioSegment
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Asset, Meditation, SpeechSegmentAudio, Stage, VariableRecording
from ..permissions import CanEditContent, IsAdminOrEditor
from ..services import storage


def _check_med_perm(request, name):
    med = get_object_or_404(Meditation, name=name)
    if not CanEditContent().has_object_permission(request, None, med):
        return Response({"error": "Forbidden"}, status=403)
    return None


class TrimMixin:
    def _get_ssa(self, name, stage_id, seg_id):
        return get_object_or_404(
            SpeechSegmentAudio,
            meditation_id=name,
            stage__stage_id=stage_id if stage_id else None,
            seg_id=seg_id,
        )

    def _get_trim_meta(self, name, stage_id, seg_id):
        try:
            ssa = self._get_ssa(name, stage_id, seg_id)
            return Response({"start": ssa.trim_start, "end": ssa.trim_end})
        except Exception:
            return Response({"start": None, "end": None})

    def _save_trim_meta(self, request, name, stage_id, seg_id):
        meditation, _ = Meditation.objects.get_or_create(name=name)
        stage = None
        if stage_id:
            stage, _ = Stage.objects.get_or_create(meditation=meditation, stage_id=stage_id)
        ssa, _ = SpeechSegmentAudio.objects.get_or_create(
            meditation=meditation, stage=stage, seg_id=seg_id,
        )
        ssa.trim_start = request.data.get("start")
        ssa.trim_end = request.data.get("end")
        ssa.save(update_fields=["trim_start", "trim_end"])
        return Response({"status": "ok"})

    def _delete_trim_meta(self, name, stage_id, seg_id):
        try:
            ssa = self._get_ssa(name, stage_id, seg_id)
            ssa.trim_start = None
            ssa.trim_end = None
            ssa.save(update_fields=["trim_start", "trim_end"])
        except Exception:
            pass
        return Response({"status": "ok"})


# --- Stage-level trim meta (fixed segments) ---

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


# --- Root-level trim meta (fixed segments) ---

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


# --- Variable recording trim (per variable_value) ---

class VariableRecordingTrimView(APIView):
    """GET/PUT/DELETE trim for a specific VariableRecording row."""

    def _get_rec(self, name, stage_id, seg_id, variable_key):
        stage = Stage.objects.filter(meditation_id=name, stage_id=stage_id).first() if stage_id else None
        return VariableRecording.objects.filter(
            meditation_id=name,
            stage=stage,
            seg_id=seg_id,
            variable_key=variable_key,
        ).first()

    def get(self, request, name, stage_id, seg_id, variable_key):
        err = _check_med_perm(request, name)
        if err:
            return err
        rec = self._get_rec(name, stage_id, seg_id, variable_key)
        if not rec:
            return Response({"start": None, "end": None})
        return Response({"start": rec.trim_start, "end": rec.trim_end})

    def put(self, request, name, stage_id, seg_id, variable_key):
        err = _check_med_perm(request, name)
        if err:
            return err
        rec = self._get_rec(name, stage_id, seg_id, variable_key)
        if not rec:
            return Response({"error": "not found"}, status=404)
        rec.trim_start = request.data.get("start")
        rec.trim_end = request.data.get("end")
        rec.save(update_fields=["trim_start", "trim_end"])
        return Response({"status": "ok"})

    def delete(self, request, name, stage_id, seg_id, variable_key):
        err = _check_med_perm(request, name)
        if err:
            return err
        rec = self._get_rec(name, stage_id, seg_id, variable_key)
        if rec:
            rec.trim_start = None
            rec.trim_end = None
            rec.save(update_fields=["trim_start", "trim_end"])
        return Response({"status": "ok"})


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
