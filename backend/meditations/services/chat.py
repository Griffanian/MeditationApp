"""AI chat — context-aware assistant for the meditation app."""

import json

import anthropic

from ..models import Meditation, Practice, Stage


BASE_PROMPT = """You are an AI assistant embedded in a meditation app. You help the user build guided meditation exercises, compose practices, and manage their library.

IMPORTANT: When the user gives a clear instruction to modify something, ACT IMMEDIATELY. Do not ask clarifying questions or propose a plan — make reasonable assumptions and apply changes. The user can always ask you to adjust afterward. Bias toward action over discussion.

When you make changes, respond with BOTH:
1. A brief natural language reply explaining what you changed
2. A JSON mutations block that the app will apply automatically

Format mutations as a fenced JSON block with the label "mutations":

```mutations
{ ... }
```

If the user is just asking a question (not requesting changes), respond with text only — no mutations block.
Keep replies concise — the mutations do the heavy lifting, not your explanation.
The mutations JSON must be valid JSON — no comments, no trailing commas.
"""

EXERCISE_PROMPT = """
You are currently on the EXERCISE EDITOR page. The user is editing a specific meditation exercise.

Mutation format for exercises:
```mutations
{
  "instructions": {
    "description": "updated description",
    "stages": [...]
  },
  "stages": {
    "stage-id-here": {
      "script": [...],
      "variables": {...}
    }
  }
}
```

Understanding stages:
- A "stage" is NOT a step in a sequence. It represents a PROGRESSION LEVEL or VARIANT of a technique (e.g. beginner vs advanced, or a different ratio/pattern). Each stage is a self-contained version of the practice that can be played independently.
- Only create multiple stages when there are genuinely different technique variations or progression levels. A single technique with sequential steps (intro, body, closing) should be ONE stage with those steps as segments in the script/timeline.
- When the exercise only has one technique at one level, use a single stage.

Rules:
- Only include "instructions" in mutations if you are changing the description or stages list
- Only include "stages" in mutations if you are changing stage scripts/timelines
- When modifying stages in instructions, return the COMPLETE stages array (not just the changed stage)
- When modifying a stage script, return the COMPLETE script and variables for that stage
- You understand meditation techniques, breathing practices, and audio timeline structures
- Script segment types: speech (with id and text), pause (with duration_seconds), asset (with file), loop (with variable, repeat, segments, optional label, optional targetDuration), split_marker (with optional multiplier — divides remaining time evenly across all markers within the nearest ancestor section that has a targetDuration)
- A section is a loop with repeat: 1 and a label. Sections can have a "targetDuration" field (in seconds) that sets the total duration for that section. The value can be a number or a variable reference like "{duration}" to let the user adjust it. Split markers inside the section divide the remaining time (target minus fixed content) evenly.
- Regular loops (without a label) can also have a "targetDuration" field. When set, the loop repeats its content enough times to fill the target duration (rounding up). For example, if a loop's content takes 5 seconds and targetDuration is 12, the loop plays 3 times (ceil(12/5)). This is an alternative to a fixed repeat count — a loop has either a repeat count OR a targetDuration, not both. Loops with targetDuration also have a "targetDurationUnit" field ("seconds", "minutes", or "hours") that sets the unit of the value (default "seconds"). When targetDuration is a variable reference like "{duration}", the variable's own unit applies instead.
- Only use split_marker segments in the Main Practice section, and only when it contains a loop with a variable (so the duration scales with the user's chosen number of rounds/reps). Don't use split markers for fixed-duration content.
- When using split_marker segments, they must be inside a section that has a targetDuration set (otherwise they have no target to split).
- By default, structure a stage's script into sections: a Setup section (introduction, settling in, technique explanation), a Main Practice section (the core exercise — this is where split markers, loops, and rounds typically go), and a Cool Down section (winding down, returning to normal). Not every exercise needs all three, but this is the default structure.
- Use variables to let users adjust things like number of rounds, repetitions in loops, or target durations of sections. Don't overdo it — just where there's a natural knob. Variables are defined in the stage's "variables" object and referenced in loops via the "variable" key or in targetDuration via "{varName}" syntax.
- Variable format: {"value": 5, "displayName": "Rounds", "unit": "minutes"}. The "unit" field is optional: "minutes" (value × 60 for seconds), "seconds" (value used as-is), or omit for unitless (rounds, repetitions). Use "minutes" for duration variables so users can set values like 5 instead of 300.
- You can create new variables and set targetDuration on sections as part of mutations. Always include the full variables object for the stage when adding or modifying variables.
"""

PRACTICE_PROMPT = """
You are currently on the PROGRAMME BUILDER page. The user is composing a programme — a structured plan with weeks and days, where each day contains exercise stages to play in sequence.

A programme is structured as weeks, each containing days, each day containing exercise stages:

Mutation format for programmes:
```mutations
{
  "items": [
    {
      "label": "Week 1",
      "days": [
        {
          "label": "Day 1",
          "items": [
            {
              "id": "unique-id",
              "meditation": "exercise-name",
              "meditation_display": "Exercise Display Name",
              "stage_id": "stage-id",
              "stage_name": "Stage Name",
              "variables": {"duration": {"value": 5, "displayName": "Duration", "unit": "minutes"}}
            }
          ]
        }
      ]
    }
  ]
}
```

Rules:
- When modifying the programme, return the COMPLETE items array (all weeks)
- Each day's items reference exercise stages by meditation name and stage_id
- Variables can override the stage's default variable values for this programme
- You can add/remove/reorder weeks, days, and items within days
- When adding items, use stages from the available exercises listed in the context
- Generate unique IDs for new items (use a random string like "item-abc123")
- When many days in a week are identical, you still need to output each day fully — but keep the JSON compact (no unnecessary whitespace)
- When days only differ on certain days of the week (e.g. "Days 1-3 do X, Days 4-7 do Y"), create the correct items for each day
"""

PLAYER_PROMPT = """
You are currently on the PLAYER page. The user is playing through a programme's daily practice.

You can see the full programme structure. You can help the user understand:
- What exercises are in today's practice and why
- How the programme progresses across weeks
- What each exercise does and how to approach it
- What the variables mean and how to adjust them

You can modify the programme using the same mutation format as the Programme Builder:
```mutations
{
  "items": [... full weeks array ...]
}
```

You can also answer questions about any exercise in the programme based on the available exercise data.
"""

DASHBOARD_PROMPT = """
You are currently on the EXERCISES page. The user is browsing their exercise library.
You can answer questions about their exercises, suggest what to work on, or help them understand their library.
You cannot make exercise mutations from this page — direct the user to open a specific exercise to edit it.

The app has two main sections:
- Exercises: individual meditation techniques with instructions and audio timelines
- Programmes: structured plans with weeks and days, each day containing exercise stages

The user can navigate to the Programme Builder to create/edit programmes, or the Player to practice them.
"""

PRACTICES_LIST_PROMPT = """
You are currently on the PROGRAMMES page. The user is browsing their programmes.
You can answer questions about their programmes or suggest how to compose them.

You can CREATE a new programme from this page using this mutation format:
```mutations
{
  "create_programme": {
    "display_name": "Programme Name",
    "items": [
      {
        "label": "Week 1",
        "days": [
          {
            "label": "Day 1",
            "items": [
              {
                "id": "item-abc123",
                "meditation": "exercise-name",
                "meditation_display": "Exercise Display Name",
                "stage_id": "stage-id",
                "stage_name": "Stage Name",
                "variables": {"duration": {"value": 5, "displayName": "Duration", "unit": "minutes"}}
              }
            ]
          }
        ]
      }
    ]
  }
}
```

Rules:
- Use the exercise names and stage IDs from the available exercises listed in the context
- Generate unique IDs for each item
- When many days in a week are identical, still output each day fully but keep JSON compact
- When days differ partway through a week (e.g. "Days 1-3 do X, Days 4-7 do Y"), create the correct items for each day
"""


def _build_exercise_context(meditation):
    """Build context string for a specific exercise."""
    instructions = meditation.instructions or {}
    ctx = f"Exercise: {meditation.display_name or meditation.name}\n\n"

    if instructions.get("description"):
        ctx += f"Description:\n{instructions['description']}\n\n"

    stages_info = instructions.get("stages", [])
    if stages_info:
        ctx += "Stages:\n"
        for s in stages_info:
            ctx += f"\n### {s.get('name', 'Unnamed')}\n"
            if s.get("description"):
                ctx += f"Description: {s['description']}\n"
            if s.get("directions"):
                ctx += f"Directions: {s['directions']}\n"
            if s.get("progression"):
                ctx += f"Progression: {s['progression']}\n"
            if s.get("contraindications"):
                ctx += f"Contraindications: {s['contraindications']}\n"

    stage_scripts = Stage.objects.filter(meditation=meditation)
    if stage_scripts.exists():
        ctx += "\n\nStage Scripts (timelines):\n"
        for stage in stage_scripts:
            stage_name = stage.stage_id
            for s in stages_info:
                if s.get("id") == stage.stage_id:
                    stage_name = s.get("name", stage.stage_id)
                    break
            ctx += f"\n### {stage_name} (id: {stage.stage_id})\n"
            if stage.variables:
                ctx += f"Variables: {json.dumps(stage.variables)}\n"
            if stage.script:
                ctx += f"Script: {json.dumps(stage.script, indent=2)}\n"

    return ctx


def _build_practice_context(practice):
    """Build context string for a specific programme."""
    ctx = f"Programme: {practice.display_name or practice.name}\n\n"
    weeks = practice.items or []
    if weeks and isinstance(weeks[0], dict) and "days" in weeks[0]:
        for wi, week in enumerate(weeks):
            ctx += f"\n## {week.get('label', f'Week {wi+1}')}\n"
            for di, day in enumerate(week.get("days", [])):
                day_items = day.get("items", [])
                ctx += f"\n### {day.get('label', f'Day {di+1}')} ({len(day_items)} stages)\n"
                for i, item in enumerate(day_items, 1):
                    ctx += f"  {i}. {item.get('meditation_display', '')} > {item.get('stage_name', '')}\n"
                    variables = item.get("variables", {})
                    if variables:
                        ctx += f"     Variables: {json.dumps(variables)}\n"
    elif weeks:
        ctx += "Items (flat, legacy format):\n"
        for i, item in enumerate(weeks, 1):
            ctx += f"  {i}. {item.get('meditation_display', '')} > {item.get('stage_name', '')}\n"
    else:
        ctx += "No items added yet.\n"

    # Include available exercises for adding stages
    ctx += "\n\nAvailable exercises and stages:\n"
    for m in Meditation.objects.prefetch_related("stages").order_by("display_name"):
        stage_objs = {s.stage_id: s for s in m.stages.all()}
        instr_stages = (m.instructions or {}).get("stages", [])
        stages = []
        for s in instr_stages:
            stage_id = s.get("id")
            if not stage_id:
                continue
            stage_obj = stage_objs.get(stage_id)
            variables = stage_obj.variables if stage_obj else {}
            stages.append(f"  - {s.get('name', '')} (id: {stage_id}, vars: {json.dumps(variables or {})})")
        if stages:
            ctx += f"\n{m.display_name or m.name} (name: {m.name}):\n" + "\n".join(stages) + "\n"

    return ctx


def _build_dashboard_context():
    """Build context string for the exercises dashboard."""
    ctx = "Exercises in the library:\n"
    for m in Meditation.objects.order_by("display_name"):
        stages = (m.instructions or {}).get("stages", [])
        stage_names = [s.get("name", "") for s in stages]
        ctx += f"\n- {m.display_name or m.name}"
        if stage_names:
            ctx += f" ({len(stage_names)} stages: {', '.join(stage_names)})"
        ctx += "\n"
    return ctx


def _build_practices_list_context():
    """Build context string for the practices list page."""
    ctx = "Programmes:\n"
    for p in Practice.objects.order_by("display_name"):
        items = p.items or []
        if items and isinstance(items[0], dict) and "days" in items[0]:
            total_days = sum(len(w.get("days", [])) for w in items)
            ctx += f"\n- {p.display_name or p.name} ({len(items)} weeks, {total_days} days)"
        else:
            ctx += f"\n- {p.display_name or p.name} ({len(items)} items)"
        ctx += "\n"

    ctx += "\n\nAvailable exercises and stages:\n"
    for m in Meditation.objects.prefetch_related("stages").order_by("display_name"):
        stage_objs = {s.stage_id: s for s in m.stages.all()}
        instr_stages = (m.instructions or {}).get("stages", [])
        stages = []
        for s in instr_stages:
            stage_id = s.get("id")
            if not stage_id:
                continue
            stage_obj = stage_objs.get(stage_id)
            variables = stage_obj.variables if stage_obj else {}
            stages.append(f"  - {s.get('name', '')} (id: {stage_id}, vars: {json.dumps(variables or {})})")
        if stages:
            ctx += f"\n{m.display_name or m.name} (name: {m.name}):\n" + "\n".join(stages) + "\n"

    return ctx


READ_ONLY_PROMPT = """
IMPORTANT: This user is a viewer, not an admin. You MUST NOT produce any mutations blocks.
You can answer questions about the app, explain exercises, describe how programmes work,
and help them understand their practice — but you cannot make any changes.
If they ask you to change something, politely explain that only admins can make edits.
"""


def chat(context, history, message, read_only=False):
    """Process a chat message with route-aware context.

    context dict keys:
      - page: "exercise" | "practice" | "player" | "dashboard" | "practices"
      - meditation: meditation name (when page="exercise")
      - practice: practice name (when page="practice" or "player")
    """
    page = context.get("page", "dashboard")

    if page == "exercise":
        meditation = Meditation.objects.filter(name=context.get("meditation")).first()
        if not meditation:
            return {"reply": "Exercise not found.", "mutations": None}
        page_prompt = EXERCISE_PROMPT
        state_context = _build_exercise_context(meditation)
    elif page in ("practice", "player"):
        practice = Practice.objects.filter(name=context.get("practice")).first()
        if not practice:
            return {"reply": "Programme not found.", "mutations": None}
        page_prompt = PLAYER_PROMPT if page == "player" else PRACTICE_PROMPT
        state_context = _build_practice_context(practice)
    elif page == "practices":
        page_prompt = PRACTICES_LIST_PROMPT
        state_context = _build_practices_list_context()
    else:
        page_prompt = DASHBOARD_PROMPT
        state_context = _build_dashboard_context()

    system = BASE_PROMPT + page_prompt
    if read_only:
        system += READ_ONLY_PROMPT
    system += f"\n\nCurrent state:\n{state_context}"

    messages = []
    for entry in history:
        messages.append({"role": entry["role"], "content": entry["content"]})
    messages.append({"role": "user", "content": message})

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=16384,
        system=system,
        messages=messages,
    )

    reply_text = response.content[0].text

    # Parse out mutations if present
    mutations = None
    if "```mutations" in reply_text:
        try:
            before, rest = reply_text.split("```mutations", 1)
            json_str, after = rest.split("```", 1)
            mutations = json.loads(json_str.strip())
            reply_text = (before.strip() + "\n" + after.strip()).strip()
        except (ValueError, json.JSONDecodeError):
            pass

    return {"reply": reply_text, "mutations": mutations}
