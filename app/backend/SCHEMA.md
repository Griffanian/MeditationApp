# Backend Data Model

## `Voice`

A registered ElevenLabs TTS voice. Keyed by the provider's own voice ID.

| Field          | Type      | Notes                                    |
| -------------- | --------- | ---------------------------------------- |
| `id`           | `char` PK | ElevenLabs voice ID                      |
| `provider`     | `char`    | `"elevenlabs"`                           |
| `display_name` | `char`    | Human-readable name shown in the UI      |

---

## `GeneratedVoiceClip`

Content-addressed AI-generated TTS audio. **Never deleted.** Identified purely by text hash — if two segments produce the same spoken text, they share one clip.


| Field        | Type          | Notes                                          |
| ------------ | ------------- | ---------------------------------------------- |
| `text_hash`  | `char(16)` PK | `md5(text + "\" + direction + "\" + voice_id)` |
| `voice`      | FK → Voice    | Which voice generated this clip                |
| `audio_file` | `FileField`   | `audio/clips/{text_hash}.mp3`                  |
| `timestamps` | `JSON`        | Word-level timing from ElevenLabs              |
| `duration`   | `float`       | Full clip duration in seconds                  |

---

## `UserUploadedClip`

User-recorded or user-uploaded audio. Deleted explicitly in application code when its parent row (`VariableRecording` or `SpeechSegmentAudio`) is deleted — there is no DB-level CASCADE.

| Field        | Type        | Notes                    |
| ------------ | ----------- | ------------------------ |
| `id`         | PK          | Auto                     |
| `audio_file` | `FileField` | `audio/uploads/{id}.mp3` |
| `duration`   | `float`     |                          |
| `created_at` | `datetime`  |                          |

---

## `SpeechSegmentAudio`

One row per **fixed** speech segment (text with no variable references). Owns the clip and trim directly. Variable segments are handled entirely by `VariableRecording` — no `SpeechSegmentAudio` row is needed for them.


| Field        | Type                                           | Notes                                                   |
| ------------ | ---------------------------------------------- | ------------------------------------------------------- |
| `id`         | PK                                             | Auto                                                    |
| `meditation` | FK → Meditation                                |                                                         |
| `stage`      | FK → Stage (nullable)                          |                                                         |
| `seg_id`     | `char`                                         | The speech segment ID from the script                   |
| `audio_clip` | FK → GeneratedVoiceClip (nullable, `SET_NULL`) | Active AI clip                                          |
| `user_clip`  | FK → UserUploadedClip (nullable, `SET_NULL`)   | Active uploaded clip — takes priority. Deleted explicitly in code when clearing/deleting this row. |
| `trim_start` | `float` (nullable)                             |                                                         |
| `trim_end`   | `float` (nullable)                             |                                                         |

**Unique on** `(meditation, stage, seg_id)`

---

## `VariableRecording`

One row per `(segment, variable position, value)`. Each slot is filled by either a generated clip (voices tab) or a user-uploaded clip (uploaded tab) — never both at once. Switching tabs replaces the current recording.

| Field            | Type                                           | Notes                                                                                     |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `id`             | PK                                             | Auto                                                                                      |
| `meditation`     | FK → Meditation                                |                                                                                           |
| `stage`          | FK → Stage (nullable)                          |                                                                                           |
| `seg_id`         | `char`                                         | Which speech segment                                                                      |
| `variable_name`  | `char`                                         | e.g. `"phaseDuration"` — name of the `{var}` ref this recording covers                    |
| `variable_order` | `int`                                          | 0-indexed position of this variable reference in the segment text                         |
| `variable_value` | `char`                                         | e.g. `"4"`                                                                                |
| `voice`          | FK → Voice (nullable)                          | Set when source is `"generated"`; null when source is `"uploaded"`                        |
| `audio_clip`     | FK → GeneratedVoiceClip (nullable, `SET_NULL`) | Set when source is `"generated"`                                                          |
| `user_clip`      | FK → UserUploadedClip (nullable, `SET_NULL`)   | Set when source is `"uploaded"`. Deleted explicitly in code when this row is deleted.     |
| `trim_start`     | `float` (nullable)                             | Defaults to `0.0` on creation                                                             |
| `trim_end`       | `float` (nullable)                             | Defaults to clip duration on creation                                                     |
| `source`         | `char`                                         | `"generated"` or `"uploaded"`                                                             |

**Unique on** `(meditation, stage, seg_id, variable_order, variable_value)`

> For a segment with refs `[{phaseDuration}, {breakDuration}]`, `variable_order=0` → phaseDuration recording, `variable_order=1` → breakDuration recording.

---

## Lifecycle Rules

**Fixed segments** (`SpeechSegmentAudio`)

| Action | Effect |
| ------ | ------ |
| Generate fixed segment | Find or create `GeneratedVoiceClip` by text hash. Create/update `SpeechSegmentAudio` with `audio_clip` set, `trim_start=0, trim_end=duration`. |
| Upload fixed segment | Create `UserUploadedClip`. Update `SpeechSegmentAudio.user_clip`. |
| Assembly | Read `SpeechSegmentAudio.user_clip ?? audio_clip`, apply `trim_start/trim_end`. |
| User edits trim | Update `SpeechSegmentAudio.trim_start/trim_end` directly. |
| Delete fixed segment clip | Clear `SpeechSegmentAudio.audio_clip` or `user_clip`. `GeneratedVoiceClip` stays. Delete `UserUploadedClip` explicitly in code before clearing the FK. |

**Variable segments** (`VariableRecording`)

| Action | Effect |
| ------ | ------ |
| Generate value=4 | Find or create `GeneratedVoiceClip` by text hash. Create `VariableRecording` with `audio_clip` set, `trim_start=0, trim_end=duration`. |
| Upload value=4 | Create `UserUploadedClip`. Create/update `VariableRecording` with `user_clip` set. |
| Assembly with phaseDuration=4 | Look up `VariableRecording` for `(seg_id, variable_name, value=4)`. Read `user_clip ?? audio_clip`, apply `trim_start/trim_end`. No `SpeechSegmentAudio` involved. |
| User edits trim | Update `VariableRecording.trim_start/trim_end` directly. |
| Delete generated row | Delete `VariableRecording` only. `GeneratedVoiceClip` stays. |
| Delete uploaded row | Delete `UserUploadedClip` + file explicitly, then delete `VariableRecording`. |

---

## Other Models (brief)

### `Meditation`

Top-level content item. Has a `script` (JSON) and metadata.

### `Stage`

A sub-section of a Meditation. Has its own `script` and `variables` (JSON, default values for variable segments).

### `Asset`

A static audio file (music, sound effects). Has `audio_file` and `trim_meta`.

### `AssembledOutput`

A fully assembled MP3. Cached so repeated plays don't re-assemble. Keyed by `(meditation, stage, content_hash)` where `content_hash = md5(script_json + sorted(text_hash for each linked clip))`. Any change to the script structure or any linked clip (including voice changes) produces a different hash and triggers a fresh assembly.

### `Practice`

A structured programme (weeks/days) referencing multiple Meditation stages with variable overrides.
