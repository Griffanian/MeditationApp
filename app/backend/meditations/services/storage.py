"""Helpers for Supabase Storage operations."""

import os

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage


def component_path(meditation_name: str, seg_id: str, stage_id: str = None) -> str:
    if stage_id:
        return f"meditations/{meditation_name}/stages/{stage_id}/components/{seg_id}.mp3"
    return f"meditations/{meditation_name}/components/{seg_id}.mp3"


def output_path(meditation_name: str, filename: str, stage_id: str = None) -> str:
    if stage_id:
        return f"meditations/{meditation_name}/stages/{stage_id}/{filename}"
    return f"meditations/{meditation_name}/{filename}"


def asset_path(filename: str) -> str:
    return f"assets/{filename}"


def pdf_path(meditation_name: str) -> str:
    return f"meditations/{meditation_name}/instructions.pdf"


def upload_file(path: str, content: bytes, content_type: str = None) -> str:
    """Upload bytes to Supabase Storage. Returns the storage path."""
    default_storage.save(path, ContentFile(content))
    return path


def download_file(path: str) -> bytes:
    """Download a file from Supabase Storage. Returns bytes."""
    with default_storage.open(path) as f:
        return f.read()


def file_exists(path: str) -> bool:
    """Check if a file exists in Supabase Storage."""
    return default_storage.exists(path)


def delete_file(path: str):
    """Delete a file from Supabase Storage."""
    if default_storage.exists(path):
        default_storage.delete(path)


def file_url(path: str) -> str:
    """Get the public URL for a file in Supabase Storage.

    Uses Supabase's public object URL format instead of S3-style signed URLs.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "meditation-audio")
    return f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"
