"""Generate a stage script and variables from stage instructions using Claude."""

import json

import anthropic


SYSTEM_PROMPT = """You are a guided meditation script writer. Given a stage's instructions (description, directions, progression, contraindications), produce a structured timed script and the variables needed to control it.

Return a JSON object with two keys:

{
  "variables": {
    "variableName": {"value": 3, "displayName": "Human Readable Name"}
  },
  "script": [...]
}

The "script" array contains segments. Each segment must be one of these types:

1. {"type": "speech", "text": "...", "id": "unique_id"} — spoken instruction. The id must be unique across the script (e.g. "welcome", "round_intro", "rest_1").
2. {"type": "pause", "duration_seconds": N} — silent pause in seconds
3. {"type": "asset", "file": "and_out.mp3"} — play a pre-recorded audio clip from the assets folder
4. {"type": "loop", "variable": "X", "repeat": N, "segments": [...]} — repeat a sequence of segments N times. The "variable" field names this loop's count so it can be referenced. Segments inside can be any of these types including nested loops. Alternatively, a loop can have a "targetDuration" field instead of a repeat count — the loop will repeat its content enough times to fill the target duration (rounding up). Use "targetDurationUnit" ("seconds", "minutes", or "hours") to set the unit (default "seconds"). The value can also be a variable reference like "{duration}", in which case the variable's own unit applies.
5. Sections: {"type": "loop", "repeat": 1, "label": "Section Name", "segments": [...]} — a non-repeating group used to organize segments visually.

For rhythmic breath cues, use a loop containing an asset and a pause. For example, 9 breath cues at 1-second intervals:
{"type": "loop", "variable": "breathCount", "repeat": 9, "segments": [
    {"type": "asset", "file": "and_out.mp3"},
    {"type": "pause", "duration_seconds": 0.5}
]}

Variables:
- Variables exist to enable PROGRESSION — letting a coach increase difficulty over a programme (e.g. more rounds, longer holds between weeks). Be minimal: only create a variable when there is a clear knob a coach would turn. Do not create variables for things that stay fixed across the progression.
- Each variable has a numeric "value" (the default) and a "displayName" for the UI. Optional "unit" field: "minutes" (value × 60 for seconds), "seconds" (value as-is), or omit for unitless (rounds, reps). Optional "min" and "max" for range constraints.
- Reference variables in loops via the "variable" field — the loop's "repeat" should match the variable's default value
- Variables can also be referenced in speech text using {varName} and in pause duration_seconds using "{varName}"

Conditions:
- Conditions let segments be included or excluded based on variable values, so a single script can handle different configurations (e.g. skip the "hold" section when hold duration is 0).
- Define conditions in the variables object under "_conditions": {"condName": {"variable": "varName", "operator": ">=", "value": 1}}
- Operators: ">", "<", ">=", "<=", "==", "!=", "between" (with "value" and "value2")
- Any segment can have a "condition" field set to a condition name. If the condition is false, the segment is skipped.
- Use conditions sparingly — only when the script genuinely needs to behave differently based on a variable.

Guidelines:
- Use sections (repeat: 1 loops with a label) to organize the script into logical parts
- Use loops for repeating structures (e.g. multiple rounds of the same breathing pattern)
- Speech segments inside loops are rendered once and reused, so write them to work across all iterations
- Start with a brief setup instruction
- Give clear instructions for the technique before beginning
- Intersperse speech guidance throughout the practice — do not leave long stretches of silence. The practitioner should receive periodic verbal cues, encouragement, and awareness prompts during the practice, not just at the start and end.
- Use short pauses (3-10 seconds) between speech segments to let instructions settle, and longer pauses (15-30 seconds) only where the practitioner needs extended time to focus.
- Keep individual spoken segments short and calm, but include many of them throughout the timeline
- End with a gentle closing
- Output ONLY the JSON object, no other text
"""


def generate_stage_script(stage_instructions: dict) -> dict:
    """Generate a script and variables from stage instructions."""
    client = anthropic.Anthropic()

    parts = []
    if stage_instructions.get("description"):
        parts.append(f"Description:\n{stage_instructions['description']}")
    if stage_instructions.get("directions"):
        parts.append(f"Directions:\n{stage_instructions['directions']}")
    if stage_instructions.get("progression"):
        parts.append(f"Progression:\n{stage_instructions['progression']}")
    if stage_instructions.get("contraindications"):
        parts.append(f"Contraindications:\n{stage_instructions['contraindications']}")

    user_prompt = "\n\n".join(parts)
    user_prompt += "\n\nGenerate the script and variables as a JSON object."

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    response_text = message.content[0].text.strip()
    from .extract_instructions import _parse_json_response
    return _parse_json_response(response_text)
