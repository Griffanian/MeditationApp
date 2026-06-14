"""Extract structured instructions from a PDF or YouTube video using Claude."""

import io
import json
import re

import anthropic
import pymupdf
from youtube_transcript_api import YouTubeTranscriptApi

from . import storage


SYSTEM_PROMPT = """You are a meditation instruction extractor. Given text describing a meditation or breathing practice (extracted from a PDF or a YouTube video transcript), extract structured instructions.

Return a JSON object with this structure:
{
  "description": "A short explanation of the overall practice",
  "stages": [
    {
      "name": "Stage name",
      "description": "What this stage is about",
      "directions": "Step-by-step directions for performing this stage (use markdown lists with dashes)",
      "progression": "How to progress through this stage",
      "contraindications": "Any contraindications or warnings for this stage"
    }
  ]
}

Guidelines:
- Only create stages that are explicitly named or numbered in the source text as distinct techniques or phases of the practice — do not invent stages like "Setup", "Preparation", "Closing", "Q&A", or "Discussion"
- If the practice has clear stages, phases, or levels defined in the text, create a separate stage for each
- If there are no obvious stages, or the source describes a single technique, create a single stage with the full practice details — this is the most common case, especially for video transcripts
- Do NOT create separate stages for: introductions, explanations, Q&A sections, recap/summary, or closing remarks — fold relevant information from those sections into the main stage(s)
- Use markdown formatting in the text fields — use dashes (- item) for lists, not bullet points or asterisks
- Stage names should be numbered like "1. External Trataka", "2. Internal Trataka", etc.
- All sentences in every field must end with a full stop
- Be thorough but concise
- If contraindications are mentioned anywhere in the text, include them in the relevant stage(s)
- For video transcripts: ignore filler words, chat interactions, jokes, and off-topic tangents — focus on the actual meditation instructions and technique descriptions. Distil the teacher's guidance into clear, actionable directions.
- Output ONLY the JSON object, no other text
"""


def _parse_json_response(text: str) -> dict:
    """Extract and parse JSON from a Claude response, handling code fences."""
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip code fences (```json ... ``` or ``` ... ```)
    if "```" in text:
        # Find the first { or [ after any code fence opener
        start = text.find("```")
        after_fence = text[start + 3:]
        # Skip the language label line (e.g. "json\n")
        if "\n" in after_fence:
            after_fence = after_fence.split("\n", 1)[1]
        # Remove trailing fence
        if "```" in after_fence:
            after_fence = after_fence.rsplit("```", 1)[0]
        try:
            return json.loads(after_fence.strip())
        except json.JSONDecodeError:
            pass

    # Last resort: find the first { and last } in the text
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end > brace_start:
        try:
            return json.loads(text[brace_start:brace_end + 1])
        except json.JSONDecodeError:
            pass

    raise json.JSONDecodeError(
        f"Could not extract JSON from response: {text[:200]}",
        text, 0,
    )


def _parse_video_id(url: str) -> str:
    """Extract a YouTube video ID from various URL formats."""
    patterns = [
        r"(?:v=|\/v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})",
        r"(?:embed\/)([a-zA-Z0-9_-]{11})",
        r"(?:shorts\/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {url}")


def extract_text_from_youtube(youtube_url: str) -> str:
    """Fetch a YouTube video transcript and return it as plain text."""
    video_id = _parse_video_id(youtube_url)
    ytt_api = YouTubeTranscriptApi()
    transcript = ytt_api.fetch(video_id)

    lines = []
    for entry in transcript:
        minutes = int(entry.start // 60)
        seconds = entry.start % 60
        lines.append(f"[{minutes:02d}:{seconds:05.2f}] {entry.text}")
    return "\n".join(lines)


def extract_text_from_pdf(meditation_name: str) -> str:
    """Download PDF and extract text. Returns text or empty string if image-based."""
    path = storage.pdf_path(meditation_name)
    if not storage.file_exists(path):
        raise FileNotFoundError("No instructions PDF uploaded for this meditation.")

    pdf_bytes = storage.download_file(path)
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n\n".join(pages)


def extract_pdf_as_images(meditation_name: str) -> list:
    """Convert PDF pages to base64-encoded PNG images for vision."""
    import base64
    path = storage.pdf_path(meditation_name)
    if not storage.file_exists(path):
        raise FileNotFoundError("No instructions PDF uploaded for this meditation.")

    pdf_bytes = storage.download_file(path)
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    images = []
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        images.append(base64.b64encode(pix.tobytes("png")).decode())
    doc.close()
    return images


def extract_instructions(meditation_name: str, youtube_url: str = None, context: str = None) -> dict:
    """Extract text from a PDF or YouTube video, then use Claude to structure it."""
    use_vision = False
    if youtube_url:
        text = extract_text_from_youtube(youtube_url)
        source_label = "YouTube video transcript"
    else:
        text = extract_text_from_pdf(meditation_name)
        source_label = "PDF document"
        if len(text.strip()) < 50:
            use_vision = True

    client = anthropic.Anthropic()

    if use_vision:
        images = extract_pdf_as_images(meditation_name)
        content = []
        for img_b64 in images:
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": img_b64},
            })
        prompt = "Extract the structured meditation instructions from this PDF."
        if context:
            prompt += f"\n\nAdditional context from the user:\n{context}"
        content.append({"type": "text", "text": prompt})
    else:
        prompt = f"Extract the structured meditation instructions from this {source_label}:\n\n{text}"
        if context:
            prompt += f"\n\nAdditional context from the user:\n{context}"
        content = prompt

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": content,
            }
        ],
    )

    response_text = message.content[0].text.strip()
    return _parse_json_response(response_text)
