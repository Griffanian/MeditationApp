"""Agentic assistant — streaming agent loop with tool use."""

import json

import anthropic

from ..models import Meditation, Message, Practice, Stage, Thread
from .chat import (
    _build_dashboard_context,
    _build_exercise_context,
    _build_practice_context,
    _build_practices_list_context,
)
from .tools import execute_tool, get_tool_schemas

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 16384
MAX_TOOL_RESULT_SIZE = 50_000  # characters

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

AGENT_BASE_PROMPT = """\
You are an AI assistant embedded in a meditation app. You help the user build guided meditation exercises, compose programmes, and manage their library.

IMPORTANT: When the user gives a clear instruction to modify something, ACT IMMEDIATELY. Do not ask clarifying questions or propose a plan — make reasonable assumptions and apply changes via your tools. The user can always ask you to adjust afterward. Bias toward action over discussion.

You have tools to read and modify exercises and programmes. Use them to fulfil the user's requests. Keep your replies concise — the tools do the heavy lifting.

Understanding the domain:
- An "exercise" is a meditation technique with instructions and one or more "stages" (progression levels/variants, NOT sequential steps).
- Each stage has a script (audio timeline) made of segments: speech, pause, asset, loop, split_marker.
- A "section" is a loop with repeat: 1 and a label. Sections can have a targetDuration.
- Variables let users adjust rounds, durations, etc. Format: {"value": 5, "displayName": "Rounds", "unit": "minutes"}.
- A "programme" (practice) is a structured plan with weeks > days > items, where each item references an exercise stage.

Script segment types:
- speech (id, text)
- pause (duration_seconds)
- asset (file)
- loop (variable, repeat OR targetDuration, segments, optional label, optional targetDurationUnit)
- split_marker (optional multiplier)

When creating/updating stage scripts, structure into sections: Setup, Main Practice, Cool Down.
Use variables for natural knobs (rounds, duration). Don't overdo it.
"""

EXERCISE_CONTEXT_PROMPT = """\

You are on the EXERCISE EDITOR page. The user is editing a specific meditation exercise.

Key rules for exercise modifications:
- A "stage" represents a PROGRESSION LEVEL or VARIANT (e.g. beginner vs advanced), NOT a sequential step.
- When updating instructions, provide the COMPLETE instructions object via update_meditation_instructions.
- When updating a stage script, provide the COMPLETE script and variables via update_stage.
- Only use split_marker inside a section with targetDuration that contains a loop with a variable.
"""

PRACTICE_CONTEXT_PROMPT = """\

You are on the PROGRAMME BUILDER page. The user is composing a programme.

Key rules for programme modifications:
- Use update_practice with the COMPLETE items array (all weeks).
- Each day's items reference exercise stages by meditation name and stage_id.
- Generate unique IDs for new items (e.g. "item-abc123").
- Use read_meditation or list_meditations to find available exercises and stages.
"""

PLAYER_CONTEXT_PROMPT = """\

You are on the PLAYER page. The user is playing through a programme's daily practice.
The current position is marked with "◀ CURRENTLY VIEWING" in the context below.
Focus answers on that specific day — explain what's in it, how it fits the programme's progression.
You can also modify the programme using update_practice.
"""

DASHBOARD_CONTEXT_PROMPT = """\

You are on the EXERCISES page. The user is browsing their exercise library.
Use your tools to look up exercise details when needed. To edit an exercise, use update_meditation_instructions and update_stage.
"""

PRACTICES_LIST_CONTEXT_PROMPT = """\

You are on the PROGRAMMES page. The user is browsing their programmes.
You can create new programmes with create_practice or look up existing ones.
"""

READ_ONLY_ADDENDUM = """\

IMPORTANT: This user is a viewer, not an admin. You MUST NOT use any write tools (update_*, create_*).
You can answer questions, explain exercises, describe programmes — but you cannot make changes.
If they ask you to change something, politely explain that only admins can make edits.
"""


def _build_system_prompt(context, read_only=False):
    """Build the system prompt based on page context."""
    page = context.get("page", "dashboard")
    prompt = AGENT_BASE_PROMPT

    if page == "exercise":
        prompt += EXERCISE_CONTEXT_PROMPT
        meditation = Meditation.objects.filter(
            name=context.get("meditation")
        ).first()
        if meditation:
            prompt += f"\n\nCurrent exercise state:\n{_build_exercise_context(meditation)}"
    elif page in ("practice", "player"):
        prompt += PLAYER_CONTEXT_PROMPT if page == "player" else PRACTICE_CONTEXT_PROMPT
        practice = Practice.objects.filter(
            name=context.get("practice")
        ).first()
        if practice:
            current_week = context.get("currentWeek") if page == "player" else None
            current_day = context.get("currentDay") if page == "player" else None
            prompt += f"\n\nCurrent programme state:\n{_build_practice_context(practice, current_week, current_day)}"
    elif page == "practices":
        prompt += PRACTICES_LIST_CONTEXT_PROMPT
        prompt += f"\n\nCurrent state:\n{_build_practices_list_context()}"
    else:
        prompt += DASHBOARD_CONTEXT_PROMPT
        prompt += f"\n\nCurrent state:\n{_build_dashboard_context()}"

    if read_only:
        prompt += READ_ONLY_ADDENDUM

    return prompt


# ---------------------------------------------------------------------------
# Message conversion
# ---------------------------------------------------------------------------

def _thread_messages_to_anthropic(thread):
    """Convert stored Messages into Anthropic API message format."""
    messages = []
    for msg in thread.messages.all():
        messages.append({"role": msg.role, "content": msg.content})
    return messages


def _sse(event, data):
    """Format an SSE event string."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ---------------------------------------------------------------------------
# Agent loop
# ---------------------------------------------------------------------------

def run_agent_stream(thread, user_message, context, read_only=False):
    """Generator yielding SSE event strings.

    Runs the agent loop: call Claude, execute tools, repeat until done.
    """
    # Save user message
    Message.objects.create(
        thread=thread,
        role="user",
        content=[{"type": "text", "text": user_message}],
    )

    # Build conversation
    system = _build_system_prompt(context, read_only=read_only)
    messages = _thread_messages_to_anthropic(thread)
    tools = get_tool_schemas()

    # Filter out write tools for read-only users
    if read_only:
        write_tools = {"update_meditation_instructions", "update_stage",
                       "create_practice", "update_practice"}
        tools = [t for t in tools if t["name"] not in write_tools]

    client = anthropic.Anthropic()
    data_changed = False

    while True:
        # Stream the response
        with client.messages.stream(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=messages,
            tools=tools,
        ) as stream:
            for event in stream:
                if event.type == "content_block_start":
                    if event.content_block.type == "tool_use":
                        yield _sse("tool_call_start", {
                            "id": event.content_block.id,
                            "name": event.content_block.name,
                        })
                elif event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        yield _sse("text_delta", {"text": event.delta.text})

            final = stream.get_final_message()

        # Save assistant message
        assistant_content = []
        for block in final.content:
            if block.type == "text":
                assistant_content.append({"type": "text", "text": block.text})
            elif block.type == "tool_use":
                assistant_content.append({
                    "type": "tool_use",
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })

        Message.objects.create(
            thread=thread,
            role="assistant",
            content=assistant_content,
        )

        if final.stop_reason == "tool_use":
            # Execute tools and build results
            tool_results = []
            for block in final.content:
                if block.type != "tool_use":
                    continue

                result = execute_tool(block.name, block.input)
                result_str = json.dumps(result)

                # Check if this was a write tool
                if block.name in ("update_meditation_instructions", "update_stage",
                                  "create_practice", "update_practice"):
                    data_changed = True

                # Truncate large results
                if len(result_str) > MAX_TOOL_RESULT_SIZE:
                    result_str = result_str[:MAX_TOOL_RESULT_SIZE] + "... (truncated)"

                yield _sse("tool_call_end", {
                    "id": block.id,
                    "name": block.name,
                    "result_preview": result_str[:500],
                })

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_str,
                })

            # Save tool results as a user-role message (Anthropic API format)
            Message.objects.create(
                thread=thread,
                role="user",
                content=tool_results,
            )

            # Rebuild messages for next iteration
            messages = _thread_messages_to_anthropic(thread)
        else:
            # end_turn — we're done
            break

    # Auto-title on first exchange
    if not thread.title and thread.messages.count() <= 4:
        thread.title = user_message[:80]
        thread.save()
    else:
        # Touch updated_at
        Thread.objects.filter(pk=thread.pk).update(
            updated_at=thread.updated_at  # auto_now handles it
        )
        thread.save(update_fields=["updated_at"])

    yield _sse("message_done", {
        "thread_id": str(thread.id),
        "title": thread.title,
        "data_changed": data_changed,
    })
