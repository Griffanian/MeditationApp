"""Tool definitions for the agentic assistant.

Each tool has an Anthropic tool schema and a handler function.
Handlers return JSON-serializable dicts. Write tools also return
a 'changes' key with diff info for the frontend.
"""

import json
import uuid

from ..models import Asset, Category, Meditation, Practice, Stage


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

TOOL_REGISTRY: dict = {}


def _register(schema, handler):
    TOOL_REGISTRY[schema["name"]] = {"schema": schema, "handler": handler}


def get_tool_schemas():
    """Return list of Anthropic tool definition dicts."""
    return [t["schema"] for t in TOOL_REGISTRY.values()]


def execute_tool(name, input_data):
    """Run a tool handler by name. Returns JSON-serializable dict."""
    entry = TOOL_REGISTRY.get(name)
    if not entry:
        return {"error": f"Unknown tool: {name}"}
    try:
        return entry["handler"](input_data)
    except Exception as e:
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Read tools
# ---------------------------------------------------------------------------

_register(
    {
        "name": "list_meditations",
        "description": "List all meditation exercises with their stages and categories.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "Optional category filter.",
                },
            },
            "required": [],
        },
    },
    lambda inp: _handle_list_meditations(inp),
)


def _handle_list_meditations(inp):
    qs = Meditation.objects.prefetch_related("stages").order_by("display_name")
    cat = inp.get("category")
    if cat:
        qs = qs.filter(category=cat)
    results = []
    for m in qs:
        instr_stages = (m.instructions or {}).get("stages", [])
        stage_objs = {s.stage_id: s for s in m.stages.all()}
        stages = []
        for s in instr_stages:
            sid = s.get("id")
            if not sid:
                continue
            obj = stage_objs.get(sid)
            stages.append({
                "id": sid,
                "name": s.get("name", ""),
                "description": s.get("description", ""),
                "variables": obj.variables if obj else {},
            })
        results.append({
            "name": m.name,
            "display_name": m.display_name or m.name,
            "category": m.category,
            "description": (m.instructions or {}).get("description", ""),
            "stages": stages,
        })
    return {"meditations": results}


_register(
    {
        "name": "read_meditation",
        "description": "Get full details of a meditation exercise including instructions, stages, scripts, and variables.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "The meditation slug/name.",
                },
            },
            "required": ["name"],
        },
    },
    lambda inp: _handle_read_meditation(inp),
)


def _handle_read_meditation(inp):
    m = Meditation.objects.prefetch_related("stages").filter(name=inp["name"]).first()
    if not m:
        return {"error": f"Meditation '{inp['name']}' not found."}
    instructions = m.instructions or {}
    stages_info = instructions.get("stages", [])
    stage_scripts = []
    for stage in m.stages.all():
        stage_name = stage.stage_id
        for s in stages_info:
            if s.get("id") == stage.stage_id:
                stage_name = s.get("name", stage.stage_id)
                break
        stage_scripts.append({
            "stage_id": stage.stage_id,
            "name": stage_name,
            "script": stage.script,
            "variables": stage.variables,
        })
    return {
        "name": m.name,
        "display_name": m.display_name or m.name,
        "category": m.category,
        "instructions": instructions,
        "stage_scripts": stage_scripts,
    }


_register(
    {
        "name": "list_practices",
        "description": "List all programmes with summary info (weeks, days).",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    lambda inp: _handle_list_practices(inp),
)


def _handle_list_practices(inp):
    results = []
    for p in Practice.objects.order_by("display_name"):
        items = p.items or []
        if items and isinstance(items[0], dict) and "days" in items[0]:
            total_days = sum(len(w.get("days", [])) for w in items)
            results.append({
                "name": p.name,
                "display_name": p.display_name or p.name,
                "weeks": len(items),
                "total_days": total_days,
            })
        else:
            results.append({
                "name": p.name,
                "display_name": p.display_name or p.name,
                "items_count": len(items),
            })
    return {"practices": results}


_register(
    {
        "name": "read_practice",
        "description": "Get full programme structure including all weeks, days, and items.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "The practice slug/name.",
                },
            },
            "required": ["name"],
        },
    },
    lambda inp: _handle_read_practice(inp),
)


def _handle_read_practice(inp):
    p = Practice.objects.filter(name=inp["name"]).first()
    if not p:
        return {"error": f"Practice '{inp['name']}' not found."}
    return {
        "name": p.name,
        "display_name": p.display_name or p.name,
        "items": p.items,
    }


_register(
    {
        "name": "list_categories",
        "description": "List all exercise categories.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    lambda inp: {
        "categories": [
            {"name": c.name, "display_name": c.display_name}
            for c in Category.objects.all()
        ]
    },
)


_register(
    {
        "name": "list_assets",
        "description": "List available audio assets (bells, cues, etc).",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    lambda inp: {
        "assets": [
            {"filename": a.filename}
            for a in Asset.objects.order_by("filename")
        ]
    },
)


# ---------------------------------------------------------------------------
# Write tools
# ---------------------------------------------------------------------------

_register(
    {
        "name": "update_meditation_instructions",
        "description": (
            "Update a meditation exercise's instructions (description and stages metadata). "
            "Provide the COMPLETE instructions object — it replaces the existing one."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "The meditation slug/name.",
                },
                "instructions": {
                    "type": "object",
                    "description": "The full instructions object with 'description' and 'stages' keys.",
                },
            },
            "required": ["name", "instructions"],
        },
    },
    lambda inp: _handle_update_instructions(inp),
)


def _handle_update_instructions(inp):
    m = Meditation.objects.filter(name=inp["name"]).first()
    if not m:
        return {"error": f"Meditation '{inp['name']}' not found."}
    old_stages = (m.instructions or {}).get("stages", [])
    new_stages = inp["instructions"].get("stages", [])
    m.instructions = inp["instructions"]
    m.save()
    # Return a summary of what changed
    old_ids = {s.get("id") for s in old_stages}
    new_ids = {s.get("id") for s in new_stages}
    added = [s.get("name", s.get("id")) for s in new_stages if s.get("id") not in old_ids]
    removed = [s.get("name", s.get("id")) for s in old_stages if s.get("id") not in new_ids]
    return {
        "status": "ok",
        "added_stages": added,
        "removed_stages": removed,
        "total_stages": len(new_stages),
    }


_register(
    {
        "name": "update_stage",
        "description": (
            "Update a stage's script (audio timeline) and/or variables. "
            "Provide the COMPLETE script and variables — they replace the existing ones."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "meditation": {
                    "type": "string",
                    "description": "The meditation slug/name.",
                },
                "stage_id": {
                    "type": "string",
                    "description": "The stage ID.",
                },
                "script": {
                    "type": "array",
                    "description": "The full script (array of segments). Omit to leave unchanged.",
                },
                "variables": {
                    "type": "object",
                    "description": "The full variables object. Omit to leave unchanged.",
                },
            },
            "required": ["meditation", "stage_id"],
        },
    },
    lambda inp: _handle_update_stage(inp),
)


def _handle_update_stage(inp):
    m = Meditation.objects.filter(name=inp["meditation"]).first()
    if not m:
        return {"error": f"Meditation '{inp['meditation']}' not found."}
    stage, created = Stage.objects.get_or_create(
        meditation=m, stage_id=inp["stage_id"],
    )
    updated = []
    if "script" in inp:
        stage.script = inp["script"]
        updated.append("script")
    if "variables" in inp:
        stage.variables = inp["variables"]
        updated.append("variables")
    stage.save()
    return {
        "status": "ok",
        "created": created,
        "updated_fields": updated,
        "stage_id": inp["stage_id"],
    }


_register(
    {
        "name": "create_practice",
        "description": "Create a new programme with the given structure.",
        "input_schema": {
            "type": "object",
            "properties": {
                "display_name": {
                    "type": "string",
                    "description": "Display name for the programme.",
                },
                "items": {
                    "type": "array",
                    "description": "The weeks/days/items structure.",
                },
            },
            "required": ["display_name", "items"],
        },
    },
    lambda inp: _handle_create_practice(inp),
)


def _handle_create_practice(inp):
    practice_id = f"prac-{uuid.uuid4().hex[:12]}"
    Practice.objects.create(
        name=practice_id,
        display_name=inp["display_name"],
        items=inp["items"],
    )
    return {
        "status": "ok",
        "name": practice_id,
        "display_name": inp["display_name"],
        "navigate_to": f"/practice/{practice_id}",
    }


_register(
    {
        "name": "update_practice",
        "description": (
            "Update a programme's items structure. "
            "Provide the COMPLETE items array — it replaces the existing one."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "The practice slug/name.",
                },
                "items": {
                    "type": "array",
                    "description": "The full weeks/days/items structure.",
                },
            },
            "required": ["name", "items"],
        },
    },
    lambda inp: _handle_update_practice(inp),
)


def _handle_update_practice(inp):
    p = Practice.objects.filter(name=inp["name"]).first()
    if not p:
        return {"error": f"Practice '{inp['name']}' not found."}
    old_items = p.items or []
    p.items = inp["items"]
    p.save()
    new_items = inp["items"]
    old_weeks = len([w for w in old_items if isinstance(w, dict) and "days" in w])
    new_weeks = len([w for w in new_items if isinstance(w, dict) and "days" in w])
    return {
        "status": "ok",
        "weeks_before": old_weeks,
        "weeks_after": new_weeks,
    }
