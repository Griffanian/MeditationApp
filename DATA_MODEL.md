# MeditationApp Data Model

## Overview

The app manages guided meditation audio. Each meditation has instructions, a script (timeline of segments), variables, and generated audio components.

---

## Directory Structure

```
output/
  {meditation_name}/                    # e.g. "kapalbhati"
    meta.json                           # Display name, category
    instructions.json                   # Explanation + stage instructions
    script.json                         # Root-level script (legacy, pre-stages)
    components/                         # Root-level generated audio
      {seg_id}.mp3
      {seg_id}_hash.txt
      {seg_id}_timestamps.json
      {seg_id}_trim.json
    stages/
      {stage_id}/                       # e.g. "abdominal-breathing"
        script.json                     # Stage script (segment tree)
        variables.json                  # Stage variables
        components/                     # Stage generated audio
          {seg_id}.mp3
          {seg_id}_hash.txt
          {seg_id}_timestamps.json
          {seg_id}_trim.json
        output_{hash}.mp3               # Cached assembled stage audio
    output_{hash}.mp3                   # Cached assembled full audio

assets/                                 # Global reusable audio files
  {filename}.mp3                        # e.g. "and_out.mp3"
  {filename}_trim.json
```

---

## Data Structures

### meta.json

Meditation-level metadata.

| Field | Type | Description |
|-------|------|-------------|
| `display_name` | string | Human-readable name (e.g. "Kapalbhati") |
| `category` | string | Classification (e.g. "pranayama", "uncategorised") |

### instructions.json

User-facing instructions for the meditation.

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Overall explanation of the practice (markdown) |
| `stages` | array | Per-stage instructions |

**stages[] fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Stage identifier (matches directory name under `stages/`) |
| `name` | string | Display name (e.g. "1. Abdominal Breathing") |
| `description` | string | What this stage is about (markdown) |
| `directions` | string | Step-by-step instructions (markdown) |
| `progression` | string | How to progress over time (markdown) |

### script.json

The meditation timeline. A recursive tree of segments stored as a JSON array.

#### Segment Types

**Speech**

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"speech"` | |
| `id` | string | Unique ID. Legacy segments have readable IDs like `"welcome"`, new ones use UUIDs |
| `text` | string | Text to synthesize. Can contain `{variableName}` placeholders |

**Pause**

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"pause"` | |
| `id` | string | UUID |
| `duration_seconds` | number or string | Duration in seconds, or `"{variableName}"` for dynamic pauses |

**Asset**

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"asset"` | |
| `id` | string | UUID |
| `file` | string | Filename in `assets/` directory (e.g. `"and_out.mp3"`) |
| `label` | string (optional) | Display label override |

**Loop / Section**

Both loops and sections use `type: "loop"`. A section is a loop with a `label` and `repeat: 1`.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"loop"` | |
| `id` | string | UUID |
| `repeat` | integer | Number of repetitions (1 for sections) |
| `segments` | array | Nested child segments |
| `label` | string (optional) | If present, renders as a named section instead of a loop |
| `variable` | string (optional) | Variable name that controls repeat count (e.g. `"roundsNum"`) |
| `variableDisplayName` | string (optional) | UI label for the variable |

### variables.json

Per-stage variables that can be referenced in speech text and pause durations.

```json
{
  "roundsNum": { "value": 3, "displayName": "Rounds" },
  "breathsNum": { "value": 10, "displayName": "Breaths" }
}
```

| Field | Type | Description |
|-------|------|-------------|
| *(key)* | string | Variable name (referenced as `{name}` in scripts) |
| `value` | number or string | Current value |
| `displayName` | string | UI label |

### Component Files

For each speech segment, the backend generates and caches:

| File | Description |
|------|-------------|
| `{seg_id}.mp3` | Synthesized speech audio (ElevenLabs TTS) |
| `{seg_id}_hash.txt` | MD5 hash (first 8 chars) of the substituted text. Used to detect staleness |
| `{seg_id}_timestamps.json` | Word-level timing data from ElevenLabs |
| `{seg_id}_trim.json` | Optional trim start/end in seconds |

**Timestamps format:**

```json
[
  { "word": "Welcome", "start": 0.0, "end": 0.72 },
  { "word": "to", "start": 0.72, "end": 0.848 }
]
```

**Component status** (returned by API):
- `"missing"` — no audio file exists
- `"current"` — audio exists and hash matches current text
- `"stale"` — audio exists but text has changed (hash mismatch)

---

## API Endpoints

### Meditations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meditations` | List all meditations |
| GET | `/api/meditations/{name}/meta` | Get metadata |
| PUT | `/api/meditations/{name}/meta` | Update metadata |
| GET | `/api/meditations/{name}/instructions` | Get instructions |
| PUT | `/api/meditations/{name}/instructions` | Update instructions |
| GET | `/api/meditations/{name}/script` | Get root script |
| PUT | `/api/meditations/{name}/script` | Update root script |
| PUT | `/api/meditations/{name}/loops` | Update loop repeat counts |
| POST | `/api/meditations/{name}/assemble` | Assemble full audio |

### Stages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meditations/{name}/stages/{stage_id}/script` | Get stage script |
| PUT | `/api/meditations/{name}/stages/{stage_id}/script` | Update stage script |
| GET | `/api/meditations/{name}/stages/{stage_id}/variables` | Get stage variables |
| PUT | `/api/meditations/{name}/stages/{stage_id}/variables` | Update stage variables |
| GET | `/api/meditations/{name}/stages/{stage_id}/components` | Get component statuses |
| GET | `/api/meditations/{name}/stages/{stage_id}/timestamps/{seg_id}` | Get word timestamps |

### Audio Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/meditations/{name}/stages/{stage_id}/generate-audio/{seg_id}` | Generate TTS audio |
| POST | `/api/meditations/{name}/stages/{stage_id}/upload-component/{seg_id}` | Upload custom audio |
| DELETE | `/api/meditations/{name}/stages/{stage_id}/delete-component/{seg_id}` | Delete component |
| POST | `/api/meditations/{name}/stages/{stage_id}/assemble` | Assemble stage audio |

### Trim

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meditations/{name}/stages/{stage_id}/trim-meta/{seg_id}` | Get trim data |
| PUT | `/api/meditations/{name}/stages/{stage_id}/trim-meta/{seg_id}` | Set trim data |
| DELETE | `/api/meditations/{name}/stages/{stage_id}/trim-meta/{seg_id}` | Remove trim |

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload-asset/{filename}` | Upload global asset |
| GET/PUT/DELETE | `/api/trim-meta/asset/{filename}` | Asset trim metadata |
| POST | `/api/trim-asset/{filename}` | Trim asset file in-place |

### Audio Serving

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audio/meditation/{name}/stage/{stage_id}/component/{file}` | Stage component audio |
| GET | `/audio/meditation/{name}/stage/{stage_id}/output/{file}` | Assembled stage audio |
| GET | `/audio/meditation/{name}/component/{file}` | Root component audio |
| GET | `/audio/asset/{file}` | Global asset audio |

---

## Pipelines

### Variable Substitution

1. Script contains `{variableName}` placeholders in speech text and pause durations
2. Loop segments define which variable controls their repeat count (`variable` field)
3. `variables.json` stores current values for each variable
4. During TTS generation, `synthesize.py` substitutes variables (numbers become words: 3 → "three")
5. MD5 hash of substituted text is stored — if variables change, hash differs, audio is marked stale

### Audio Generation

1. User edits speech text or triggers generation in the UI
2. Backend calls ElevenLabs TTS API with the substituted text
3. Saves `.mp3`, `_hash.txt` (cache key), and `_timestamps.json` (word timings)
4. Component status becomes `"current"`
5. If text changes later, hash won't match → status becomes `"stale"`

### Assembly

1. User clicks "Assemble" on a stage
2. Backend regenerates any stale components
3. Computes a hash of the full script + components for caching
4. If `output_{hash}.mp3` exists, returns cached result
5. Otherwise, recursively assembles: speech audio + pauses + assets + loops
6. Applies trim metadata where present
7. Returns filename and duration
