"""Import legacy file-based meditation data into Django models + Supabase Storage."""

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from meditations.models import (
    Asset,
    AssembledOutput,
    Meditation,
    Stage,
)
from meditations.services import storage


class Command(BaseCommand):
    help = "Import legacy meditation data from output/ and assets/ directories"

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            default="output",
            help="Path to the legacy output directory (default: output)",
        )
        parser.add_argument(
            "--assets",
            default="assets",
            help="Path to the legacy assets directory (default: assets)",
        )

    def handle(self, *args, **options):
        output_dir = Path(options["source"])
        assets_dir = Path(options["assets"])

        if assets_dir.exists():
            self._import_assets(assets_dir)

        if output_dir.exists():
            for med_dir in sorted(output_dir.iterdir()):
                if med_dir.is_dir():
                    self._import_meditation(med_dir)

        self.stdout.write(self.style.SUCCESS("Import complete."))

    def _import_assets(self, assets_dir):
        self.stdout.write("Importing assets...")
        for f in assets_dir.iterdir():
            if f.suffix == ".mp3":
                self.stdout.write(f"  asset: {f.name}")
                file_path = storage.asset_path(f.name)
                storage.upload_file(file_path, f.read_bytes(), content_type="audio/mpeg")

                trim_path = assets_dir / f"{f.name}_trim.json"
                trim_meta = {}
                if trim_path.exists():
                    trim_meta = json.loads(trim_path.read_text())

                Asset.objects.update_or_create(
                    filename=f.name,
                    defaults={"audio_file": file_path, "trim_meta": trim_meta},
                )

    def _import_meditation(self, med_dir):
        name = med_dir.name
        self.stdout.write(f"\nImporting meditation: {name}")

        # Meta
        meta = {}
        meta_path = med_dir / "meta.json"
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())

        # Instructions
        instructions = {"description": "", "stages": []}
        instr_path = med_dir / "instructions.json"
        if instr_path.exists():
            instructions = json.loads(instr_path.read_text())

        # Root script
        script = []
        script_path = med_dir / "script.json"
        if script_path.exists():
            script = json.loads(script_path.read_text())

        meditation, _ = Meditation.objects.update_or_create(
            name=name,
            defaults={
                "display_name": meta.get("display_name", name.capitalize()),
                "category": meta.get("category", "uncategorised"),
                "instructions": instructions,
                "script": script,
            },
        )

        # Instructions PDF
        pdf_path = med_dir / "instructions.pdf"
        if pdf_path.exists():
            self.stdout.write("  uploading instructions PDF...")
            storage_path = storage.pdf_path(name)
            storage.upload_file(storage_path, pdf_path.read_bytes(), content_type="application/pdf")

        # Root-level components
        root_components_dir = med_dir / "components"
        if root_components_dir.exists():
            self._import_components(meditation, None, root_components_dir, name)

        # Stages
        stages_dir = med_dir / "stages"
        if stages_dir.exists():
            for stage_dir in sorted(stages_dir.iterdir()):
                if stage_dir.is_dir():
                    self._import_stage(meditation, stage_dir, name)

    def _import_stage(self, meditation, stage_dir, med_name):
        stage_id = stage_dir.name
        self.stdout.write(f"  stage: {stage_id}")

        # Stage script
        script = []
        script_path = stage_dir / "script.json"
        if script_path.exists():
            script = json.loads(script_path.read_text())

        # Stage variables
        variables = {}
        vars_path = stage_dir / "variables.json"
        if vars_path.exists():
            variables = json.loads(vars_path.read_text())

        stage, _ = Stage.objects.update_or_create(
            meditation=meditation,
            stage_id=stage_id,
            defaults={"script": script, "variables": variables},
        )

        # Stage components
        components_dir = stage_dir / "components"
        if components_dir.exists():
            self._import_components(meditation, stage, components_dir, med_name, stage_id)

        # Assembled outputs
        for output_file in stage_dir.glob("output_*.mp3"):
            self.stdout.write(f"    output: {output_file.name}")
            script_hash = output_file.stem.replace("output_", "")
            file_path = storage.output_path(med_name, output_file.name, stage_id)
            storage.upload_file(file_path, output_file.read_bytes(), content_type="audio/mpeg")

            from pydub import AudioSegment as PydubAudio
            audio = PydubAudio.from_mp3(output_file)

            AssembledOutput.objects.update_or_create(
                meditation=meditation,
                stage=stage,
                content_hash=script_hash,
                defaults={
                    "audio_file": file_path,
                    "duration": len(audio) / 1000,
                },
            )

    def _import_components(self, meditation, stage, components_dir, med_name, stage_id=None):
        # Find all unique segment IDs from mp3 files
        seg_ids = set()
        for mp3 in components_dir.glob("*.mp3"):
            seg_ids.add(mp3.stem)

        for seg_id in sorted(seg_ids):
            mp3_path = components_dir / f"{seg_id}.mp3"
            if not mp3_path.exists():
                continue

            self.stdout.write(f"    component: {seg_id}")

            # Upload audio
            file_path = storage.component_path(med_name, seg_id, stage_id)
            storage.upload_file(file_path, mp3_path.read_bytes(), content_type="audio/mpeg")

            # Read metadata files
            hash_path = components_dir / f"{seg_id}_hash.txt"
            text_hash = hash_path.read_text().strip() if hash_path.exists() else ""

            timestamps_path = components_dir / f"{seg_id}_timestamps.json"
            timestamps = json.loads(timestamps_path.read_text()) if timestamps_path.exists() else []

            trim_path = components_dir / f"{seg_id}_trim.json"
            trim_meta = json.loads(trim_path.read_text()) if trim_path.exists() else {}

            # Legacy import — create a UserUploadedClip and SpeechSegmentAudio
            from meditations.models import SpeechSegmentAudio, UserUploadedClip
            user_clip = UserUploadedClip.objects.create(audio_file=file_path, duration=0)
            trim_start = trim_meta.get("start")
            trim_end = trim_meta.get("end")
            SpeechSegmentAudio.objects.update_or_create(
                meditation=meditation,
                stage=stage,
                seg_id=seg_id,
                defaults={
                    "user_clip": user_clip,
                    "trim_start": trim_start,
                    "trim_end": trim_end,
                },
            )
