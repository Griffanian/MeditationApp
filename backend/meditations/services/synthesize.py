import base64
import hashlib
import io
import json
import os
import re
from pathlib import Path

from elevenlabs import ElevenLabs
from pydub import AudioSegment

from . import storage


DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"  # Sarah - Mature, Reassuring, Confident

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


UNIT_MULTIPLIERS = {"minutes": 60, "seconds": 1}


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
            # Handle variable objects with value/unit/displayName
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
            speech[seg["id"]] = seg["text"]
        elif seg["type"] == "loop":
            speech.update(_collect_speech_segments(seg["segments"]))
    return speech


def generate_components(
    script: list[dict],
    meditation_name: str,
    stage_id: str = None,
    voice: str = DEFAULT_VOICE,
    extra_variables: dict = None,
):
    """Generate and cache speech components + word timestamps.

    Stores audio in Supabase Storage and metadata in the Component model.
    """
    from meditations.models import Component, Meditation, Stage

    client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

    meditation = Meditation.objects.get(name=meditation_name)
    stage = None
    if stage_id:
        stage = Stage.objects.get(meditation=meditation, stage_id=stage_id)

    variables = _collect_variables(script)
    if extra_variables:
        variables.update(extra_variables)
    speech_segments = _collect_speech_segments(script)
    total = len(speech_segments)

    for i, (seg_id, raw_text) in enumerate(speech_segments.items()):
        text = _substitute_variables(raw_text, variables)
        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]

        component, _ = Component.objects.get_or_create(
            meditation=meditation, stage=stage, seg_id=seg_id,
        )

        # Check if cached version matches current text
        if component.audio_file and component.text_hash == text_hash:
            print(f"  [{i + 1}/{total}] cached: {seg_id}")
            continue

        print(f'  [{i + 1}/{total}] generating: "{text[:50]}..."')

        response = client.text_to_speech.convert_with_timestamps(
            text=text,
            voice_id=voice,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )

        # Re-encode audio at 192k bitrate
        audio_bytes = base64.b64decode(response.audio_base_64)
        audio = AudioSegment.from_mp3(io.BytesIO(audio_bytes))
        buf = io.BytesIO()
        audio.export(buf, format="mp3", bitrate="192k")
        buf.seek(0)

        # Upload to Supabase Storage
        file_path = storage.component_path(meditation_name, seg_id, stage_id)
        storage.upload_file(file_path, buf.read(), content_type="audio/mpeg")

        # Build word-level timestamps
        words = _chars_to_words(response.alignment)

        # Update component record
        component.text_hash = text_hash
        component.timestamps = words
        component.audio_file = file_path
        component.save()


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


def _apply_trim(audio: AudioSegment, trim_meta: dict) -> AudioSegment:
    if trim_meta and "start" in trim_meta and "end" in trim_meta:
        start_ms = int(trim_meta["start"] * 1000)
        end_ms = int(trim_meta["end"] * 1000)
        return audio[start_ms:end_ms]
    return audio


def _count_markers(segments: list[dict], variables: dict) -> int:
    """Count effective split markers, accounting for loop repeats."""
    count = 0
    for seg in segments:
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
) -> AudioSegment:
    from meditations.models import Asset, Component

    if variables is None:
        variables = {}
    combined = AudioSegment.empty()

    for seg in segments:
        seg_type = seg["type"]

        if seg_type == "speech":
            component = Component.objects.get(
                meditation_id=meditation_name,
                stage__stage_id=stage_id if stage_id else None,
                seg_id=seg["id"],
            )
            audio_data = storage.download_file(component.audio_file.name)
            audio = AudioSegment.from_mp3(io.BytesIO(audio_data))
            audio = _apply_trim(audio, component.trim_meta)
            combined += audio

        elif seg_type == "pause":
            duration = seg["duration_seconds"]
            if isinstance(duration, str):
                match = re.match(r"^\{(\w+)\}$", duration)
                if match and match.group(1) in variables:
                    duration = _resolve_var(variables[match.group(1)])
                else:
                    duration = float(duration) if duration.replace(".", "").isdigit() else 0
            combined += AudioSegment.silent(duration=int(float(duration) * 1000))

        elif seg_type == "split_marker":
            if marker_duration is not None:
                mult = seg.get("multiplier", 1)
                combined += AudioSegment.silent(duration=int(marker_duration * mult * 1000))

        elif seg_type == "asset":
            try:
                asset = Asset.objects.get(filename=seg["file"])
                audio_data = storage.download_file(asset.audio_file.name)
                audio = AudioSegment.from_mp3(io.BytesIO(audio_data))
                audio = _apply_trim(audio, asset.trim_meta)
                combined += audio
            except Asset.DoesNotExist:
                # Fallback to local assets directory
                from django.conf import settings
                asset_path = settings.BASE_DIR / "assets" / seg["file"]
                if asset_path.exists():
                    audio = AudioSegment.from_mp3(asset_path)
                    combined += audio

        elif seg_type == "loop":
            target = seg.get("targetDuration")

            if target is not None:
                # Section with a target duration — two-pass split
                # Resolve variable reference like {varName}
                if isinstance(target, str):
                    match = re.match(r"^\{(\w+)\}$", target)
                    if match and match.group(1) in variables:
                        target = _resolve_var(variables[match.group(1)])
                target_seconds = float(target)
                num_markers = _count_markers(seg["segments"], variables)

                if num_markers > 0:
                    # Pass 1: assemble with 0-duration markers to get fixed duration
                    fixed_audio = _assemble_segments(
                        seg["segments"], meditation_name, stage_id,
                        depth + 1, variables, marker_duration=0,
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

                    # Pass 2: assemble with computed marker durations
                    combined += _assemble_segments(
                        seg["segments"], meditation_name, stage_id,
                        depth + 1, variables, marker_duration=per_marker,
                    )
                else:
                    # No markers — assemble normally
                    combined += _assemble_segments(
                        seg["segments"], meditation_name, stage_id,
                        depth + 1, variables, marker_duration=marker_duration,
                    )
            else:
                # Standard loop logic
                var_name = seg.get("variable")
                if var_name and var_name in variables:
                    repeat = int(_resolve_var(variables[var_name]))
                else:
                    repeat = seg.get("repeat", 1)
                iteration = _assemble_segments(
                    seg["segments"], meditation_name, stage_id,
                    depth + 1, variables, marker_duration=marker_duration,
                )
                for _ in range(repeat):
                    combined += iteration

    return combined


def assemble(
    script: list[dict],
    meditation_name: str,
    stage_id: str = None,
    variables: dict = None,
) -> AudioSegment:
    if variables is None:
        variables = _collect_variables(script)
    return _assemble_segments(script, meditation_name, stage_id, variables=variables)
