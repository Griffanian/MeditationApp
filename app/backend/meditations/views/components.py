import hashlib
import re
import traceback

from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Component, Meditation, Stage
from ..permissions import CanEditContent, CanViewContent
from ..services import storage
from ..services.synthesize import (
    _collect_speech_segments,
    _collect_variables,
    _substitute_variables,
    generate_components,
)


def _check_med_perm(request, name, write=False):
    """Check object-level permission on parent meditation."""
    from django.shortcuts import get_object_or_404 as _get
    med = _get(Meditation, name=name)
    perm = CanEditContent() if write else CanViewContent()
    if not perm.has_object_permission(request, None, med):
        return Response({"error": "Forbidden"}, status=403)
    return None


class ComponentMixin:
    """Shared logic for root-level and stage-level component views."""

    def _get_script_and_vars(self, name, stage_id=None):
        if stage_id:
            try:
                stage = Stage.objects.get(meditation_id=name, stage_id=stage_id)
            except Stage.DoesNotExist:
                return [], {}
            variables = self._parse_variables(stage.variables)
            return stage.script, variables
        meditation = get_object_or_404(Meditation, name=name)
        return meditation.script, {}

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
        script, extra_vars = self._get_script_and_vars(name, stage_id)
        if not script:
            return Response({})

        variables = _collect_variables(script)
        variables.update(extra_vars)
        speech = _collect_speech_segments(script)

        from ..models import Stage
        stage_obj = None
        if stage_id:
            stage_obj = Stage.objects.filter(meditation_id=name, stage_id=stage_id).first()

        result = {}
        for seg_id, seg_info in speech.items():
            raw_text = seg_info["text"]
            direction = seg_info["direction"]
            try:
                component = Component.objects.get(
                    meditation_id=name,
                    stage__stage_id=stage_id if stage_id else None,
                    seg_id=seg_id,
                )
            except Component.DoesNotExist:
                component = None

            if component and not component.audio_file:
                component = None

            # Auto-clone from a component with the same text+direction hash
            if not component:
                substituted = _substitute_variables(raw_text, variables)
                content_hash = hashlib.md5((substituted + direction).encode()).hexdigest()[:8]
                existing = Component.objects.filter(
                    meditation_id=name, text_hash=content_hash,
                ).exclude(audio_file="").first()
                if existing:
                    component = Component.objects.create(
                        meditation_id=name, stage=stage_obj, seg_id=seg_id,
                        text_hash=content_hash,
                        timestamps=existing.timestamps,
                        audio_file=existing.audio_file,
                    )

            if not component:
                result[seg_id] = {"status": "missing"}
                continue

            # Compute duration from timestamps
            timestamps = component.timestamps or []
            duration = timestamps[-1]["end"] if timestamps else None
            if component.trim_meta and "start" in component.trim_meta and "end" in component.trim_meta:
                duration = component.trim_meta["end"] - component.trim_meta["start"]

            substituted = _substitute_variables(raw_text, variables)
            current_hash = hashlib.md5((substituted + direction).encode()).hexdigest()[:8]
            status = "current" if component.text_hash == current_hash else "stale"
            result[seg_id] = {"status": status, "duration": duration}

        return Response(result)

    def _get_timestamps(self, name, stage_id, seg_id):
        try:
            component = Component.objects.get(
                meditation_id=name,
                stage__stage_id=stage_id if stage_id else None,
                seg_id=seg_id,
            )
            return Response(component.timestamps or [])
        except Component.DoesNotExist:
            return Response([])

    def _generate_audio(self, request, name, stage_id, seg_id):
        script, extra_vars = self._get_script_and_vars(name, stage_id)
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
            stage, _ = Stage.objects.get_or_create(
                meditation=meditation, stage_id=stage_id,
            )

        component, _ = Component.objects.get_or_create(
            meditation=meditation, stage=stage, seg_id=seg_id,
        )

        file_path = storage.component_path(name, seg_id, stage_id)
        storage.upload_file(file_path, f.read(), content_type="audio/mpeg")
        component.audio_file = file_path
        component.source = "uploaded"
        component.save()
        return Response({"status": "ok"})

    def _delete_component(self, name, stage_id, seg_id):
        try:
            component = Component.objects.get(
                meditation_id=name,
                stage__stage_id=stage_id if stage_id else None,
                seg_id=seg_id,
            )
            if component.audio_file and component.source == "uploaded":
                # User-recorded audio is unique — fully delete from storage.
                storage.delete_file(component.audio_file.name)
            # AI-generated audio stays in storage — reusable via text_hash.
            component.delete()
        except Component.DoesNotExist:
            pass
        return Response({"status": "ok"})


# --- Stage-level views ---

class StageGenerateAllView(ComponentMixin, APIView):
    def post(self, request, name, stage_id):
        err = _check_med_perm(request, name, write=True)
        if err:
            return err
        script, extra_vars = self._get_script_and_vars(name, stage_id)
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
    """List audio status for multiple variable value sets for a segment."""

    def post(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name)
        if err:
            return err

        values_list = request.data.get("values", [])
        script, extra_vars = self._get_script_and_vars(name, stage_id)
        if not script:
            return Response({"error": "No script"}, status=400)

        speech = _collect_speech_segments(script)
        if seg_id not in speech:
            return Response({"error": f"Segment '{seg_id}' not found"}, status=404)

        seg_info = speech[seg_id]
        raw_text = seg_info["text"]
        direction = seg_info["direction"]

        # Base variables from script + stage
        base_vars = _collect_variables(script)
        base_vars.update(extra_vars)

        results = []
        for var_set in values_list:
            # Merge base vars with this specific override
            merged = {**base_vars, **var_set}
            substituted = _substitute_variables(raw_text, merged)
            text_hash = hashlib.md5((substituted + direction).encode()).hexdigest()[:8]

            # Look for any component with this text_hash in the meditation
            comp = Component.objects.filter(
                meditation_id=name, text_hash=text_hash,
            ).exclude(audio_file="").first()

            if comp:
                results.append({
                    "variables": var_set,
                    "text": substituted,
                    "status": "has_audio",
                    "source": comp.source or "unknown",
                    "seg_id": comp.seg_id,
                })
            else:
                results.append({
                    "variables": var_set,
                    "text": substituted,
                    "status": "missing",
                    "source": None,
                })

        return Response({"recordings": results})


class GenerateVariableAudioView(ComponentMixin, APIView):
    """Generate audio for a segment with specific variable overrides."""

    def post(self, request, name, stage_id, seg_id):
        err = _check_med_perm(request, name, write=True)
        if err:
            return err

        override_vars = request.data.get("variables", {})
        script, extra_vars = self._get_script_and_vars(name, stage_id)
        if not script:
            return Response({"error": "No script"}, status=400)

        speech = _collect_speech_segments(script)
        if seg_id not in speech:
            return Response({"error": f"Segment '{seg_id}' not found"}, status=404)

        # Merge override into stage variables
        merged_vars = {**extra_vars, **override_vars}

        try:
            generate_components(
                script, name, stage_id,
                extra_variables=merged_vars,
                only_seg_ids={seg_id},
            )
            # Update variable_values on the component
            stage_obj = Stage.objects.filter(meditation_id=name, stage_id=stage_id).first()
            comp = Component.objects.filter(
                meditation_id=name, stage=stage_obj, seg_id=seg_id,
            ).first()
            if comp:
                comp.variable_values = override_vars
                comp.save(update_fields=["variable_values"])
        except Exception as e:
            import traceback
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

        override_vars = {}
        for key in request.POST:
            if key.startswith("var_"):
                var_name = key[4:]
                override_vars[var_name] = request.POST[key]

        f = request.FILES["file"]
        script, extra_vars = self._get_script_and_vars(name, stage_id)
        speech = _collect_speech_segments(script)
        if seg_id not in speech:
            return Response({"error": f"Segment '{seg_id}' not found"}, status=404)

        seg_info = speech[seg_id]
        raw_text = seg_info["text"]
        direction = seg_info["direction"]

        # Compute text_hash for these variable values
        base_vars = _collect_variables(script)
        base_vars.update(extra_vars)
        merged = {**base_vars, **override_vars}
        substituted = _substitute_variables(raw_text, merged)
        text_hash = hashlib.md5((substituted + direction).encode()).hexdigest()[:8]

        meditation = get_object_or_404(Meditation, name=name)
        stage_obj = Stage.objects.filter(meditation=meditation, stage_id=stage_id).first()

        # Store under a cache-style seg_id so it doesn't overwrite the active component
        cache_id = f"__cache__{text_hash}"
        component, _ = Component.objects.get_or_create(
            meditation=meditation, stage=stage_obj, seg_id=cache_id,
            defaults={"text_hash": text_hash},
        )

        file_path = storage.component_path(name, cache_id, stage_id)
        storage.upload_file(file_path, f.read(), content_type="audio/mpeg")
        component.audio_file = file_path
        component.text_hash = text_hash
        component.source = "uploaded"
        component.variable_values = override_vars
        component.save()

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


# --- Audio/PDF serving — redirect to Supabase Storage public URLs ---

def _redirect_to_storage(path):
    url = storage.file_url(path)
    return HttpResponseRedirect(url)


@api_view(["GET"])
@permission_classes([AllowAny])
def serve_component(request, name, filename):
    seg_id = filename.rsplit(".", 1)[0]
    try:
        comp = Component.objects.get(meditation_id=name, stage=None, seg_id=seg_id)
        if comp.audio_file:
            return _redirect_to_storage(comp.audio_file.name)
    except Component.DoesNotExist:
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
    try:
        comp = Component.objects.get(meditation_id=name, stage__stage_id=stage_id, seg_id=seg_id)
        if comp.audio_file:
            return _redirect_to_storage(comp.audio_file.name)
    except Component.DoesNotExist:
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
