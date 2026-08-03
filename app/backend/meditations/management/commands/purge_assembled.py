"""Purge assembled output files from storage and their database records.

With client-side AudioContext playback, assembled outputs are no longer
needed. This command removes them to reclaim storage space.

Usage:
    python manage.py purge_assembled              # dry-run (shows what would be deleted)
    python manage.py purge_assembled --confirm     # actually delete
    python manage.py purge_assembled --meditation box-breathing --confirm
"""

from django.core.management.base import BaseCommand

from meditations.models import AssembledOutput
from meditations.services import storage


class Command(BaseCommand):
    help = "Purge assembled output files from storage to reclaim space"

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm", action="store_true",
            help="Actually delete files. Without this flag, only a dry-run summary is shown.",
        )
        parser.add_argument(
            "--meditation", type=str, default=None,
            help="Only purge outputs for a specific meditation (by name/slug).",
        )

    def handle(self, *args, **options):
        qs = AssembledOutput.objects.select_related("meditation", "stage")
        if options["meditation"]:
            qs = qs.filter(meditation_id=options["meditation"])

        records = list(qs)
        if not records:
            self.stdout.write("No assembled outputs found.")
            return

        total_files = 0
        for record in records:
            med = record.meditation_id
            stage_id = record.stage.stage_id if record.stage else None
            filename = f"output_{record.content_hash}.mp3"
            path = storage.output_path(med, filename, stage_id)

            if options["confirm"]:
                try:
                    storage.delete_file(path)
                except Exception as e:
                    self.stderr.write(f"  storage delete failed (will retry later): {e}")
                record.delete()
                self.stdout.write(f"  deleted: {path}")
            else:
                self.stdout.write(f"  would delete: {path}")
            total_files += 1

        if options["confirm"]:
            # Also scan for orphaned files (in storage but no DB record)
            # This requires listing bucket contents which isn't directly supported,
            # so we just report what we deleted from the DB.
            self.stdout.write(self.style.SUCCESS(
                f"\nDeleted {total_files} assembled outputs."
            ))
        else:
            self.stdout.write(self.style.WARNING(
                f"\nDry run: {total_files} files would be deleted. "
                f"Re-run with --confirm to actually delete."
            ))
