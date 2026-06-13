import hashlib
import json
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

from synthesize import assemble, generate_components

load_dotenv()

app = Flask(__name__)

OUTPUT_DIR = Path("output")
ASSETS_DIR = Path("assets")


def med_dir(name):
    return OUTPUT_DIR / name


def stage_dir(name, stage_id):
    return med_dir(name) / "stages" / stage_id


def components_dir(name, stage_id=None):
    if stage_id:
        return stage_dir(name, stage_id) / "components"
    return med_dir(name) / "components"


def script_path(name, stage_id=None):
    if stage_id:
        return stage_dir(name, stage_id) / "script.json"
    return med_dir(name) / "script.json"


# --- Meditations list ---

@app.route("/api/meditations")
def list_meditations():
    meds = []
    if OUTPUT_DIR.exists():
        for d in sorted(OUTPUT_DIR.iterdir()):
            sp = d / "script.json"
            if d.is_dir() and sp.exists():
                script = json.loads(sp.read_text())
                loops = _extract_loops(script)
                meta_path = d / "meta.json"
                meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
                meds.append({
                    "name": d.name,
                    "display_name": meta.get("display_name", d.name.capitalize()),
                    "category": meta.get("category", "uncategorised"),
                    "loops": loops,
                })
    return jsonify(meds)


def _extract_loops(segments):
    """Extract loop repeat counts from the script tree."""
    result = []
    for seg in segments:
        if seg["type"] == "loop":
            result.append({
                "variable": seg.get("variable", ""),
                "displayName": seg.get("variableDisplayName", seg.get("variable", "")),
                "repeat": seg.get("repeat", 1),
                "children": _extract_loops(seg.get("segments", [])),
            })
    return result


# --- Per-meditation endpoints ---

@app.route("/api/meditations/<name>/loops", methods=["PUT"])
def update_loops(name):
    """Update loop repeat counts without touching the rest of the script."""
    sp = script_path(name)
    if not sp.exists():
        return jsonify({"error": "not found"}), 404
    script = json.loads(sp.read_text())
    new_loops = request.json  # e.g. [{"repeat": 5, "children": [{"repeat": 12}]}]
    _apply_loops(script, new_loops)
    sp.write_text(json.dumps(script, indent=2))
    return jsonify({"status": "ok"})


def _apply_loops(segments, loop_updates):
    """Recursively apply loop repeat counts to matching loops in the script."""
    loop_idx = 0
    for seg in segments:
        if seg["type"] == "loop" and loop_idx < len(loop_updates):
            seg["repeat"] = loop_updates[loop_idx].get("repeat", seg["repeat"])
            children = loop_updates[loop_idx].get("children", [])
            if children:
                _apply_loops(seg.get("segments", []), children)
            loop_idx += 1


@app.route("/api/meditations/<name>/meta")
def get_meta(name):
    meta_path = med_dir(name) / "meta.json"
    if meta_path.exists():
        return jsonify(json.loads(meta_path.read_text()))
    return jsonify({})


@app.route("/api/meditations/<name>/meta", methods=["PUT"])
def update_meta(name):
    d = med_dir(name)
    d.mkdir(parents=True, exist_ok=True)
    meta_path = d / "meta.json"
    existing = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    existing.update(request.json)
    meta_path.write_text(json.dumps(existing, indent=2))
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/instructions")
def get_instructions(name):
    path = med_dir(name) / "instructions.json"
    if path.exists():
        return jsonify(json.loads(path.read_text()))
    return jsonify({"description": "", "stages": []})


@app.route("/api/meditations/<name>/instructions", methods=["PUT"])
def save_instructions(name):
    d = med_dir(name)
    d.mkdir(parents=True, exist_ok=True)
    (d / "instructions.json").write_text(json.dumps(request.json, indent=2))
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/script")
def get_script(name):
    sp = script_path(name)
    if not sp.exists():
        return jsonify([])
    return jsonify(json.loads(sp.read_text()))


# --- Per-stage endpoints ---

@app.route("/api/meditations/<name>/stages/<stage_id>/variables")
def get_stage_variables(name, stage_id):
    path = stage_dir(name, stage_id) / "variables.json"
    if path.exists():
        return jsonify(json.loads(path.read_text()))
    return jsonify({})


@app.route("/api/meditations/<name>/stages/<stage_id>/variables", methods=["PUT"])
def save_stage_variables(name, stage_id):
    d = stage_dir(name, stage_id)
    d.mkdir(parents=True, exist_ok=True)
    (d / "variables.json").write_text(json.dumps(request.json, indent=2))
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/stages/<stage_id>/script")
def get_stage_script(name, stage_id):
    sp = script_path(name, stage_id)
    if not sp.exists():
        return jsonify([])
    return jsonify(json.loads(sp.read_text()))


@app.route("/api/meditations/<name>/stages/<stage_id>/script", methods=["PUT"])
def update_stage_script(name, stage_id):
    d = stage_dir(name, stage_id)
    d.mkdir(parents=True, exist_ok=True)
    script_path(name, stage_id).write_text(json.dumps(request.json, indent=2))
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/stages/<stage_id>/components")
def list_stage_components(name, stage_id):
    """List speech components and whether their audio is current or stale."""
    import hashlib as _hashlib
    import re as _re
    cd = components_dir(name, stage_id)
    sp = script_path(name, stage_id)
    if not cd.exists() or not sp.exists():
        return jsonify({})

    script = json.loads(sp.read_text())
    from synthesize import _collect_variables, _collect_speech_segments, _substitute_variables
    variables = _collect_variables(script)
    # Merge standalone variables
    vars_path = stage_dir(name, stage_id) / "variables.json"
    if vars_path.exists():
        for k, v in json.loads(vars_path.read_text()).items():
            raw = v.get("value", v) if isinstance(v, dict) else v
            try:
                variables[k] = int(raw)
            except (ValueError, TypeError):
                variables[k] = raw
    speech = _collect_speech_segments(script)

    result = {}
    for seg_id, raw_text in speech.items():
        mp3_path = cd / f"{seg_id}.mp3"
        if not mp3_path.exists():
            result[seg_id] = "missing"
            continue
        has_vars = bool(_re.search(r'\{\w+\}', raw_text))
        if not has_vars:
            result[seg_id] = "current"
            continue
        substituted = _substitute_variables(raw_text, variables)
        current_hash = _hashlib.md5(substituted.encode()).hexdigest()[:8]
        hash_path = cd / f"{seg_id}_hash.txt"
        stored_hash = hash_path.read_text().strip() if hash_path.exists() else None
        result[seg_id] = "current" if stored_hash == current_hash else "stale"

    return jsonify(result)


@app.route("/api/meditations/<name>/stages/<stage_id>/timestamps/<seg_id>")
def get_stage_timestamps(name, stage_id, seg_id):
    path = components_dir(name, stage_id) / f"{seg_id}_timestamps.json"
    if path.exists():
        return jsonify(json.loads(path.read_text()))
    return jsonify([])


@app.route("/api/meditations/<name>/stages/<stage_id>/generate-audio/<seg_id>", methods=["POST"])
def generate_stage_audio(name, stage_id, seg_id):
    data = request.json
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "no text"}), 400
    # Load standalone variables
    vars_path = stage_dir(name, stage_id) / "variables.json"
    stage_vars = {}
    if vars_path.exists():
        for k, v in json.loads(vars_path.read_text()).items():
            raw = v.get("value", v) if isinstance(v, dict) else v
            try:
                stage_vars[k] = int(raw)
            except (ValueError, TypeError):
                stage_vars[k] = raw
    script = [{"type": "speech", "id": seg_id, "text": text}]
    try:
        generate_components(script, components_dir(name, stage_id), extra_variables=stage_vars)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/stages/<stage_id>/delete-component/<seg_id>", methods=["DELETE"])
def delete_stage_component(name, stage_id, seg_id):
    cd = components_dir(name, stage_id)
    for suffix in ['.mp3', '_hash.txt', '_timestamps.json']:
        p = cd / f"{seg_id}{suffix}"
        if p.exists():
            p.unlink()
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/stages/<stage_id>/upload-component/<seg_id>", methods=["POST"])
def upload_stage_component(name, stage_id, seg_id):
    if 'file' not in request.files:
        return jsonify({"error": "no file"}), 400
    f = request.files['file']
    cd = components_dir(name, stage_id)
    cd.mkdir(parents=True, exist_ok=True)
    f.save(str(cd / f"{seg_id}.mp3"))
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/stages/<stage_id>/assemble", methods=["POST"])
def assemble_stage(name, stage_id):
    sp = script_path(name, stage_id)
    if not sp.exists():
        return jsonify({"error": "not found"}), 404
    script = json.loads(sp.read_text())
    cd = components_dir(name, stage_id)
    # Load standalone variables
    vars_path = stage_dir(name, stage_id) / "variables.json"
    stage_vars = {}
    if vars_path.exists():
        for k, v in json.loads(vars_path.read_text()).items():
            raw = v.get("value", v) if isinstance(v, dict) else v
            try:
                stage_vars[k] = int(raw)
            except (ValueError, TypeError):
                stage_vars[k] = raw
    generate_components(script, cd, extra_variables=stage_vars)
    h = _script_hash(script)
    output_filename = f"output_{h}.mp3"
    sd = stage_dir(name, stage_id)
    output_path = sd / output_filename
    if output_path.exists():
        from pydub import AudioSegment
        audio = AudioSegment.from_mp3(output_path)
        return jsonify({"status": "cached", "filename": output_filename, "duration": len(audio) / 1000})
    audio = assemble(script, cd, variables=stage_vars)
    audio.export(str(output_path), format="mp3", bitrate="192k")
    return jsonify({"status": "ok", "filename": output_filename, "duration": len(audio) / 1000})


@app.route("/api/meditations/<name>/stages/<stage_id>/trim-meta/<seg_id>")
def get_stage_trim_meta(name, stage_id, seg_id):
    path = components_dir(name, stage_id) / f"{seg_id}_trim.json"
    if path.exists():
        return jsonify(json.loads(path.read_text()))
    return jsonify({})


@app.route("/api/meditations/<name>/stages/<stage_id>/trim-meta/<seg_id>", methods=["PUT"])
def save_stage_trim_meta(name, stage_id, seg_id):
    cd = components_dir(name, stage_id)
    cd.mkdir(parents=True, exist_ok=True)
    (cd / f"{seg_id}_trim.json").write_text(json.dumps(request.json, indent=2))
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/stages/<stage_id>/trim-meta/<seg_id>", methods=["DELETE"])
def delete_stage_trim_meta(name, stage_id, seg_id):
    path = components_dir(name, stage_id) / f"{seg_id}_trim.json"
    if path.exists():
        path.unlink()
    return jsonify({"status": "ok"})


@app.route("/audio/meditation/<name>/stage/<stage_id>/component/<filename>")
def serve_stage_component(name, stage_id, filename):
    return send_from_directory(components_dir(name, stage_id), filename)


@app.route("/audio/meditation/<name>/stage/<stage_id>/output/<filename>")
def serve_stage_output(name, stage_id, filename):
    return send_from_directory(stage_dir(name, stage_id), filename)


@app.route("/api/meditations/<name>/components")
def list_components(name):
    """List speech components and whether their audio is current or stale."""
    import hashlib as _hashlib
    import re as _re
    cd = components_dir(name)
    sp = script_path(name)
    if not cd.exists() or not sp.exists():
        return jsonify({})

    script = json.loads(sp.read_text())

    # Collect variables and speech segments
    from synthesize import _collect_variables, _collect_speech_segments, _substitute_variables
    variables = _collect_variables(script)
    speech = _collect_speech_segments(script)

    result = {}
    for seg_id, raw_text in speech.items():
        mp3_path = cd / f"{seg_id}.mp3"
        if not mp3_path.exists():
            result[seg_id] = "missing"
            continue

        # Check if text has variables
        has_vars = bool(_re.search(r'\{\w+\}', raw_text))
        if not has_vars:
            result[seg_id] = "current"
            continue

        # Compare stored hash with current substituted text hash
        substituted = _substitute_variables(raw_text, variables)
        current_hash = _hashlib.md5(substituted.encode()).hexdigest()[:8]
        hash_path = cd / f"{seg_id}_hash.txt"
        stored_hash = hash_path.read_text().strip() if hash_path.exists() else None

        result[seg_id] = "current" if stored_hash == current_hash else "stale"

    return jsonify(result)


@app.route("/api/meditations/<name>/script", methods=["PUT"])
def update_script(name):
    med_dir(name).mkdir(parents=True, exist_ok=True)
    script_path(name).write_text(json.dumps(request.json, indent=2))
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/timestamps/<seg_id>")
def get_timestamps(name, seg_id):
    path = components_dir(name) / f"{seg_id}_timestamps.json"
    if path.exists():
        return jsonify(json.loads(path.read_text()))
    return jsonify([])


def _script_hash(script):
    """Hash the script to identify a specific version for caching."""
    return hashlib.md5(json.dumps(script, sort_keys=True).encode()).hexdigest()[:10]


@app.route("/api/meditations/<name>/assemble", methods=["POST"])
def run_assemble(name):
    sp = script_path(name)
    if not sp.exists():
        return jsonify({"error": "not found"}), 404
    script = json.loads(sp.read_text())
    h = _script_hash(script)
    output_filename = f"output_{h}.mp3"
    output_path = med_dir(name) / output_filename

    # Regenerate any speech components whose text changed due to variable substitution
    generate_components(script, components_dir(name))

    if output_path.exists():
        # Already assembled this exact version
        from pydub import AudioSegment
        audio = AudioSegment.from_mp3(output_path)
        return jsonify({
            "status": "cached",
            "filename": output_filename,
            "duration": len(audio) / 1000,
        })

    audio = assemble(script, components_dir(name))
    audio.export(str(output_path), format="mp3", bitrate="192k")
    return jsonify({
        "status": "ok",
        "filename": output_filename,
        "duration": len(audio) / 1000,
    })


@app.route("/api/meditations/<name>/generate-audio/<seg_id>", methods=["POST"])
def generate_single_audio(name, seg_id):
    """Generate TTS audio for a single speech segment."""
    data = request.json
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "no text"}), 400

    script = [{"type": "speech", "id": seg_id, "text": text}]
    generate_components(script, components_dir(name))
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/upload-component/<seg_id>", methods=["POST"])
def upload_component(name, seg_id):
    """Upload an MP3 file as a speech component."""
    if 'file' not in request.files:
        return jsonify({"error": "no file"}), 400
    f = request.files['file']
    cd = components_dir(name)
    cd.mkdir(parents=True, exist_ok=True)
    f.save(str(cd / f"{seg_id}.mp3"))
    return jsonify({"status": "ok"})


@app.route("/api/upload-asset/<filename>", methods=["POST"])
def upload_asset(filename):
    """Upload an MP3 file as an asset."""
    if 'file' not in request.files:
        return jsonify({"error": "no file"}), 400
    f = request.files['file']
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    f.save(str(ASSETS_DIR / filename))
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/trim-meta/<seg_id>")
def get_trim_meta(name, seg_id):
    path = components_dir(name) / f"{seg_id}_trim.json"
    if path.exists():
        return jsonify(json.loads(path.read_text()))
    return jsonify({})


@app.route("/api/meditations/<name>/trim-meta/<seg_id>", methods=["PUT"])
def save_trim_meta(name, seg_id):
    cd = components_dir(name)
    cd.mkdir(parents=True, exist_ok=True)
    (cd / f"{seg_id}_trim.json").write_text(json.dumps(request.json, indent=2))
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/trim-meta/<seg_id>", methods=["DELETE"])
def delete_trim_meta(name, seg_id):
    path = components_dir(name) / f"{seg_id}_trim.json"
    if path.exists():
        path.unlink()
    return jsonify({"status": "ok"})


@app.route("/api/trim-meta/asset/<filename>")
def get_asset_trim_meta(filename):
    path = ASSETS_DIR / f"{filename}_trim.json"
    if path.exists():
        return jsonify(json.loads(path.read_text()))
    return jsonify({})


@app.route("/api/trim-meta/asset/<filename>", methods=["PUT"])
def save_asset_trim_meta(filename):
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    (ASSETS_DIR / f"{filename}_trim.json").write_text(json.dumps(request.json, indent=2))
    return jsonify({"status": "ok"})


@app.route("/api/trim-meta/asset/<filename>", methods=["DELETE"])
def delete_asset_trim_meta(filename):
    path = ASSETS_DIR / f"{filename}_trim.json"
    if path.exists():
        path.unlink()
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/trim-component/<seg_id>", methods=["POST"])
def trim_component(name, seg_id):
    """Trim an audio component to a start/end range."""
    from pydub import AudioSegment
    data = request.json
    if not data or "start" not in data or "end" not in data:
        return jsonify({"error": "missing start/end"}), 400
    clip_path = components_dir(name) / f"{seg_id}.mp3"
    if not clip_path.exists():
        return jsonify({"error": "not found"}), 404
    start_ms = int(data["start"] * 1000)
    end_ms = int(data["end"] * 1000)
    audio = AudioSegment.from_mp3(clip_path)
    trimmed = audio[start_ms:end_ms]
    trimmed.export(str(clip_path), format="mp3", bitrate="192k")
    return jsonify({"status": "ok", "duration": len(trimmed) / 1000})


@app.route("/api/trim-asset/<filename>", methods=["POST"])
def trim_asset(filename):
    """Trim an asset audio file to a start/end range."""
    from pydub import AudioSegment
    data = request.json
    start_ms = int(data["start"] * 1000)
    end_ms = int(data["end"] * 1000)
    asset_path = ASSETS_DIR / filename
    if not asset_path.exists():
        return jsonify({"error": "not found"}), 404
    audio = AudioSegment.from_mp3(asset_path)
    trimmed = audio[start_ms:end_ms]
    trimmed.export(str(asset_path), format="mp3", bitrate="192k")
    return jsonify({"status": "ok", "duration": len(trimmed) / 1000})


@app.route("/api/meditations/<name>/instructions-pdf", methods=["POST"])
def upload_instructions_pdf(name):
    if 'file' not in request.files:
        return jsonify({"error": "no file"}), 400
    f = request.files['file']
    d = med_dir(name)
    d.mkdir(parents=True, exist_ok=True)
    f.save(str(d / "instructions.pdf"))
    return jsonify({"status": "ok"})


@app.route("/api/meditations/<name>/instructions-pdf")
def get_instructions_pdf_status(name):
    path = med_dir(name) / "instructions.pdf"
    return jsonify({"exists": path.exists()})


@app.route("/api/meditations/<name>/instructions-pdf", methods=["DELETE"])
def delete_instructions_pdf(name):
    path = med_dir(name) / "instructions.pdf"
    if path.exists():
        path.unlink()
    return jsonify({"status": "ok"})


@app.route("/pdf/meditation/<name>/instructions.pdf")
def serve_instructions_pdf(name):
    d = med_dir(name)
    path = d / "instructions.pdf"
    if not path.exists():
        return jsonify({"error": "not found"}), 404
    return send_from_directory(d, "instructions.pdf")


@app.route("/audio/meditation/<name>/component/<filename>")
def serve_component(name, filename):
    return send_from_directory(components_dir(name), filename)


@app.route("/audio/meditation/<name>/output/<filename>")
def serve_output(name, filename):
    return send_from_directory(med_dir(name), filename)


@app.route("/audio/asset/<filename>")
def serve_asset(filename):
    return send_from_directory(ASSETS_DIR, filename)


if __name__ == "__main__":
    app.run(debug=True, port=5555)
