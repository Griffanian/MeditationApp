"""Pre-assemble all unique stage/variable combinations for a practice.

Iterates through every week/day/item, deduplicates by
(meditation, stage_id, variables), then generates components and
assembles the MP3 so that playback always hits the cache.
"""

import io
import json
import time

from django.core.management.base import BaseCommand

from meditations.models import AssembledOutput, Meditation, Practice, Stage
from meditations.services import storage
from meditations.services.synthesize import (
    _compute_content_hash,
    assemble,
    generate_components,
)


class Command(BaseCommand):
    help = "Pre-assemble all unique stage combinations for a practice programme"

    def add_arguments(self, parser):
        parser.add_argument("practice", help="Practice name (slug) or display name substring")
        parser.add_argument(
            "--force", action="store_true",
            help="Re-assemble even if cached output already exists",
        )

    def handle(self, *args, **options):
        query = options["practice"]
        practice = Practice.objects.filter(name=query).first()
        if not practice:
            practice = Practice.objects.filter(display_name__icontains=query).first()
        if not practice:
            self.stderr.write(self.style.ERROR(f"Practice not found: {query}"))
            return

        self.stdout.write(f"Practice: {practice.display_name} ({practice.name})")

        items = practice.items or []

        # Collect unique (meditation, stage_id, variables) combinations
        unique = {}
        for week in items:
            for day in week.get("days", []):
                for item in day.get("items", []):
                    key = (
                        item["meditation"],
                        item["stage_id"],
                        json.dumps(item.get("variables") or {}, sort_keys=True),
                    )
                    if key not in unique:
                        unique[key] = item

        total = len(unique)
        self.stdout.write(f"Unique combinations to assemble: {total}\n")

        done = 0
        cached = 0
        errors = 0
        t_start = time.monotonic()

        for (med_name, stage_id, vars_json), item in unique.items():
            done += 1
            label = f"{item.get('meditation_display', med_name)}/{item.get('stage_name', stage_id)}"
            variables = json.loads(vars_json)
            vars_short = ", ".join(
                f"{k}={v.get('value', v) if isinstance(v, dict) else v}"
                for k, v in variables.items()
            ) if variables else "defaults"

            try:
                meditation = Meditation.objects.get(name=med_name)
                stage = Stage.objects.get(meditation=meditation, stage_id=stage_id)
            except (Meditation.DoesNotExist, Stage.DoesNotExist):
                self.stderr.write(f"  [{done}/{total}] SKIP — not found: {med_name}/{stage_id}")
                errors += 1
                continue

            script = stage.script
            if not script:
                self.stderr.write(f"  [{done}/{total}] SKIP — no script: {label}")
                errors += 1
                continue

            extra_vars = dict(stage.variables or {})
            if variables:
                extra_vars.update(variables)
            stage_variables = stage.variables or {}

            t0 = time.monotonic()

            generate_components(script, med_name, stage_id, extra_variables=extra_vars)
            h = _compute_content_hash(script, extra_vars, med_name, stage_id, stage_variables)

            # Check cache
            if not options["force"] and AssembledOutput.objects.filter(
                meditation=meditation, stage=stage, content_hash=h,
            ).exists():
                elapsed = time.monotonic() - t0
                self.stdout.write(f"  [{done}/{total}] cached ({elapsed:.1f}s): {label} [{vars_short}]")
                cached += 1
                continue

            try:
                audio = assemble(script, med_name, stage_id, variables=extra_vars)
            except (ValueError, Exception) as e:
                elapsed = time.monotonic() - t0
                self.stderr.write(f"  [{done}/{total}] ERROR ({elapsed:.1f}s): {label} [{vars_short}] — {e}")
                errors += 1
                continue

            buf = io.BytesIO()
            audio.export(buf, format="mp3", bitrate="192k")
            buf.seek(0)

            filename = f"output_{h}.mp3"
            file_path = storage.output_path(med_name, filename, stage_id)
            storage.upload_file(file_path, buf.read(), content_type="audio/mpeg")

            AssembledOutput.objects.get_or_create(
                meditation=meditation,
                stage=stage,
                content_hash=h,
                defaults={"audio_file": file_path, "duration": len(audio) / 1000},
            )

            elapsed = time.monotonic() - t0
            dur = len(audio) / 1000
            self.stdout.write(
                f"  [{done}/{total}] assembled ({elapsed:.1f}s, {dur:.0f}s audio): {label} [{vars_short}]"
            )

        total_time = time.monotonic() - t_start
        self.stdout.write(self.style.SUCCESS(
            f"\nDone in {total_time:.0f}s. "
            f"{total} total, {cached} cached, {total - cached - errors} assembled, {errors} errors."
        ))
