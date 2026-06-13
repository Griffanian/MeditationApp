"""Extract structured instructions from a PDF or YouTube video using Claude."""

import io
import json
import re

import anthropic
from pypdf import PdfReader
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
    """Download PDF and extract text locally."""
    path = storage.pdf_path(meditation_name)
    if not storage.file_exists(path):
        raise FileNotFoundError("No instructions PDF uploaded for this meditation.")

    pdf_bytes = storage.download_file(path)
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages)


def extract_instructions(meditation_name: str, youtube_url: str = None) -> dict:
    """Extract text from a PDF or YouTube video, then use Claude to structure it."""
    if youtube_url:
        text = extract_text_from_youtube(youtube_url)
        source_label = "YouTube video transcript"
    else:
        text = extract_text_from_pdf(meditation_name)
        source_label = "PDF document"

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Extract the structured meditation instructions from this {source_label}:\n\n{text}",
            }
        ],
    )

    response_text = message.content[0].text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1]
        response_text = response_text.rsplit("```", 1)[0]

    return json.loads(response_text)
