"""Pre-generate speech component variations for the box breathing demo.

Generates audio components for each variable value (1-7). Thanks to
the cache-preservation in generate_components, all variations remain
findable by text_hash for instant reuse during assembly.
"""

from django.core.management.base import BaseCommand

from meditations.models import Meditation, Stage
from meditations.services.synthesize import generate_components


MED_NAME = "box-breathing"
STAGE_ID = "box-breathing"


class Command(BaseCommand):
    help = "Pre-generate speech components for all box breathing variable values (1-7)"

    def handle(self, *args, **options):
        try:
            meditation = Meditation.objects.get(name=MED_NAME)
            stage = Stage.objects.get(meditation=meditation, stage_id=STAGE_ID)
        except (Meditation.DoesNotExist, Stage.DoesNotExist):
            self.stderr.write(self.style.ERROR(
                "Box breathing exercise not found. Run seed_box_breathing first."
            ))
            return

        script = stage.script
        base_vars = dict(stage.variables or {})

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

                self.stdout.write(f"  dur={dur}s rounds={rounds}:")
                generate_components(script, MED_NAME, STAGE_ID, extra_variables=extra_vars)

        self.stdout.write(self.style.SUCCESS("\nDone. All component variations cached."))
