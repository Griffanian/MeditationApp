import base64
import hashlib
import io
import json
import math
import os
import re
import time
from pathlib import Path

from elevenlabs import ElevenLabs
from pydub import AudioSegment

from . import storage


DEFAULT_VOICE_ID = "UmQN7jS1Ee8B1czsUtQh"

# Match ElevenLabs mp3_44100_128 output to avoid costly resampling in PyDub
_FRAME_RATE = 44100

# Number words for substitution
_ONES = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
    "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen",
]
_TENS = [
    "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy",
    "eighty", "ninety",
]


def _number_to_words(n: int) -> str:
    if n < 20:
        return _ONES[n]
    if n < 100:
        return _TENS[n // 10] + ("" if n % 10 == 0 else "-" + _ONES[n % 10])
    if n < 1000:
        return (
            _ONES[n // 100]
            + " hundred"
            + ("" if n % 100 == 0 else " and " + _number_to_words(n % 100))
        )
    return str(n)


UNIT_MULTIPLIERS = {"seconds": 1, "minutes": 60, "hours": 3600}


def _resolve_var(val):
    """Resolve a variable value, handling both plain numbers and objects with units."""
    if isinstance(val, dict):
        raw = val.get("value", 0)
        unit = val.get("unit")
        multiplier = UNIT_MULTIPLIERS.get(unit, 1)
        try:
            return float(raw) * multiplier
        except (ValueError, TypeError):
            return 0
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0


def _evaluate_condition(condition, variables: dict, stage_conditions: dict = None) -> bool:
    """Evaluate a segment condition against current variables.
    Condition can be a dict with variable/operator/value, or a string referencing
    a named condition from stage_conditions. Returns True if included."""
    if not condition:
        return True
    # String reference to a named condition
    if isinstance(condition, str):
        if not stage_conditions or condition not in stage_conditions:
            return True
        condition = stage_conditions[condition]
    var_name = condition.get("variable")
    operator = condition.get("operator")
    threshold = condition.get("value")
    if not var_name or not operator or threshold is None:
        return True
    val = variables.get(var_name)
    if val is None:
        return True
    resolved = _resolve_var(val)
    threshold = float(threshold)
    if operator == "between":
        threshold2 = condition.get("value2")
        if threshold2 is None: return True
        return threshold <= resolved <= float(threshold2)
    if operator == ">": return resolved > threshold
    if operator == "<": return resolved < threshold
    if operator == ">=": return resolved >= threshold
    if operator == "<=": return resolved <= threshold
    if operator == "==": return resolved == threshold
    if operator == "!=": return resolved != threshold
    return True


def _collect_variables(segments: list[dict]) -> dict:
    variables = {}
    for seg in segments:
        if seg["type"] == "loop":
            var = seg.get("variable")
            if var:
                raw = seg.get("repeat", 1)
                try:
                    variables[var] = int(raw)
                except (ValueError, TypeError):
                    variables[var] = raw
            variables.update(_collect_variables(seg.get("segments", [])))
    return variables


def _substitute_variables(text: str, variables: dict) -> str:
    def replace(match):
        var_name = match.group(1)
        if var_name in variables:
            val = variables[var_name]
            if isinstance(val, dict):
                raw = val.get("value", 0)
                try:
                    raw = int(float(raw))
                except (ValueError, TypeError):
                    return str(raw)
                return _number_to_words(raw)
            if isinstance(val, int):
                return _number_to_words(val)
            return str(val)
        return match.group(0)

    return re.sub(r"\{(\w+)\}", replace, text)


def _collect_speech_segments(segments: list[dict]) -> dict:
    speech = {}
    for seg in segments:
        if seg["type"] == "speech":
            speech[seg["id"]] = {
                "text": seg["text"],
                "direction": seg.get("direction", ""),
            }
        elif seg["type"] == "loop":
            speech.update(_collect_speech_segments(seg["segments"]))
    return speech


def _make_variable_key(variable_values: dict) -> str:
    return ",".join(f"{k}={v}" for k, v in sorted(variable_values.items()))


def _get_stage_var_refs(text: str, stage_variables: dict) -> list[str]:
    """Ordered list of variable names in text that are defined as stage variables."""
    seen = set()
    result = []
    for m in re.finditer(r"\{(\w+)\}", text):
        name = m.group(1)
        if name in stage_variables and name not in seen:
            seen.add(name)
            result.append(name)
    return result


def _clip_duration(audio_clip, user_clip, trim_start, trim_end) -> float:
    """Effective clip duration in seconds."""
    clip = user_clip or audio_clip
    if not clip:
        return 0
    if trim_start is not None and trim_end is not None:
        return max(0.0, trim_end - trim_start)
    return clip.duration if hasattr(clip, "duration") else 0


def _tts_hash(text: str, direction: str, voice_id: str) -> str:
    return hashlib.md5((text + "|" + direction + "|" + voice_id).encode()).hexdigest()[:16]


def _generate_tts_clip(client, text: str, direction: str, voice_id: str) -> tuple:
    """Call ElevenLabs and return (audio_bytes, words). Retries on rate limits."""
    synth_text = text if text.rstrip().endswith((".", "!", "?")) else text.rstrip() + "."
    tts_kwargs = dict(
        text=synth_text,
        voice_id=voice_id,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
        language_code="en",
    )
    if direction:
        tts_kwargs["previous_text"] = direction

    for attempt in range(5):
        try:
            response = client.text_to_speech.convert_with_timestamps(**tts_kwargs)
            break
        except Exception as exc:
            status = getattr(exc, "status_code", None) or getattr(
                getattr(exc, "response", None), "status_code", None
            )
            if status in (429, 503) and attempt < 4:
                wait = 2 ** attempt
                print(f"    ElevenLabs {status}, retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise

    audio_bytes = base64.b64decode(response.audio_base_64)
    words = _chars_to_words(response.alignment)
    return audio_bytes, words


def generate_components(
    script: list[dict],
    meditation_name: str,
    stage_id: str = None,
    voice_id: str = DEFAULT_VOICE_ID,
    extra_variables: dict = None,
    only_seg_ids: set = None,
):
    """Generate and cache speech components.

    Fixed segments → SpeechSegmentAudio + GeneratedVoiceClip.
    Variable segments → VariableRecording + GeneratedVoiceClip (one row per
    variable position/value combination present in extra_variables).
    """
    from meditations.models import (
        GeneratedVoiceClip, Meditation, SpeechSegmentAudio,
        Stage, VariableRecording, Voice,
    )

    client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

    meditation = Meditation.objects.get(name=meditation_name)
    stage = None
    stage_variables = {}
    if stage_id:
        stage = Stage.objects.get(meditation=meditation, stage_id=stage_id)
        stage_variables = stage.variables or {}

    voice_obj, _ = Voice.objects.get_or_create(
        id=voice_id,
        defaults={"provider": "elevenlabs", "display_name": voice_id},
    )

    variables = _collect_variables(script)
    if extra_variables:
        variables.update(extra_variables)
    speech_segments = _collect_speech_segments(script)
    total = len(speech_segments)

    for i, (seg_id, seg_info) in enumerate(speech_segments.items()):
        if only_seg_ids is not None and seg_id not in only_seg_ids:
            continue

        text_template = seg_info["text"]
        direction = seg_info["direction"]
        var_refs = _get_stage_var_refs(text_template, stage_variables)

        # Substitute all variables to get the final spoken text
        text = _substitute_variables(text_template, variables)
        text_hash = _tts_hash(text, direction, voice_id)

        if var_refs:
            # Variable segment — create VariableRecording rows
            _generate_variable_segment(
                client, meditation, stage, seg_id, text, direction,
                text_hash, voice_id, voice_obj, var_refs, variables,
                i, total,
            )
        else:
            # Fixed segment — create/update SpeechSegmentAudio
            _generate_fixed_segment(
                client, meditation, stage, seg_id, text, direction,
                text_hash, voice_id, voice_obj, i, total,
            )


def _generate_fixed_segment(
    client, meditation, stage, seg_id, text, direction,
    text_hash, voice_id, voice_obj, i, total,
):
    from meditations.models import GeneratedVoiceClip, SpeechSegmentAudio

    existing_clip = GeneratedVoiceClip.objects.filter(pk=text_hash).first()
    ssa, _ = SpeechSegmentAudio.objects.get_or_create(
        meditation=meditation, stage=stage, seg_id=seg_id,
    )

    if existing_clip:
        if ssa.audio_clip_id != text_hash:
            ssa.audio_clip = existing_clip
            ssa.save(update_fields=["audio_clip"])
            print(f"  [{i + 1}/{total}] linked existing clip: {seg_id}")
        else:
            print(f"  [{i + 1}/{total}] cached: {seg_id}")
        return

    print(f'  [{i + 1}/{total}] generating (fixed): "{text[:50]}..."')
    audio_bytes, words = _generate_tts_clip(client, text, direction, voice_id)

    audio = AudioSegment.from_mp3(io.BytesIO(audio_bytes))
    buf = io.BytesIO()
    audio.export(buf, format="mp3", bitrate="192k")
    buf.seek(0)

    file_path = storage.clip_path(text_hash)
    storage.upload_file(file_path, buf.read(), content_type="audio/mpeg")

    clip = GeneratedVoiceClip.objects.create(
        text_hash=text_hash,
        voice=voice_obj,
        audio_file=file_path,
        timestamps=words,
        duration=len(audio) / 1000,
    )
    ssa.audio_clip = clip
    ssa.trim_start = 0.0
    ssa.trim_end = clip.duration
    ssa.save(update_fields=["audio_clip", "trim_start", "trim_end"])


def _generate_variable_segment(
    client, meditation, stage, seg_id, text, direction,
    text_hash, voice_id, voice_obj, var_refs, variables,
    i, total,
):
    from meditations.models import GeneratedVoiceClip, VariableRecording

    existing_clip = GeneratedVoiceClip.objects.filter(pk=text_hash).first()

    if not existing_clip:
        print(f'  [{i + 1}/{total}] generating (variable): "{text[:50]}..."')
        audio_bytes, words = _generate_tts_clip(client, text, direction, voice_id)

        audio = AudioSegment.from_mp3(io.BytesIO(audio_bytes))
        buf = io.BytesIO()
        audio.export(buf, format="mp3", bitrate="192k")
        buf.seek(0)

        file_path = storage.clip_path(text_hash)
        storage.upload_file(file_path, buf.read(), content_type="audio/mpeg")

        existing_clip = GeneratedVoiceClip.objects.create(
            text_hash=text_hash,
            voice=voice_obj,
            audio_file=file_path,
            timestamps=words,
            duration=len(audio) / 1000,
        )
    else:
        print(f"  [{i + 1}/{total}] cached (variable): {seg_id}")

    # Build var_vals dict for all var_refs at their current values
    var_vals = {}
    for var_name in var_refs:
        raw = variables.get(var_name)
        val = raw.get("value", None) if isinstance(raw, dict) else raw
        if val is not None:
            var_vals[var_name] = str(val)
    if not var_vals:
        return

    variable_key = _make_variable_key(var_vals)

    VariableRecording.objects.update_or_create(
        meditation=meditation,
        stage=stage,
        seg_id=seg_id,
        variable_key=variable_key,
        defaults={
            "variable_values": var_vals,
            "voice": voice_obj,
            "audio_clip": existing_clip,
            "user_clip": None,
            "source": "generated",
            "trim_start": 0.0,
            "trim_end": existing_clip.duration,
        },
    )


def _chars_to_words(alignment) -> list[dict]:
    words = []
    current_word = ""
    word_start = None

    for char, start, end in zip(
        alignment.characters,
        alignment.character_start_times_seconds,
        alignment.character_end_times_seconds,
    ):
        if char == " ":
            if current_word:
                words.append({"word": current_word, "start": word_start, "end": end})
                current_word = ""
                word_start = None
        else:
            if word_start is None:
                word_start = start
            current_word += char

    if current_word:
        words.append({
            "word": current_word,
            "start": word_start,
            "end": alignment.character_end_times_seconds[-1],
        })

    return words


def _count_markers(segments: list[dict], variables: dict) -> int:
    """Count effective split markers, accounting for loop repeats and conditions."""
    count = 0
    for seg in segments:
        if not _evaluate_condition(seg.get("condition"), variables, variables.get("_conditions")):
            continue
        if seg["type"] == "split_marker":
            count += seg.get("multiplier", 1)
        elif seg["type"] == "loop":
            loop_var = seg.get("variable")
            if loop_var and loop_var in variables:
                repeat = int(_resolve_var(variables[loop_var]))
            else:
                repeat = seg.get("repeat", 1)
            count += repeat * _count_markers(seg["segments"], variables)
    return count


def _assemble_segments(
    segments: list[dict],
    meditation_name: str,
    stage_id: str = None,
    depth: int = 0,
    variables: dict = None,
    marker_duration: float = None,
    stage_variables: dict = None,
) -> AudioSegment:
    from meditations.models import Asset, SpeechSegmentAudio, VariableRecording

    if variables is None:
        variables = {}
    if stage_variables is None:
        stage_variables = {}
    combined = AudioSegment.empty()
    prev_type = None

    _FADE_MS = 300
    _CROSSFADE_MS = 150

    for i, seg in enumerate(segments):
        # Conditional inclusion — skip segment if condition evaluates to false
        if not _evaluate_condition(seg.get("condition"), variables, variables.get("_conditions")):
            continue

        seg_type = seg["type"]

        if seg_type == "speech":
            var_refs = _get_stage_var_refs(seg["text"], stage_variables)

            if var_refs:
                # Variable segment — look up VariableRecording by variable_key
                var_vals = {}
                for var_name in var_refs:
                    raw = variables.get(var_name, "")
                    val = raw.get("value", raw) if isinstance(raw, dict) else raw
                    var_vals[var_name] = str(val)
                variable_key = _make_variable_key(var_vals)
                rec = VariableRecording.objects.select_related("audio_clip", "user_clip").get(
                    meditation_id=meditation_name,
                    stage__stage_id=stage_id if stage_id else None,
                    seg_id=seg["id"],
                    variable_key=variable_key,
                )
                clip = rec.user_clip or rec.audio_clip
                if not clip:
                    raise ValueError(f"No audio for variable segment '{seg['id']}' ({var_name}={val})")
                audio_data = storage.download_file(clip.audio_file.name)
                audio = AudioSegment.from_mp3(io.BytesIO(audio_data))
                if rec.trim_start is not None and rec.trim_end is not None:
                    audio = audio[int(rec.trim_start * 1000):int(rec.trim_end * 1000)]
            else:
                # Fixed segment — look up SpeechSegmentAudio
                ssa = SpeechSegmentAudio.objects.select_related("audio_clip", "user_clip").get(
                    meditation_id=meditation_name,
                    stage__stage_id=stage_id if stage_id else None,
                    seg_id=seg["id"],
                )
                clip = ssa.user_clip or ssa.audio_clip
                if not clip:
                    raise ValueError(f"No audio for fixed segment '{seg['id']}'")
                audio_data = storage.download_file(clip.audio_file.name)
                audio = AudioSegment.from_mp3(io.BytesIO(audio_data))
                if ssa.trim_start is not None and ssa.trim_end is not None:
                    audio = audio[int(ssa.trim_start * 1000):int(ssa.trim_end * 1000)]

            # Fade out when followed by silence/end
            next_type = segments[i + 1]["type"] if i + 1 < len(segments) else None
            if next_type in (None, "pause", "split_marker"):
                audio = audio.fade_out(_FADE_MS)
            # Crossfade when speech follows speech
            if prev_type == "speech" and len(combined) >= _CROSSFADE_MS and len(audio) >= _CROSSFADE_MS:
                combined = combined.append(audio, crossfade=_CROSSFADE_MS)
            else:
                combined += audio

        elif seg_type == "pause":
            duration = seg["duration_seconds"]
            if isinstance(duration, str):
                match = re.match(r"^\{(\w+)\}$", duration)
                if match and match.group(1) in variables:
                    duration = _resolve_var(variables[match.group(1)])
                else:
                    duration = float(duration) if duration.replace(".", "").isdigit() else 0
            combined += AudioSegment.silent(duration=int(float(duration) * 1000), frame_rate=_FRAME_RATE)

        elif seg_type == "split_marker":
            if marker_duration is not None:
                mult = seg.get("multiplier", 1)
                combined += AudioSegment.silent(duration=int(marker_duration * mult * 1000), frame_rate=_FRAME_RATE)

        elif seg_type == "asset":
            try:
                asset = Asset.objects.get(filename=seg["file"])
                audio_data = storage.download_file(asset.audio_file.name)
                audio = AudioSegment.from_mp3(io.BytesIO(audio_data))
                if asset.trim_meta and "start" in asset.trim_meta and "end" in asset.trim_meta:
                    s, e = int(asset.trim_meta["start"] * 1000), int(asset.trim_meta["end"] * 1000)
                    audio = audio[s:e]
                combined += audio
            except Asset.DoesNotExist:
                from django.conf import settings
                asset_path = settings.BASE_DIR / "assets" / seg["file"]
                if asset_path.exists():
                    combined += AudioSegment.from_mp3(asset_path)

        elif seg_type == "loop":
            target = seg.get("targetDuration")
            is_section = bool(seg.get("label"))

            if target is not None and is_section:
                if isinstance(target, str):
                    match = re.match(r"^\{(\w+)\}$", target)
                    if match and match.group(1) in variables:
                        target = _resolve_var(variables[match.group(1)])
                target_seconds = float(target)
                num_markers = _count_markers(seg["segments"], variables)

                if num_markers > 0:
                    fixed_audio = _assemble_segments(
                        seg["segments"], meditation_name, stage_id,
                        depth + 1, variables, marker_duration=0,
                        stage_variables=stage_variables,
                    )
                    fixed_duration = len(fixed_audio) / 1000.0
                    remaining = target_seconds - fixed_duration
                    if remaining < 0:
                        label = seg.get("label", "section")
                        raise ValueError(
                            f"Fixed content ({fixed_duration:.1f}s) exceeds "
                            f"target duration ({target_seconds:.0f}s) for "
                            f"section \"{label}\""
                        )
                    per_marker = remaining / num_markers
                    combined += _assemble_segments(
                        seg["segments"], meditation_name, stage_id,
                        depth + 1, variables, marker_duration=per_marker,
                        stage_variables=stage_variables,
                    )
                else:
                    combined += _assemble_segments(
                        seg["segments"], meditation_name, stage_id,
                        depth + 1, variables, marker_duration=marker_duration,
                        stage_variables=stage_variables,
                    )

            elif target is not None and not is_section:
                if isinstance(target, str):
                    match = re.match(r"^\{(\w+)\}$", target)
                    if match and match.group(1) in variables:
                        target = _resolve_var(variables[match.group(1)])
                target_seconds = float(target)
                if not (isinstance(seg.get("targetDuration"), str)
                        and re.match(r"^\{\w+\}$", seg["targetDuration"])):
                    unit = seg.get("targetDurationUnit", "seconds")
                    target_seconds *= UNIT_MULTIPLIERS.get(unit, 1)

                iteration = _assemble_segments(
                    seg["segments"], meditation_name, stage_id,
                    depth + 1, variables, marker_duration=marker_duration,
                    stage_variables=stage_variables,
                )
                iteration_duration = len(iteration) / 1000.0
                repeat = max(1, math.ceil(target_seconds / iteration_duration)) if iteration_duration > 0 else 1
                for _ in range(repeat):
                    combined += iteration

            else:
                var_name = seg.get("variable")
                if var_name and var_name in variables:
                    repeat = int(_resolve_var(variables[var_name]))
                else:
                    repeat = int(seg.get("repeat", 1))
                iteration = _assemble_segments(
                    seg["segments"], meditation_name, stage_id,
                    depth + 1, variables, marker_duration=marker_duration,
                    stage_variables=stage_variables,
                )
                for _ in range(repeat):
                    combined += iteration

        prev_type = seg_type

    return combined


def _preload_segment_durations(meditation_name, stage_id, variables=None, stage_variables=None):
    """Bulk-load effective durations for all segments in a stage."""
    from meditations.models import SpeechSegmentAudio, Stage, VariableRecording

    if stage_variables is None and stage_id:
        s = Stage.objects.filter(meditation_id=meditation_name, stage_id=stage_id).first()
        stage_variables = s.variables if s else {}

    cache = {}

    # Fixed segments
    for ssa in SpeechSegmentAudio.objects.filter(
        meditation_id=meditation_name,
        stage__stage_id=stage_id if stage_id else None,
    ).select_related("audio_clip", "user_clip"):
        cache[ssa.seg_id] = _clip_duration(ssa.audio_clip, ssa.user_clip, ssa.trim_start, ssa.trim_end)

    # Variable segments — override with current values
    if variables and stage_variables:
        for rec in VariableRecording.objects.filter(
            meditation_id=meditation_name,
            stage__stage_id=stage_id if stage_id else None,
        ).select_related("audio_clip", "user_clip"):
            # Check if all entries in rec.variable_values match current variables
            if all(
                str(
                    variables.get(k, {}).get("value", variables.get(k))
                    if isinstance(variables.get(k), dict)
                    else variables.get(k)
                ) == v
                for k, v in rec.variable_values.items()
            ):
                cache[rec.seg_id] = _clip_duration(
                    rec.audio_clip, rec.user_clip, rec.trim_start, rec.trim_end,
                )

    return cache


# Keep old name as alias for callers that haven't been updated yet
def _preload_component_durations(meditation_name, stage_id):
    return _preload_segment_durations(meditation_name, stage_id)


def _preload_asset_durations(segments):
    """Bulk-load asset durations for all asset segments in a script."""
    from meditations.models import Asset

    filenames = set()

    def _collect(segs):
        for seg in segs:
            if seg["type"] == "asset":
                filenames.add(seg["file"])
            elif seg["type"] == "loop":
                _collect(seg.get("segments", []))

    _collect(segments)
    if not filenames:
        return {}
    cache = {}
    for a in Asset.objects.filter(filename__in=filenames):
        if a.trim_meta and "start" in a.trim_meta and "end" in a.trim_meta:
            cache[a.filename] = a.trim_meta["end"] - a.trim_meta["start"]
        else:
            cache[a.filename] = 0
    return cache


def _compute_duration(
    segments: list[dict],
    variables: dict = None,
    marker_duration: float = None,
    comp_cache: dict = None,
    asset_cache: dict = None,
) -> float:
    """Compute expected duration in seconds using preloaded caches."""
    if variables is None:
        variables = {}
    if comp_cache is None:
        comp_cache = {}
    if asset_cache is None:
        asset_cache = {}
    total = 0.0

    for seg in segments:
        if not _evaluate_condition(seg.get("condition"), variables, variables.get("_conditions")):
            continue

        seg_type = seg["type"]

        if seg_type == "speech":
            total += comp_cache.get(seg["id"], 0)

        elif seg_type == "pause":
            duration = seg["duration_seconds"]
            if isinstance(duration, str):
                match = re.match(r"^\{(\w+)\}$", duration)
                if match and match.group(1) in variables:
                    duration = _resolve_var(variables[match.group(1)])
                else:
                    duration = float(duration) if duration.replace(".", "").isdigit() else 0
            total += float(duration)

        elif seg_type == "split_marker":
            if marker_duration is not None:
                mult = seg.get("multiplier", 1)
                total += marker_duration * mult

        elif seg_type == "asset":
            total += asset_cache.get(seg["file"], 0)

        elif seg_type == "loop":
            target = seg.get("targetDuration")
            is_section = bool(seg.get("label"))

            if target is not None and is_section:
                if isinstance(target, str):
                    match = re.match(r"^\{(\w+)\}$", target)
                    if match and match.group(1) in variables:
                        target = _resolve_var(variables[match.group(1)])
                total += float(target)

            elif target is not None and not is_section:
                if isinstance(target, str):
                    match = re.match(r"^\{(\w+)\}$", target)
                    if match and match.group(1) in variables:
                        target = _resolve_var(variables[match.group(1)])
                target_seconds = float(target)
                if not (isinstance(seg.get("targetDuration"), str)
                        and re.match(r"^\{\w+\}$", seg["targetDuration"])):
                    unit = seg.get("targetDurationUnit", "seconds")
                    target_seconds *= UNIT_MULTIPLIERS.get(unit, 1)
                total += target_seconds

            else:
                var_name = seg.get("variable")
                if var_name and var_name in variables:
                    repeat = int(_resolve_var(variables[var_name]))
                else:
                    repeat = int(seg.get("repeat", 1))
                iteration_dur = _compute_duration(
                    seg["segments"], variables, marker_duration, comp_cache, asset_cache,
                )
                total += repeat * iteration_dur

    return total


def _compute_content_hash(
    script: list[dict],
    variables: dict,
    meditation_name: str,
    stage_id: str = None,
    stage_variables: dict = None,
) -> str:
    """Hash that includes clip text_hashes so voice changes invalidate the cache."""
    from meditations.models import SpeechSegmentAudio, Stage, VariableRecording

    if stage_variables is None and stage_id:
        s = Stage.objects.filter(meditation_id=meditation_name, stage_id=stage_id).first()
        stage_variables = s.variables if s else {}
    if stage_variables is None:
        stage_variables = {}

    speech = _collect_speech_segments(script)
    clip_hashes = []

    for seg_id, seg_info in speech.items():
        var_refs = _get_stage_var_refs(seg_info["text"], stage_variables)

        if var_refs:
            var_vals = {}
            for var_name in var_refs:
                raw = variables.get(var_name)
                val = raw.get("value", None) if isinstance(raw, dict) else raw
                if val is not None:
                    var_vals[var_name] = str(val)
            variable_key = _make_variable_key(var_vals)
            rec = VariableRecording.objects.filter(
                meditation_id=meditation_name,
                stage__stage_id=stage_id if stage_id else None,
                seg_id=seg_id,
                variable_key=variable_key,
            ).select_related("audio_clip", "user_clip").first()
            if rec:
                if rec.user_clip:
                    clip_hashes.append(f"upload_{rec.user_clip.id}")
                elif rec.audio_clip:
                    clip_hashes.append(rec.audio_clip.text_hash)
        else:
            ssa = SpeechSegmentAudio.objects.filter(
                meditation_id=meditation_name,
                stage__stage_id=stage_id if stage_id else None,
                seg_id=seg_id,
            ).select_related("audio_clip", "user_clip").first()
            if ssa:
                if ssa.user_clip:
                    clip_hashes.append(f"upload_{ssa.user_clip.id}")
                elif ssa.audio_clip:
                    clip_hashes.append(ssa.audio_clip.text_hash)

    blob = json.dumps({"s": script, "v": variables, "c": sorted(clip_hashes)}, sort_keys=True)
    return hashlib.md5(blob.encode()).hexdigest()[:10]


def compute_stage_duration(
    meditation_name: str,
    stage_id: str,
    variables: dict = None,
    comp_cache: dict = None,
    asset_cache: dict = None,
) -> float:
    """Compute expected duration for a stage with the given variables."""
    from meditations.models import Stage

    try:
        stage = Stage.objects.get(meditation_id=meditation_name, stage_id=stage_id)
    except Stage.DoesNotExist:
        return 0
    script = stage.script or []
    stage_variables = stage.variables or {}
    merged_vars = _collect_variables(script)
    if variables:
        merged_vars.update(variables)
    if stage_variables.get("_conditions"):
        merged_vars["_conditions"] = stage_variables["_conditions"]
    if comp_cache is None:
        comp_cache = _preload_segment_durations(
            meditation_name, stage_id,
            variables=merged_vars, stage_variables=stage_variables,
        )
    if asset_cache is None:
        asset_cache = _preload_asset_durations(script)
    return _compute_duration(script, merged_vars, comp_cache=comp_cache, asset_cache=asset_cache)


def compute_variable_mins(meditation_name: str, stage_id: str) -> dict:
    """Compute minimum allowable values for variables used as section targetDuration.

    Returns a dict like:
        { "Duration": { "min_seconds": 312.5, "min_value": 5.21, "min_value_ceiled": 6,
                         "unit": "minutes", "incomplete": False } }
    """
    import math
    from meditations.models import Stage

    try:
        stage = Stage.objects.get(meditation_id=meditation_name, stage_id=stage_id)
    except Stage.DoesNotExist:
        return {}

    script = stage.script or []
    stage_variables = stage.variables or {}
    merged_vars = _collect_variables(script)
    merged_vars.update(stage_variables)
    if stage_variables.get("_conditions"):
        merged_vars["_conditions"] = stage_variables["_conditions"]

    comp_cache = _preload_segment_durations(
        meditation_name, stage_id,
        variables=merged_vars, stage_variables=stage_variables,
    )
    asset_cache = _preload_asset_durations(script)

    # Collect fixed durations per variable, tracking which section drives the constraint
    mins = {}  # var_name -> min_seconds
    section_labels = {}  # var_name -> section label that sets the highest min
    fixed_durations = {}  # var_name -> fixed duration in friendly format
    missing = {}  # var_name -> True if any speech segment has no cached duration

    def _walk(segments):
        for seg in segments:
            if seg.get("type") != "loop":
                continue
            is_section = bool(seg.get("label"))
            target = seg.get("targetDuration")

            if target is not None and is_section and isinstance(target, str):
                match = re.match(r"^\{(\w+)\}$", target)
                if match and match.group(1) in stage_variables:
                    var_name = match.group(1)
                    fixed = _compute_duration(
                        seg["segments"], merged_vars,
                        marker_duration=0,
                        comp_cache=comp_cache, asset_cache=asset_cache,
                    )
                    if fixed > mins.get(var_name, 0):
                        mins[var_name] = fixed
                        section_labels[var_name] = seg.get("label", "section")
                        fixed_durations[var_name] = fixed
                    # Check for missing audio
                    if not missing.get(var_name):
                        missing[var_name] = _has_missing_audio(seg["segments"], comp_cache)

            _walk(seg.get("segments", []))

    _walk(script)

    result = {}
    for var_name, min_secs in mins.items():
        var_data = stage_variables.get(var_name, {})
        unit = var_data.get("unit", "seconds") if isinstance(var_data, dict) else "seconds"
        multiplier = UNIT_MULTIPLIERS.get(unit, 1)
        min_value = min_secs / multiplier if multiplier else min_secs
        min_value_ceiled = math.ceil(min_value)
        fixed_secs = fixed_durations.get(var_name, min_secs)
        fixed_in_unit = math.ceil(fixed_secs / multiplier) if multiplier else math.ceil(fixed_secs)
        unit_label = {"seconds": "sec", "minutes": "min", "hours": "hr"}.get(unit, "")
        fixed_display = f"{fixed_in_unit} {unit_label}".strip()
        result[var_name] = {
            "min_seconds": round(min_secs, 1),
            "min_value": round(min_value, 2),
            "min_value_ceiled": min_value_ceiled,
            "unit": unit,
            "incomplete": bool(missing.get(var_name)),
            "section_label": section_labels.get(var_name, "section"),
            "fixed_duration": fixed_display,
        }
    return result


def _has_missing_audio(segments, comp_cache):
    """Check if any speech segment in segments has no cached duration."""
    for seg in segments:
        if seg["type"] == "speech" and comp_cache.get(seg["id"], 0) == 0:
            return True
        if seg["type"] == "loop":
            if _has_missing_audio(seg.get("segments", []), comp_cache):
                return True
    return False


def assemble(
    script: list[dict],
    meditation_name: str,
    stage_id: str = None,
    variables: dict = None,
) -> AudioSegment:
    from meditations.models import Stage

    if variables is None:
        variables = _collect_variables(script)

    stage_variables = {}
    if stage_id:
        s = Stage.objects.filter(meditation_id=meditation_name, stage_id=stage_id).first()
        if s:
            stage_variables = s.variables or {}

    # Inject named conditions into variables for _evaluate_condition
    if stage_variables.get("_conditions"):
        variables["_conditions"] = stage_variables["_conditions"]

    return _assemble_segments(
        script, meditation_name, stage_id,
        variables=variables, stage_variables=stage_variables,
    )
