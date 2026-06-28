import traceback

from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import (
    GeneratedVoiceClip, Meditation, SpeechSegmentAudio,
    Stage, UserUploadedClip, VariableRecording,
)
from ..permissions import CanEditContent, CanViewContent
from ..services import storage
from ..services.synthesize import (
    _collect_speech_segments,
    _collect_variables,
    _get_stage_var_refs,
    _make_variable_key,
    _substitute_variables,
    _tts_hash,
    generate_components,
)


def _check_med_perm(request, name, write=False):
    med = get_object_or_404(Meditation, name=name)
    perm = CanEditContent() if write else CanViewContent()
    if not perm.has_object_permission(request, None, med):
        return Response({"error": "Forbidden"}, status=403)
    return None


class ComponentMixin:
    def _get_script_and_vars(self, name, stage_id=None):
        if stage_id:
            try:
                stage = Stage.objects.get(meditation_id=name, stage_id=stage_id)
            except Stage.DoesNotExist:
                return [], {}, {}
            variables = self._parse_variables(stage.variables)
            return stage.script, variables, stage.variables or {}
        meditation = get_object_or_404(Meditation, name=name)
        return meditation.script, {}, {}

    def _parse_variables(self, variables_data):
        result = {}
        for k, v in (variables_data or {}).items():
            raw = v.get("value", v) if isinstance(v, dict) else v
            try:
                result[k] = int(raw)
            except (ValueError, TypeError):
                result[k] = raw
        return result

    def _list_components(self, name, stage_id=None):
        script, extra_vars, stage_variables = self._get_script_and_vars(name, stage_id)
        if not script:
            return Response({})

        variables = _collect_variables(script)
        variables.update(extra_vars)
        speech = _collect_speech_segments(script)

        stage_obj = None
        if stage_id:
            stage_obj = Stage.objects.filter(meditation_id=name, stage_id=stage_id).first()

        result = {}
        for seg_id, seg_info in speech.items():
            raw_text = seg_info["text"]
            direction = seg_info["direction"]
            var_refs = _get_stage_var_refs(raw_text, stage_variables)

            if var_refs:
                # Variable segment — look up VariableRecording by variable_key
                var_vals = {}
                for var_name in var_refs:
                    raw = variables.get(var_name)
                    val = raw.get("value", raw) if isinstance(raw, dict) else raw
                    if val is not None:
                        var_vals[var_name] = str(val)
                variable_key = _make_variable_key(var_vals)
                rec = VariableRecording.objects.filter(
                    meditation_id=name, stage=stage_obj,
                    seg_id=seg_id, variable_key=variable_key,
                ).select_related("audio_clip", "user_clip").first()

                if not rec or (not rec.audio_clip and not rec.user_clip):
                    result[seg_id] = {"status": "missing"}
                    continue

                clip = rec.user_clip or rec.audio_clip
                dur = rec.trim_end - rec.trim_start if (rec.trim_start is not None and rec.trim_end is not None) else clip.duration
                # Check staleness: if generated, compare text_hash
                if rec.audio_clip:
                    text = _substitute_variables(raw_text, variables)
                    expected_hash = _tts_hash(text, direction, rec.audio_clip.voice_id)
                    status = "current" if rec.audio_clip.text_hash == expected_hash else "stale"
                else:
                    status = "current"  # user-uploaded: always current
                result[seg_id] = {"status": status, "duration": dur}

            else:
                # Fixed segment — look up SpeechSegmentAudio
                ssa = SpeechSegmentAudio.objects.filter(
                    meditation_id=name, stage=stage_obj, seg_id=seg_id,
                ).select_related("audio_clip", "user_clip").first()

                if not ssa or (not ssa.audio_clip and not ssa.user_clip):
                    result[seg_id] = {"status": "missing"}
                    continue

                clip = ssa.user_clip or ssa.audio_clip
                dur = ssa.trim_end - ssa.trim_start if (ssa.trim_start is not None and ssa.trim_end is not None) else clip.duration
                # Check staleness
                if ssa.audio_clip:
                    text = _substitute_variables(raw_text, variables)
                    expected_hash = _tts_hash(text, direction, ssa.audio_clip.voice_id)
                    status = "current" if ssa.audio_clip.text_hash == expected_hash else "stale"
                else:
                    status = "current"
                result[seg_id] = {"status": status, "duration": dur}

        return Response(result)

    def _get_timestamps(self, name, stage_id, seg_id):
        stage_obj = Stage.objects.filter(meditation_id=name, stage_id=stage_id).first() if stage_id else None
        # Try fixed segment first
        ssa = SpeechSegmentAudio.objects.filter(
            meditation_id=name, stage=stage_obj, seg_id=seg_id,
        ).select_related("audio_clip").first()
        if ssa and ssa.audio_clip:
            return Response(ssa.audio_clip.timestamps or [])
        # Try variable recording (return timestamps for first recorded row)
        rec = VariableRecording.objects.filter(
            meditation_id=name, stage=stage_obj, seg_id=seg_id,
        ).select_related("audio_clip").first()
        if rec and rec.audio_clip:
            return Response(rec.audio_clip.timestamps or [])
        return Response([])

    def _generate_audio(self, request, name, stage_id, seg_id):
        script, extra_vars, _ = self._get_script_and_vars(name, stage_id)
        if not script:
            return Response({"error": "No script"}, status=400)
        speech = _collect_speech_segments(script)
        if seg_id not in speech:
            return Response({"error": f"Segment '{seg_id}' not found in script"}, status=404)
        try:
            generate_components(script, name, stage_id, extra_variables=extra_vars, only_seg_ids={seg_id})
        except Exception as e:
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)
        return Response({"status": "ok"})

    def _upload_component(self, request, name, stage_id, seg_id):
        if "file" not in request.FILES:
            return Response({"error": "no file"}, status=400)
        f = request.FILES["file"]

        meditation, _ = Meditation.objects.get_or_create(name=name)
        stage = None
        if stage_id:
            stage, _ = Stage.objects.get_or_create(meditation=meditation, stage_id=stage_id)

        # Create UserUploadedClip
        file_path = storage.component_path(name, seg_id, stage_id)
        storage.upload_file(file_path, f.read(), content_type="audio/mpeg")
        user_clip = UserUploadedClip.objects.create(audio_file=file_path, duration=0)

        # Update or create SpeechSegmentAudio, clearing any old user_clip
        ssa, _ = SpeechSegmentAudio.objects.get_or_create(
            meditation=meditation, stage=stage, seg_id=seg_id,
        )
        if ssa.user_clip and ssa.user_clip != user_clip:
            old = ssa.user_clip
            ssa.user_clip = user_clip
            ssa.save(update_fields=["user_clip"])
            storage.delete_file(old.audio_file.name)
            old.delete()
        else:
            ssa.user_clip = user_clip
            ssa.save(update_fields=["user_clip"])

        return Response({"status": "ok"})

    def _delete_component(self, name, stage_id, seg_id):
        stage_obj = Stage.objects.filter(meditation_id=name, stage_id=stage_id).first() if stage_id else None
        try:
            ssa = SpeechSegmentAudio.objects.select_related("user_clip", "audio_clip").get(
                meditation_id=name, stage=stage_obj, seg_id=seg_id,
            )
            if ssa.user_clip:
                old = ssa.user_clip
                ssa.user_clip = None
                ssa.save(update_fields=["user_clip"])
                storage.delete_file(old.audio_file.name)
                old.delete()
            else:
                # Generated clip — just unlink (GeneratedVoiceClip stays)
                ssa.audio_clip = None
                ssa.save(update_fields=["audio_clip"])
        except SpeechSegmentAudio.DoesNotExist:
            pass
        return Response({"status": "ok"})


# --- Stage-level views ---

class StageGenerateAllView(ComponentMixin, APIView):
    throttle_scope = "tts"

    def post(self, request, name, stage_id):
        err = _check_med_perm(request, name, write=True)
        if err:
            return err
        script, extra_vars, _ = self._get_script_and_vars(name, stage_id)
        if not script:
            return Response({"error": "No script to generate from"}, status=400)
        try:
            generate_components(script, name, stage_id, extra_variables=extra_vars)
        except Exception as e:
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)
        return Response({"status": "ok"})


class StageComponentListView(ComponentMixin, APIView):
    def get(self, request, name, stage_id):
        err = _check_med_perm(request, name)
        if err:
            return err
        return self._list_components(name, stage_id)


class StageTimestampsView(ComponentMixin, APIView):
    def get(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name)
        if err:
            return err
        return self._get_timestamps(name, stage_id, seg_id)


class StageGenerateAudioView(ComponentMixin, APIView):
    throttle_scope = "tts"

    def post(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name, write=True)
        if err:
            return err
        return self._generate_audio(request, name, stage_id, seg_id)


class StageUploadComponentView(ComponentMixin, APIView):
    def post(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name, write=True)
        if err:
            return err
        return self._upload_component(request, name, stage_id, seg_id)


class StageDeleteComponentView(ComponentMixin, APIView):
    def delete(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name, write=True)
        if err:
            return err
        return self._delete_component(name, stage_id, seg_id)


class VariableRecordingsView(ComponentMixin, APIView):
    """List audio status for variable recordings on a segment."""

    def get(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name)
        if err:
            return err

        stage = Stage.objects.filter(meditation_id=name, stage_id=stage_id).first()
        recordings = (
            VariableRecording.objects
            .filter(meditation_id=name, stage=stage, seg_id=seg_id)
            .select_related("audio_clip", "user_clip", "voice")
            .order_by("variable_key")
        )

        # Load script/variables for staleness checking
        script, extra_vars, _ = self._get_script_and_vars(name, stage_id)
        seg_info = None
        all_vars = {}
        if script:
            speech = _collect_speech_segments(script)
            seg_info = speech.get(seg_id)
            all_vars = _collect_variables(script)
            all_vars.update(extra_vars)

        results = []
        for rec in recordings:
            clip = rec.audio_clip
            user_clip = rec.user_clip

            if not clip and not user_clip:
                status = "missing"
            elif user_clip:
                status = "current"
            elif clip and seg_info:
                merged = {**all_vars}
                for k, v in (rec.variable_values or {}).items():
                    try:
                        merged[k] = int(v)
                    except (ValueError, TypeError):
                        merged[k] = v
                text = _substitute_variables(seg_info["text"], merged)
                expected_hash = _tts_hash(text, seg_info["direction"], clip.voice_id)
                status = "current" if clip.text_hash == expected_hash else "stale"
            else:
                status = "current"

            results.append({
                "variable_values": rec.variable_values,
                "variable_key": rec.variable_key,
                "status": status,
                "source": rec.source or "unknown",
                "text_hash": clip.text_hash if clip else None,
                "user_clip_id": user_clip.id if user_clip else None,
            })

        return Response({"recordings": results})

    def post(self, request, name, stage_id, seg_id):
        """Check status for a list of specific variable value sets."""
        err = _check_med_perm(request, name)
        if err:
            return err

        values_list = request.data.get("values", [])
        script, extra_vars, stage_variables = self._get_script_and_vars(name, stage_id)
        if not script:
            return Response({"error": "No script"}, status=400)

        speech = _collect_speech_segments(script)
        if seg_id not in speech:
            return Response({"error": f"Segment '{seg_id}' not found"}, status=404)

        seg_info = speech[seg_id]
        raw_text = seg_info["text"]
        direction = seg_info["direction"]
        var_refs = _get_stage_var_refs(raw_text, stage_variables)

        base_vars = _collect_variables(script)
        base_vars.update(extra_vars)

        stage_obj = Stage.objects.filter(meditation_id=name, stage_id=stage_id).first()

        results = []
        for var_set in values_list:
            # var_set is a dict like {"phaseDuration": "4"} or {"phaseDuration": "4", "rounds": "5"}
            # Normalise values (extract .value if object)
            normalised = {}
            for k, v in var_set.items():
                val = v.get("value", v) if isinstance(v, dict) else v
                normalised[k] = str(val)

            variable_key = _make_variable_key(normalised)
            merged = {**base_vars}
            for k, v in normalised.items():
                merged[k] = v
            substituted = _substitute_variables(raw_text, merged)

            result = {
                "variable_values": normalised,
                "variable_key": variable_key,
                "text": substituted,
                "status": "missing",
                "source": None,
                "text_hash": None,
                "user_clip_id": None,
            }

            rec = VariableRecording.objects.filter(
                meditation_id=name, stage=stage_obj, seg_id=seg_id,
                variable_key=variable_key,
            ).select_related("audio_clip", "user_clip").first()
            if rec and (rec.audio_clip or rec.user_clip):
                if rec.user_clip:
                    result["status"] = "current"
                elif rec.audio_clip:
                    expected_hash = _tts_hash(substituted, direction, rec.audio_clip.voice_id)
                    result["status"] = "current" if rec.audio_clip.text_hash == expected_hash else "stale"
                result["source"] = rec.source or "unknown"
                result["text_hash"] = rec.audio_clip.text_hash if rec.audio_clip else None
                result["user_clip_id"] = rec.user_clip.id if rec.user_clip else None

            results.append(result)

        return Response({"recordings": results})


class GenerateVariableAudioView(ComponentMixin, APIView):
    """Generate TTS audio for a segment with specific variable overrides."""
    throttle_scope = "tts"

    def post(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name, write=True)
        if err:
            return err

        override_vars = request.data.get("variables", {})
        script, extra_vars, _ = self._get_script_and_vars(name, stage_id)
        if not script:
            return Response({"error": "No script"}, status=400)

        speech = _collect_speech_segments(script)
        if seg_id not in speech:
            return Response({"error": f"Segment '{seg_id}' not found"}, status=404)

        # Coerce string values to ints so _substitute_variables produces "three"
        # not "3" — matching how _list_components builds its staleness hash.
        parsed_overrides = {}
        for k, v in override_vars.items():
            raw = v.get("value", v) if isinstance(v, dict) else v
            try:
                parsed_overrides[k] = int(raw)
            except (ValueError, TypeError):
                parsed_overrides[k] = raw
        merged_vars = {**extra_vars, **parsed_overrides}

        try:
            generate_components(
                script, name, stage_id,
                extra_variables=merged_vars,
                only_seg_ids={seg_id},
            )
        except Exception as e:
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)
        return Response({"status": "ok"})


class UploadVariableAudioView(ComponentMixin, APIView):
    """Upload audio for a segment with specific variable overrides."""

    def post(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name, write=True)
        if err:
            return err

        if "file" not in request.FILES:
            return Response({"error": "no file"}, status=400)

        # Build variable_values from form data (var_* prefix)
        var_vals = {}
        for key in request.POST:
            if key.startswith("var_"):
                var_vals[key[4:]] = request.POST[key]

        f = request.FILES["file"]
        file_data = f.read()

        meditation = get_object_or_404(Meditation, name=name)
        stage_obj = Stage.objects.filter(meditation=meditation, stage_id=stage_id).first()

        variable_key = _make_variable_key(var_vals)

        # Storage path includes a hash of variable_key to avoid collisions
        import hashlib
        key_hash = hashlib.md5(variable_key.encode()).hexdigest()[:8]
        file_path = storage.component_path(name, f"{seg_id}_{key_hash}_upload", stage_id)
        storage.upload_file(file_path, file_data, content_type="audio/mpeg")
        user_clip = UserUploadedClip.objects.create(audio_file=file_path, duration=0)

        # Delete old user_clip if present
        existing = VariableRecording.objects.filter(
            meditation=meditation, stage=stage_obj, seg_id=seg_id,
            variable_key=variable_key,
        ).select_related("user_clip").first()
        if existing and existing.user_clip:
            old = existing.user_clip
            storage.delete_file(old.audio_file.name)
            old.delete()

        VariableRecording.objects.update_or_create(
            meditation=meditation,
            stage=stage_obj,
            seg_id=seg_id,
            variable_key=variable_key,
            defaults={
                "variable_values": var_vals,
                "voice": None,
                "audio_clip": None,
                "user_clip": user_clip,
                "source": "uploaded",
                "trim_start": 0.0,
                "trim_end": user_clip.duration,
            },
        )

        return Response({"status": "ok"})


class DeleteVariableRecordingView(ComponentMixin, APIView):
    """Delete the VariableRecording for a specific (seg_id, variable_key)."""

    def delete(self, request, name, stage_id, seg_id, variable_key):
        err = _check_med_perm(request, name, write=True)
        if err:
            return err

        stage_obj = Stage.objects.filter(meditation_id=name, stage_id=stage_id).first()
        recs = VariableRecording.objects.filter(
            meditation_id=name, stage=stage_obj,
            seg_id=seg_id, variable_key=variable_key,
        ).select_related("user_clip")

        for rec in recs:
            if rec.user_clip:
                old = rec.user_clip
                storage.delete_file(old.audio_file.name)
                old.delete()
            # GeneratedVoiceClip is never deleted
            rec.delete()

        return Response({"status": "ok"})


# --- Root-level views ---

class RootComponentListView(ComponentMixin, APIView):
    def get(self, request, name):
        err = _check_med_perm(request, name)
        if err:
            return err
        return self._list_components(name)


class RootTimestampsView(ComponentMixin, APIView):
    def get(self, request, name, seg_id):
        err = _check_med_perm(request, name)
        if err:
            return err
        return self._get_timestamps(name, None, seg_id)


class RootGenerateAudioView(ComponentMixin, APIView):
    throttle_scope = "tts"

    def post(self, request, name, seg_id):
        err = _check_med_perm(request, name, write=True)
        if err:
            return err
        return self._generate_audio(request, name, None, seg_id)


class RootUploadComponentView(ComponentMixin, APIView):
    def post(self, request, name, seg_id):
        err = _check_med_perm(request, name, write=True)
        if err:
            return err
        return self._upload_component(request, name, None, seg_id)


# --- Audio / PDF serving — redirect to Supabase Storage public URLs ---

def _redirect_to_storage(path):
    url = storage.file_url(path)
    return HttpResponseRedirect(url)


@api_view(["GET"])
@permission_classes([AllowAny])
def serve_clip(request, text_hash):
    """Serve a GeneratedVoiceClip by its text_hash."""
    try:
        clip = GeneratedVoiceClip.objects.get(pk=text_hash)
        if clip.audio_file:
            return _redirect_to_storage(clip.audio_file.name)
    except GeneratedVoiceClip.DoesNotExist:
        pass
    return Response({"error": "not found"}, status=404)


@api_view(["GET"])
@permission_classes([AllowAny])
def serve_upload(request, clip_id):
    """Serve a UserUploadedClip by its ID."""
    try:
        clip = UserUploadedClip.objects.get(pk=clip_id)
        if clip.audio_file:
            return _redirect_to_storage(clip.audio_file.name)
    except UserUploadedClip.DoesNotExist:
        pass
    return Response({"error": "not found"}, status=404)


@api_view(["GET"])
@permission_classes([AllowAny])
def serve_component(request, name, filename):
    seg_id = filename.rsplit(".", 1)[0]
    try:
        ssa = SpeechSegmentAudio.objects.select_related("audio_clip", "user_clip").get(
            meditation_id=name, stage=None, seg_id=seg_id,
        )
        clip = ssa.user_clip or ssa.audio_clip
        if clip and clip.audio_file:
            return _redirect_to_storage(clip.audio_file.name)
    except SpeechSegmentAudio.DoesNotExist:
        pass
    return _redirect_to_storage(f"meditations/{name}/components/{filename}")


@api_view(["GET"])
@permission_classes([AllowAny])
def serve_output(request, name, filename):
    return _redirect_to_storage(f"meditations/{name}/{filename}")


@api_view(["GET"])
@permission_classes([AllowAny])
def serve_stage_component(request, name, stage_id, filename):
    seg_id = filename.rsplit(".", 1)[0]

    # Variable segments: caller passes var_key so we can look up VariableRecording
    var_key = request.GET.get("var_key")
    if var_key:
        stage_obj = Stage.objects.filter(meditation_id=name, stage_id=stage_id).first()
        rec = VariableRecording.objects.select_related("audio_clip", "user_clip").filter(
            meditation_id=name, stage=stage_obj,
            seg_id=seg_id, variable_key=var_key,
        ).first()
        if rec:
            clip = rec.user_clip or rec.audio_clip
            if clip and clip.audio_file:
                return _redirect_to_storage(clip.audio_file.name)

    try:
        ssa = SpeechSegmentAudio.objects.select_related("audio_clip", "user_clip").get(
            meditation_id=name, stage__stage_id=stage_id, seg_id=seg_id,
        )
        clip = ssa.user_clip or ssa.audio_clip
        if clip and clip.audio_file:
            return _redirect_to_storage(clip.audio_file.name)
    except SpeechSegmentAudio.DoesNotExist:
        pass
    return _redirect_to_storage(f"meditations/{name}/stages/{stage_id}/components/{filename}")


@api_view(["GET"])
@permission_classes([AllowAny])
def serve_stage_output(request, name, stage_id, filename):
    return _redirect_to_storage(f"meditations/{name}/stages/{stage_id}/{filename}")


@api_view(["GET"])
@permission_classes([AllowAny])
def serve_asset(request, filename):
    return _redirect_to_storage(f"assets/{filename}")


@api_view(["GET"])
@permission_classes([AllowAny])
def serve_programme_audio(request, name, filename):
    return _redirect_to_storage(f"programmes/{name}/{filename}")


@api_view(["GET"])
@permission_classes([AllowAny])
def serve_pdf(request, name):
    path = storage.pdf_path(name)
    if not storage.file_exists(path):
        return Response({"error": "not found"}, status=404)
    return _redirect_to_storage(path)
