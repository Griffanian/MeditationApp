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


def extract_participants(note):
    """Pull participant names from the note owner and transcript speakers."""
    participants = set()
    owner = note.get("owner", {})
    if owner.get("name"):
        participants.add(owner["name"])
    for entry in note.get("transcript", []):
        speaker = entry.get("speaker")
        if speaker and not speaker.startswith("Speaker "):
            participants.add(speaker)
    return sorted(participants)


def format_transcript(transcript):
    """Format transcript entries as readable markdown."""
    if not transcript:
        return ""
    lines = []
    for entry in transcript:
        speaker = entry.get("speaker", "Unknown")
        text = entry.get("text", "").strip()
        if text:
            lines.append(f"**{speaker}:** {text}")
    return "\n\n".join(lines)


def note_to_obsidian(note, include_transcript=False):
    """Convert a Granola note to Obsidian-flavored markdown."""
    title = note.get("title") or "Untitled Meeting"
    created = note.get("created_at", "")
    updated = note.get("updated_at", "")
    summary = note.get("summary", "")
    participants = extract_participants(note)
    note_id = note.get("id", "")

    # Parse date for frontmatter
    date_str = ""
    if created:
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            date_str = dt.strftime("%Y-%m-%d")
        except ValueError:
            date_str = created[:10]

    # Build YAML frontmatter
    frontmatter_lines = [
        "---",
        f"title: \"{title}\"",
        f"date: {date_str}",
    ]
    if participants:
        frontmatter_lines.append(f"participants: [{', '.join(participants)}]")
    frontmatter_lines.extend([
        "tags: [meeting]",
        "source: granola",
        f"granola_id: {note_id}",
    ])
    if updated:
        frontmatter_lines.append(f"updated: {updated}")
    frontmatter_lines.append("---")

    # Build body
    body_parts = [f"# {title}"]

    if summary:
        body_parts.append("## Summary")
        body_parts.append(summary)

    if include_transcript and note.get("transcript"):
        body_parts.append("## Transcript")
        body_parts.append(format_transcript(note["transcript"]))

    frontmatter = "\n".join(frontmatter_lines)
    body = "\n\n".join(body_parts)
    return f"{frontmatter}\n\n{body}\n"


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


def sync(created_after=None, include_transcript=False):
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
            # Check if the note was updated since we last synced
            existing_content = filepath.read_text()
            remote_updated = note_summary.get("updated_at", "")
            if f"updated: {remote_updated}" in existing_content:
                skipped += 1
                continue

        # Fetch full note detail
        note = fetch_note_detail(api_key, note_id, include_transcript=include_transcript)
        md_content = note_to_obsidian(note, include_transcript=include_transcript)

        filepath.write_text(md_content)
        if note_id in existing_ids:
            updated += 1
            print(f"  Updated: {filename}")
        else:
            created += 1
            print(f"  Created: {filename}")

    print(f"\nDone: {created} created, {updated} updated, {skipped} unchanged")


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
    args = parser.parse_args()
    sync(created_after=args.after, include_transcript=args.include_transcript)


if __name__ == "__main__":
    main()
