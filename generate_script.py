import json
import anthropic


SYSTEM_PROMPT = """You are a guided meditation script writer. Given a breathing or meditation technique description and session configuration, produce a structured timed script as a JSON array.

Each element in the array must be one of these types:

1. {"type": "speech", "text": "...", "id": "unique_id"} — spoken instruction. The id must be unique across the script (e.g. "welcome", "round_intro", "rest_1").
2. {"type": "pause", "duration_seconds": N} — silent pause in seconds
3. {"type": "asset", "file": "and_out.mp3"} — play a pre-recorded audio clip from the assets folder
4. {"type": "loop", "variable": "X", "repeat": N, "segments": [...]} — repeat a sequence of segments N times. The "variable" field names this loop's count so it can be referenced. Segments inside can be any of these types including nested loops.

For rhythmic breath cues, use a loop containing an asset and a pause. For example, 9 breath cues at 1-second intervals:
{"type": "loop", "variable": "Y", "repeat": 9, "segments": [
    {"type": "asset", "file": "and_out.mp3"},
    {"type": "pause", "duration_seconds": 0.5}
]}

Guidelines:
- Use loops to represent repeating structures (e.g. multiple rounds of the same breathing pattern)
- Speech segments inside loops are rendered once and reused, so write them to work across all iterations (e.g. "Begin your forceful exhalations" not "Begin your first round")
- Start with a brief welcome and setup instruction (posture, eyes closed, etc.)
- Give clear instructions for the technique before beginning
- Use pauses generously — meditation is mostly silence
- Keep spoken segments short and calm
- End with a gentle closing (return awareness, open eyes)
- Output ONLY the JSON array, no other text
"""


def generate_script(technique_text: str, config: dict) -> list[dict]:
    """Generate a timed meditation script from a technique description."""
    client = anthropic.Anthropic()

    user_prompt = f"""Technique:
{technique_text}

Session configuration:
- Duration: approximately {config.get('duration_minutes', 5)} minutes
- Number of rounds: {config.get('rounds', 3)}
- Tone: {config.get('tone', 'calm and grounding')}

Generate the guided meditation script as a JSON array."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    response_text = message.content[0].text

    # Strip markdown code fences if present
    response_text = response_text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1]
        response_text = response_text.rsplit("```", 1)[0]

    script = json.loads(response_text)
    return script


if __name__ == "__main__":
    from pathlib import Path

    technique = Path("Kapalbhati.md").read_text()
    config = {"duration_minutes": 5, "rounds": 3, "tone": "calm and grounding"}
    script = generate_script(technique, config)
    print(json.dumps(script, indent=2))
