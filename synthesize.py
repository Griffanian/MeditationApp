import base64
import hashlib
import io
import json
import os
import re
from pathlib import Path

from elevenlabs import ElevenLabs
from pydub import AudioSegment


DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"  # Sarah - Mature, Reassuring, Confident
ASSETS_DIR = Path(__file__).parent / "assets"

# Number words for substitution
_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
         'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
         'seventeen', 'eighteen', 'nineteen']
_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']


def _number_to_words(n: int) -> str:
    if n < 20:
        return _ONES[n]
    if n < 100:
        return _TENS[n // 10] + ('' if n % 10 == 0 else '-' + _ONES[n % 10])
    if n < 1000:
        return _ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' and ' + _number_to_words(n % 100))
    return str(n)


def _collect_variables(segments: list[dict]) -> dict:
    """Walk the script tree and collect variable name -> repeat count."""
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
    """Replace {VAR} placeholders with variable values."""
    def replace(match):
        var_name = match.group(1)
        if var_name in variables:
            val = variables[var_name]
            if isinstance(val, int):
                return _number_to_words(val)
            return str(val)
        return match.group(0)
    return re.sub(r'\{(\w+)\}', replace, text)


def _collect_speech_segments(segments: list[dict]) -> dict:
    """Walk the script tree and collect unique speech segments by id."""
    speech = {}
    for seg in segments:
        if seg["type"] == "speech":
            speech[seg["id"]] = seg["text"]
        elif seg["type"] == "loop":
            speech.update(_collect_speech_segments(seg["segments"]))
    return speech


def generate_components(script: list[dict], output_dir: Path, voice: str = DEFAULT_VOICE, extra_variables: dict = None):
    """Generate and cache speech components + word timestamps for a script.

    Substitutes variables into text. Caches by content hash so changing
    variable values regenerates only the affected segments.
    """
    client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
    output_dir.mkdir(parents=True, exist_ok=True)

    variables = _collect_variables(script)
    if extra_variables:
        variables.update(extra_variables)
    speech_segments = _collect_speech_segments(script)
    total = len(speech_segments)

    for i, (seg_id, raw_text) in enumerate(speech_segments.items()):
        text = _substitute_variables(raw_text, variables)
        # Hash the substituted text to detect changes
        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        hash_path = output_dir / f"{seg_id}_hash.txt"
        clip_path = output_dir / f"{seg_id}.mp3"
        timestamps_path = output_dir / f"{seg_id}_timestamps.json"

        # Check if cached version matches current text
        if clip_path.exists() and timestamps_path.exists() and hash_path.exists():
            if hash_path.read_text().strip() == text_hash:
                print(f"  [{i + 1}/{total}] cached: {seg_id}")
                continue

        print(f'  [{i + 1}/{total}] generating: "{text[:50]}..."')

        response = client.text_to_speech.convert_with_timestamps(
            text=text,
            voice_id=voice,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )

        # Save audio
        audio_bytes = base64.b64decode(response.audio_base_64)
        audio = AudioSegment.from_mp3(io.BytesIO(audio_bytes))
        audio.export(str(clip_path), format="mp3", bitrate="192k")

        # Save text hash
        hash_path.write_text(text_hash)

        # Build word-level timestamps from character alignment
        words = _chars_to_words(response.alignment)
        timestamps_path.write_text(json.dumps(words, indent=2))


def _chars_to_words(alignment) -> list[dict]:
    """Convert character-level alignment to word-level timestamps."""
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
                words.append({
                    "word": current_word,
                    "start": word_start,
                    "end": end,
                })
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


def _apply_trim(audio: AudioSegment, trim_path: Path) -> AudioSegment:
    """Apply trim metadata if it exists, otherwise return audio unchanged."""
    if trim_path.exists():
        trim = json.loads(trim_path.read_text())
        if "start" in trim and "end" in trim:
            start_ms = int(trim["start"] * 1000)
            end_ms = int(trim["end"] * 1000)
            print(f"    (trimmed {trim['start']:.1f}s–{trim['end']:.1f}s)")
            return audio[start_ms:end_ms]
    return audio


def _assemble_segments(segments: list[dict], components_dir: Path, depth: int = 0, variables: dict = None) -> AudioSegment:
    """Recursively assemble segments, handling loops."""
    if variables is None:
        variables = {}
    combined = AudioSegment.empty()
    indent = "  " * (depth + 1)

    for seg in segments:
        seg_type = seg["type"]

        if seg_type == "speech":
            clip_path = components_dir / f"{seg['id']}.mp3"
            print(f"{indent}[speech] {seg['id']}")
            audio = AudioSegment.from_mp3(clip_path)
            audio = _apply_trim(audio, components_dir / f"{seg['id']}_trim.json")
            combined += audio

        elif seg_type == "pause":
            duration = seg["duration_seconds"]
            # Resolve variable references in pause duration
            if isinstance(duration, str):
                match = re.match(r'^\{(\w+)\}$', duration)
                if match and match.group(1) in variables:
                    duration = variables[match.group(1)]
                else:
                    duration = float(duration) if duration.replace('.', '').isdigit() else 0
            print(f"{indent}[pause] {duration}s")
            combined += AudioSegment.silent(duration=int(duration * 1000))

        elif seg_type == "asset":
            asset_path = ASSETS_DIR / seg["file"]
            print(f"{indent}[asset] {seg['file']}")
            audio = AudioSegment.from_mp3(asset_path)
            audio = _apply_trim(audio, ASSETS_DIR / f"{seg['file']}_trim.json")
            combined += audio

        elif seg_type == "loop":
            var_name = seg.get("variable")
            if var_name and var_name in variables:
                repeat = int(variables[var_name])
            else:
                repeat = seg.get("repeat", 1)
            print(f"{indent}[loop] {repeat}x")
            iteration = _assemble_segments(seg["segments"], components_dir, depth + 1, variables)
            for j in range(repeat):
                print(f"{indent}  iteration {j + 1}/{repeat}")
                combined += iteration

        else:
            print(f"{indent}[unknown] skipping")

    return combined


def assemble(script: list[dict], components_dir: Path, variables: dict = None) -> AudioSegment:
    """Assemble a final audio track from cached components and assets.

    No API calls — purely local file operations.
    """
    if variables is None:
        variables = _collect_variables(script)
    print("Assembling...")
    return _assemble_segments(script, components_dir, variables=variables)
