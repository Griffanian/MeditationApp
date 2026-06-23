"""Pre-assemble all box breathing demo combinations.

Generates TTS components and fully assembled MP3s for every
phaseDuration × rounds combination (1-7 each = 49 total).
All are stored in Supabase so users always hit the cache instantly.
"""

import io

from django.core.management.base import BaseCommand

from meditations.models import AssembledOutput, Meditation, Stage
from meditations.services import storage
from meditations.services.synthesize import (
    _compute_content_hash,
    assemble,
    generate_components,
)


MED_NAME = "box-breathing"
STAGE_ID = "box-breathing"


class Command(BaseCommand):
    help = "Pre-assemble all box breathing variable combinations (49 total)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Delete all existing AssembledOutput records and regenerate from scratch.",
        )

    def handle(self, *args, **options):
        try:
            meditation = Meditation.objects.get(name=MED_NAME)
            stage = Stage.objects.get(meditation=meditation, stage_id=STAGE_ID)
        except (Meditation.DoesNotExist, Stage.DoesNotExist):
            self.stderr.write(self.style.ERROR(
                "Box breathing exercise not found. Run seed_box_breathing first."
            ))
            return

        if options["force"]:
            deleted, _ = AssembledOutput.objects.filter(
                meditation=meditation, stage=stage,
            ).delete()
            self.stdout.write(f"  Cleared {deleted} existing AssembledOutput records.")

        script = stage.script
        base_vars = dict(stage.variables or {})
        total = 49
        done = 0

        for dur in range(1, 8):
            for rounds in range(1, 8):
                extra_vars = {**base_vars}
                if isinstance(extra_vars.get("phaseDuration"), dict):
                    extra_vars["phaseDuration"] = {**extra_vars["phaseDuration"], "value": dur}
                else:
                    extra_vars["phaseDuration"] = dur
                if isinstance(extra_vars.get("rounds"), dict):
                    extra_vars["rounds"] = {**extra_vars["rounds"], "value": rounds}
                else:
                    extra_vars["rounds"] = rounds

                # Generate components first — required before hashing (clip hashes must exist)
                generate_components(script, MED_NAME, STAGE_ID, extra_variables=extra_vars)

                # Use the same hash function as the live assemble view
                h = _compute_content_hash(script, extra_vars, MED_NAME, STAGE_ID, base_vars)

                # Skip if already assembled
                if AssembledOutput.objects.filter(meditation=meditation, stage=stage, content_hash=h).exists():
                    done += 1
                    self.stdout.write(f"  [{done}/{total}] cached dur={dur}s rounds={rounds}")
                    continue

                self.stdout.write(f"  [{done + 1}/{total}] assembling dur={dur}s rounds={rounds}...")

                audio = assemble(script, MED_NAME, STAGE_ID, variables=extra_vars)

                buf = io.BytesIO()
                audio.export(buf, format="mp3", bitrate="192k")
                buf.seek(0)

                filename = f"output_{h}.mp3"
                file_path = storage.output_path(MED_NAME, filename, STAGE_ID)
                storage.upload_file(file_path, buf.read(), content_type="audio/mpeg")

                AssembledOutput.objects.get_or_create(
                    meditation=meditation,
                    stage=stage,
                    content_hash=h,
                    defaults={"audio_file": file_path, "duration": len(audio) / 1000},
                )

                done += 1
                self.stdout.write(f"    done ({len(audio) / 1000:.0f}s audio)")

        self.stdout.write(self.style.SUCCESS(f"\nDone. All {total} combinations assembled."))
