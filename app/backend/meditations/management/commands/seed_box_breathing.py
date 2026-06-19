"""Seed a standalone Box Breathing exercise.

Creates:
- 1 Meditation: box-breathing (public, unowned)
- 1 Stage: box-breathing
"""

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from meditations.models import Meditation, Stage


BOX_BREATHING_INSTRUCTIONS = {
    "description": (
        "Box breathing (square breathing) is a simple, powerful technique "
        "used to calm the nervous system and sharpen focus. Breathe in a "
        "four-phase cycle — inhale, hold, exhale, hold — each phase the "
        "same duration."
    ),
    "stages": [
        {
            "id": "box-breathing",
            "name": "Box Breathing",
            "description": (
                "A structured breathing pattern where each phase — inhale, "
                "hold, exhale, hold — lasts the same number of seconds. "
                "The equal rhythm regulates the autonomic nervous system, "
                "reducing stress and increasing calm alertness."
            ),
            "directions": (
                "Sit upright or stand comfortably. Breathe in through the "
                "nose for the count. Hold the breath for the same count. "
                "Exhale slowly through the mouth for the count. Hold empty "
                "for the count. Repeat."
            ),
            "progression": (
                "Start with a 4-second count per phase. As comfort grows, "
                "extend to 5, 6, or more seconds per phase."
            ),
        },
    ],
}


BOX_BREATHING_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Preparation",
        "segments": [
            {
                "type": "speech", "id": "welcome",
                "text": (
                    "Welcome to box breathing. Find a comfortable position, "
                    "sitting upright or standing. Let your shoulders drop "
                    "and relax."
                ),
            },
            {"type": "pause", "duration_seconds": 5},
            {
                "type": "speech", "id": "explain",
                "text": (
                    "We will breathe in a simple four-phase cycle. "
                    "Inhale, hold, exhale, hold — each phase the same "
                    "length. Let your breathing settle into a steady rhythm."
                ),
            },
            {"type": "pause", "duration_seconds": 5},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "First Guided Cycle",
        "segments": [
            {
                "type": "speech", "id": "first_inhale",
                "text": "Breathe in slowly through your nose.",
            },
            {"type": "pause", "duration_seconds": "{phaseDuration}"},
            {
                "type": "speech", "id": "first_hold_in",
                "text": "Hold.",
            },
            {"type": "pause", "duration_seconds": "{phaseDuration}"},
            {
                "type": "speech", "id": "first_exhale",
                "text": "Exhale slowly and steadily.",
            },
            {"type": "pause", "duration_seconds": "{phaseDuration}"},
            {
                "type": "speech", "id": "first_hold_out",
                "text": "Hold.",
            },
            {"type": "pause", "duration_seconds": "{phaseDuration}"},
        ],
    },
    {
        "type": "loop", "variable": "rounds", "repeat": 5,
        "label": "Box Breathing Cycle",
        "segments": [
            {
                "type": "speech", "id": "inhale_cue",
                "text": "In.",
            },
            {"type": "pause", "duration_seconds": "{phaseDuration}"},
            {
                "type": "speech", "id": "hold_in_cue",
                "text": "Hold.",
            },
            {"type": "pause", "duration_seconds": "{phaseDuration}"},
            {
                "type": "speech", "id": "exhale_cue",
                "text": "Out.",
            },
            {"type": "pause", "duration_seconds": "{phaseDuration}"},
            {
                "type": "speech", "id": "hold_out_cue",
                "text": "Hold.",
            },
            {"type": "pause", "duration_seconds": "{phaseDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Closing",
        "segments": [
            {
                "type": "speech", "id": "close",
                "text": (
                    "Let your breathing return to its natural rhythm. "
                    "Notice how you feel. Carry this calm with you."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
        ],
    },
]


BOX_BREATHING_VARS = {
    "phaseDuration": {
        "value": 4,
        "displayName": "Phase Duration",
        "unit": "seconds",
    },
    "rounds": {
        "value": 5,
        "displayName": "Rounds",
    },
}


class Command(BaseCommand):
    help = "Seed a standalone Box Breathing exercise"

    def handle(self, *args, **options):
        owner = User.objects.get(username="milesbloom")

        meditation, _ = Meditation.objects.update_or_create(
            name="box-breathing",
            defaults={
                "display_name": "Box Breathing",
                "category": "breathing",
                "instructions": BOX_BREATHING_INSTRUCTIONS,
                "is_public": False,
                "created_by": owner,
            },
        )
        self.stdout.write(f"  meditation: {meditation}")

        stage, _ = Stage.objects.update_or_create(
            meditation=meditation,
            stage_id="box-breathing",
            defaults={
                "script": BOX_BREATHING_SCRIPT,
                "variables": BOX_BREATHING_VARS,
            },
        )
        self.stdout.write(f"    stage: {stage}")

        self.stdout.write(self.style.SUCCESS(
            "\nDone. Created 1 meditation, 1 stage (box-breathing)."
        ))
