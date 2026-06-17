#!/usr/bin/env python3
"""
Sync meeting notes from Granola API into notes/meetings/ as Obsidian-formatted markdown.

Usage:
    python scripts/sync_granola.py                  # fetch all notes
    python scripts/sync_granola.py --after 2026-06-01  # fetch notes created after date
    python scripts/sync_granola.py --include-transcript # include full transcript
"""

import argparse
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

API_BASE = "https://public-api.granola.ai/v1"
NOTES_DIR = PROJECT_ROOT / "management" / "meetings"


def get_api_key():
    key = os.getenv("GRANOLA_API_KEY")
    if not key:
        print("Error: GRANOLA_API_KEY not set in .env")
        sys.exit(1)
    return key


def slugify(text):
    """Convert a title to a filesystem-safe slug."""
    if not text:
        return "untitled"
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:80].strip("-")


def fetch_all_notes(api_key, created_after=None):
    """Fetch all notes from Granola, handling pagination."""
    headers = {"Authorization": f"Bearer {api_key}"}
    all_notes = []
    cursor = None

    while True:
        params = {"page_size": 30}
        if created_after:
            params["created_after"] = created_after
        if cursor:
            params["cursor"] = cursor

        resp = requests.get(f"{API_BASE}/notes", headers=headers, params=params)
        resp.raise_for_status()
        data = resp.json()

        all_notes.extend(data.get("notes", []))

        if data.get("hasMore") and data.get("cursor"):
            cursor = data["cursor"]
        else:
            break

    return all_notes


def fetch_note_detail(api_key, note_id, include_transcript=False):
    """Fetch a single note with optional transcript."""
    headers = {"Authorization": f"Bearer {api_key}"}
    params = {}
    if include_transcript:
        params["include"] = "transcript"

    resp = requests.get(f"{API_BASE}/notes/{note_id}", headers=headers, params=params)
    resp.raise_for_status()
    return resp.json()


OWNER_NAME = "Miles Bloom"


def extract_participants(note):
    """Pull participant names from attendees and note owner."""
    participants = set()
    for att in note.get("attendees", []):
        if att.get("name"):
            participants.add(att["name"])
    owner = note.get("owner", {})
    if owner.get("name"):
        participants.add(owner["name"])
    return sorted(participants)


def get_unmapped_sources(transcript):
    """Find unique speaker sources in the transcript."""
    sources = set()
    for entry in transcript:
        speaker_info = entry.get("speaker", {})
        if isinstance(speaker_info, dict):
            label = speaker_info.get("label", "")
            source = speaker_info.get("source", "Unknown")
            sources.add(label if label else source)
        else:
            sources.add(speaker_info)
    return sorted(sources)


def auto_speaker_map(note):
    """Auto-map microphone → owner, speaker → other attendee for 1-on-1 calls."""
    attendees = note.get("attendees", [])
    owner = note.get("owner", {})
    owner_name = owner.get("name", OWNER_NAME)
    other_names = [a["name"] for a in attendees if a.get("name") and a["name"] != owner_name]
    mapping = {"microphone": owner_name}
    if len(other_names) == 1:
        mapping["speaker"] = other_names[0]
    return mapping


TODO_PATH = PROJECT_ROOT / "management" / "TODO.md"


def resolve_speakers(note):
    """Auto-map what we can, flag unknowns as TODOs."""
    mapping = auto_speaker_map(note)
    transcript = note.get("transcript", [])
    if not transcript:
        return mapping

    sources = get_unmapped_sources(transcript)
    unmapped = [s for s in sources if s not in mapping]

    if not unmapped:
        return mapping

    title = note.get("title", "Untitled")
    filename = note_filename(note)
    print(f"  Unknown speakers in '{title}': {', '.join(unmapped)}")
    print(f"  Added to TODO.md")

    # Append to TODO list
    todo_line = f"- [ ] Identify speakers in [[meetings/{filename[:-3]}]]: {', '.join(f'`{s}`' for s in unmapped)}\n"
    with open(TODO_PATH, "a") as f:
        f.write(todo_line)

    return mapping


def format_transcript(transcript, speaker_map=None):
    """Format transcript entries as compact markdown."""
    if not transcript:
        return ""
    speaker_map = speaker_map or {}
    lines = []
    for entry in transcript:
        speaker_info = entry.get("speaker", {})
        if isinstance(speaker_info, dict):
            label = speaker_info.get("label", "")
            source = speaker_info.get("source", "Unknown")
            raw = label if label else source
        else:
            raw = speaker_info
        speaker = speaker_map.get(raw, raw)
        text = entry.get("text", "").strip()
        if text:
            lines.append(f"**{speaker}:** {text}")
    return "\n".join(lines)


def note_to_obsidian(note, include_transcript=False, speaker_map=None):
    """Convert a Granola note to Obsidian-flavored markdown."""
    title = note.get("title") or "Untitled Meeting"
    created = note.get("created_at", "")
    updated = note.get("updated_at", "")
    summary_md = note.get("summary_markdown", "")
    participants = extract_participants(note)
    note_id = note.get("id", "")
    web_url = note.get("web_url", "")

    date_str = ""
    if created:
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            date_str = dt.strftime("%Y-%m-%d")
        except ValueError:
            date_str = created[:10]

    # YAML frontmatter
    fm = [
        "---",
        "Type: Meeting Notes",
        f"date: {date_str}",
        f"url: {web_url}",
        f"granola_id: {note_id}",
        "---",
    ]

    # Add mapped speaker names to participants
    if speaker_map:
        for name in speaker_map.values():
            participants.append(name)
        participants = sorted(set(participants))

    # Meta callout with dataview participants
    participant_links = ",".join(f"[[{p}]]" for p in participants)
    meta = f">[!Meta]\n>participants::{participant_links}"

    # Body
    parts = ["\n".join(fm), meta, f"# {title}"]
    if summary_md:
        parts.append(f"### Summary\n{summary_md}")
    if include_transcript and note.get("transcript"):
        parts.append(f"### Transcript\n{format_transcript(note['transcript'], speaker_map=speaker_map)}")

    return "\n".join(parts) + "\n"


def note_filename(note):
    """Generate filename: YYYY-MM-DD_slug.md"""
    created = note.get("created_at", "")
    title = note.get("title", "")
    date_prefix = ""
    if created:
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            date_prefix = dt.strftime("%Y-%m-%d")
        except ValueError:
            date_prefix = created[:10]

    slug = slugify(title)
    if date_prefix:
        return f"{date_prefix}_{slug}.md"
    return f"{slug}.md"


def sync(created_after=None, include_transcript=False, speaker_map=None):
    api_key = get_api_key()
    NOTES_DIR.mkdir(parents=True, exist_ok=True)

    # Load existing granola IDs to avoid re-fetching details unnecessarily
    existing_ids = set()
    for f in NOTES_DIR.glob("*.md"):
        content = f.read_text()
        for line in content.splitlines():
            if line.startswith("granola_id:"):
                existing_ids.add(line.split(":", 1)[1].strip())
                break

    print("Fetching notes from Granola...")
    notes = fetch_all_notes(api_key, created_after=created_after)
    print(f"Found {len(notes)} notes")

    created = 0
    skipped = 0
    updated = 0

    for note_summary in notes:
        note_id = note_summary.get("id")
        filename = note_filename(note_summary)
        filepath = NOTES_DIR / filename

        if note_id in existing_ids and filepath.exists():
            skipped += 1
            continue

        # Fetch full note detail
        note = fetch_note_detail(api_key, note_id, include_transcript=include_transcript)
        note_speakers = speaker_map if speaker_map else resolve_speakers(note)
        md_content = note_to_obsidian(note, include_transcript=include_transcript, speaker_map=note_speakers)

        filepath.write_text(md_content)
        if note_id in existing_ids:
            updated += 1
            print(f"  Updated: {filename}")
        else:
            created += 1
            print(f"  Created: {filename}")

    print(f"\nDone: {created} created, {updated} updated, {skipped} unchanged")


def parse_speakers(value):
    """Parse 'source=Name,source=Name' into a dict."""
    mapping = {}
    for pair in value.split(","):
        key, _, name = pair.partition("=")
        if key and name:
            mapping[key.strip()] = name.strip()
    return mapping


def main():
    parser = argparse.ArgumentParser(description="Sync Granola meeting notes to Obsidian markdown")
    parser.add_argument(
        "--after",
        help="Only fetch notes created after this date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--include-transcript",
        action="store_true",
        help="Include full meeting transcript in each note",
    )
    parser.add_argument(
        "--speakers",
        type=parse_speakers,
        help="Map speaker sources to names, e.g. 'microphone=Miles Bloom,speaker=Roger'",
    )
    args = parser.parse_args()
    sync(created_after=args.after, include_transcript=args.include_transcript, speaker_map=args.speakers)


if __name__ == "__main__":
    main()
