import json

import anthropic
from rest_framework.response import Response
from rest_framework.views import APIView


class ValidatePromptView(APIView):
    """Validate a user's custom text response to a BYB prompt using AI."""

    throttle_scope = "ai-generation"

    def post(self, request):
        text = (request.data.get("text") or "").strip()
        label = request.data.get("label", "")
        options = request.data.get("options", [])
        context = request.data.get("context", "")

        if not text:
            return Response({"status": "ok"})

        # Build a concise prompt for validation
        examples_str = ""
        if options:
            examples_str = f"\nExamples of valid answers: {', '.join(options)}"

        prompt = f"""You are validating a user's custom text input for a meditation app.

The question asked: "{label}"
{f'Context: {context}' if context else ''}{examples_str}

The user typed: "{text}"

Evaluate this input and respond with ONLY a JSON object (no markdown, no explanation) in one of these formats:

If the input is appropriate and well-written:
{{"status": "ok"}}

If the input has a spelling or grammar issue but is otherwise appropriate:
{{"status": "spelling", "message": "Did you mean '<corrected version>'?", "suggestion": "<corrected version>"}}

If the input doesn't match what the question is asking for (wrong category, nonsensical, etc.):
{{"status": "inappropriate", "message": "<brief, friendly explanation of what kind of answer is expected>"}}

Be lenient — accept creative or personal answers. Only flag things that are genuinely off-topic, gibberish, or misspelt."""

        try:
            client = anthropic.Anthropic()
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=256,
                messages=[{"role": "user", "content": prompt}],
            )
            reply = response.content[0].text.strip()
            result = json.loads(reply)
            return Response(result)
        except (json.JSONDecodeError, Exception):
            # If AI fails, don't block the user
            return Response({"status": "ok"})
