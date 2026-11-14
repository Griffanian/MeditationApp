"""Seed the Five Vowel Meditation (Rabbi Ben Newman's adaptation of Abulafia's vowel practice).

Creates:
- 1 Category: circle-of-protection (in the Jewish Practices group)
- 1 Meditation: five-vowels (private, owned by milesbloom)
- 1 Stage: five-vowels

Each vowel section carries an `image` (a diagram in frontend/public/images/vowels/),
which the player shows while that section plays.
"""

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from meditations.models import Category, Group, Meditation, Stage


IMG = "/images/vowels/{}.svg"

FIVE_VOWELS_INSTRUCTIONS = {
    "description": (
        "Rabbi Ben Newman's adaptation of Abraham Abulafia's vowel practice. "
        "Chant five vowels, each with a gentle head movement, to ground "
        "yourself in time and space. It is the first step toward the circle "
        "of protection: becoming aware of the forces and directions around you."
    ),
    "stages": [
        {
            "id": "five-vowels",
            "name": "Five Vowels",
            "description": (
                "OH up (Ein Sof, Keter), AH right (south, Mikha'el, Chesed), "
                "EH left (north, Gavri'el, Gevurah), EE down (the Shekhinah, "
                "Malkhut; Refa'el behind in the west), OO forward (east, "
                "Uri'el, Tiferet). The diagrams use the Ramak's colours for "
                "each sefirah (Pardes Rimonim, gate 10)."
            ),
            "directions": (
                "Face east, or imagine east in front of you. Sit comfortably. "
                "Chant one vowel on each easy outbreath, make the movement, "
                "and return to centre after each sound."
            ),
            "progression": (
                "One round a day is enough. Afterwards, note a few words about "
                "your experience to bring to the next session."
            ),
        },
    ],
}


def vowel(key, label, cue):
    return {
        "type": "loop", "repeat": 1, "label": label, "image": IMG.format(key),
        "segments": [
            {"type": "speech", "id": f"{key}_cue", "text": cue},
            {"type": "pause", "duration_seconds": "{chantLength}"},
            {"type": "pause", "duration_seconds": 3},
        ],
    }


FIVE_VOWELS_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Arriving", "image": IMG.format("overview"),
        "segments": [
            {
                "type": "speech", "id": "welcome",
                "text": (
                    "Face east, or imagine east in front of you. South is on "
                    "your right, north on your left, and west behind you. "
                    "Sit comfortably, and take a few quiet breaths."
                ),
            },
            {"type": "pause", "duration_seconds": 12},
            {
                "type": "speech", "id": "explain",
                "text": (
                    "We will chant five vowels: oh, ah, eh, ee, oo. One vowel "
                    "on each easy outbreath, with a gentle movement of the "
                    "head, returning to centre after each sound."
                ),
            },
            {"type": "pause", "duration_seconds": 4},
        ],
    },
    {
        "type": "loop", "variable": "rounds", "repeat": 1, "label": "Five Vowels",
        "segments": [
            vowel("oh", "Oh: up", (
                "Oh. Raise your head as you chant, then return. "
                "Receive from Ein Sof, the Infinite, through Keter, the Crown."
            )),
            vowel("ah", "Ah: right", (
                "Ah. Turn your head to the right, toward the south, and return. "
                "Mikha'el stands at your right. Warmth and expansion: "
                "Chesed, the right pillar."
            )),
            vowel("eh", "Eh: left", (
                "Eh. Turn your head to the left, toward the north, and return. "
                "Gavri'el stands at your left. Coolness and containment: "
                "Gevurah, the left pillar."
            )),
            vowel("ee", "Ee: down", (
                "Ee. Lower your head toward the earth, and return. "
                "Refa'el stands behind you, in the west. Settle into the body, "
                "and meet the Shekhinah here."
            )),
            vowel("oo", "Oo: forward", (
                "Oo. Draw your head forward, toward the east, and return. "
                "Uri'el stands before you. Gather everything at the centre: "
                "Tiferet, the Temple, where heaven and earth meet."
            )),
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Closing", "image": IMG.format("overview"),
        "segments": [
            {
                "type": "speech", "id": "close",
                "text": (
                    "Sit quietly, and notice what is present. If it helps, "
                    "jot down a few words about your experience to bring to "
                    "your next session."
                ),
            },
            {"type": "pause", "duration_seconds": 20},
        ],
    },
]


FIVE_VOWELS_VARS = {
    "chantLength": {
        "value": 8,
        "displayName": "Chant Length",
        "unit": "seconds",
    },
    "rounds": {
        "value": 1,
        "displayName": "Rounds",
    },
}


class Command(BaseCommand):
    help = "Seed the Five Vowel Meditation"

    def handle(self, *args, **options):
        owner = User.objects.get(username="milesbloom")

        category, _ = Category.objects.update_or_create(
            name="circle-of-protection",
            defaults={
                "display_name": "Circle of Protection",
                "group": Group.objects.get(name="jewish-practices"),
                "sort_order": 20,
                "created_by": owner,
            },
        )
        self.stdout.write(f"  category: {category}")

        meditation, _ = Meditation.objects.update_or_create(
            name="five-vowels",
            defaults={
                "display_name": "Five Vowel Meditation",
                "category": category.name,
                "instructions": FIVE_VOWELS_INSTRUCTIONS,
                "is_public": False,
                "created_by": owner,
            },
        )
        self.stdout.write(f"  meditation: {meditation}")

        stage, _ = Stage.objects.update_or_create(
            meditation=meditation,
            stage_id="five-vowels",
            defaults={
                "script": FIVE_VOWELS_SCRIPT,
                "variables": FIVE_VOWELS_VARS,
            },
        )
        self.stdout.write(f"    stage: {stage}")

        self.stdout.write(self.style.SUCCESS(
            "\nDone. Created 1 meditation, 1 stage (five-vowels)."
        ))
