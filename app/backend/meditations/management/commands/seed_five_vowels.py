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
                "OH up (Ein Sof, Keser), AH right (south, Micha'el, Chesed), "
                "EH left (north, Gavri'el, Gevurah), EE down (the Shechinah, "
                "Malchus; Refa'el behind in the west), OO forward (east, "
                "Uri'el, Tiferes). The diagrams use the Ramak's colours for "
                "each sefirah (Pardes Rimonim, gate 10)."
            ),
            "directions": (
                "Face east. Sit comfortably. "
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


# How the voice should say words it gets wrong, one word for one word (the
# highlighted word on screen is matched by position, so counts must stay equal).
# Stored on each line as `pronounce` and applied when the voice is generated, so
# editing a line's text in the app keeps these fixes.
SAY = [
    ("Keser", "Kesser"), ("Chesed", "חֶסֶד"), ("Gevurah", "G'voo-rah"),
    ("Tiferes", "Tif-eh-res"), ("Shechinah", "שְׁכִינָה"), ("Ein Sof", "Ayne Sof"),
    ("Micha'el", "מִיכָאֵל"), ("Gavri'el", "Gahv-ree-el"),
    ("Refa'el", "Reh-fah-el"), ("Uri'el", "Oo-ree-el"),
    # in the opening list, a pause after each vowel so they don't run together
    ("oh, ah, eh, ee, oo.", "ohh... ahh... eh... eee... ooo..."),
    # the chanted vowels, drawn out so they aren't read as the letter E and so on
    ("chant Oh.", "chant Ohh."), ("chant Ah.", "chant Ahh."),
    ("chant Ee.", "chant Eee."), ("chant Oo.", "chant Ooo."),
]


def speech(seg_id, text):
    # v3 is ElevenLabs' model that knows Hebrew, so the Hebrew spellings sound right
    seg = {"type": "speech", "id": seg_id, "text": text, "tts_model": "eleven_v3"}
    rules = [[w, s] for w, s in SAY if w in text]
    if rules:
        seg["pronounce"] = rules
    return seg


def vowel(key, label, cue):
    return {
        "type": "loop", "repeat": 1, "label": label, "image": IMG.format(key),
        "segments": [
            speech(f"{key}_cue", cue),
            {"type": "pause", "duration_seconds": "{chantLength}"},
        ],
    }


FIVE_VOWELS_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Arriving", "image": IMG.format("overview"),
        "segments": [
            {
                "type": "speech", "id": "welcome",
                "text": (
                    "Face east. South is on "
                    "your right, north on your left, and west behind you. "
                    "Sit comfortably, and take a few quiet breaths."
                ),
            },
            {"type": "pause", "duration_seconds": 12},
            {
                "type": "speech", "id": "explain",
                "text": (
                    "We will chant five vowels: oh, ah, eh, ee, oo. One vowel "
                    "on each easy out-breath, with a gentle movement of the "
                    "head and an intention to hold throughout, returning to "
                    "centre after each sound."
                ),
            },
            {"type": "pause", "duration_seconds": 4},
        ],
    },
    {
        "type": "loop", "variable": "rounds", "repeat": 1, "label": "Five Vowels",
        "segments": [
            vowel("oh", "Oh: up", (
                "Now you will begin to chant Oh. As you chant, raise your "
                "head, then return to centre. In your mind, receive from "
                "Ein Sof, the Infinite, through Keser, the Crown."
            )),
            vowel("ah", "Ah: right", (
                "Now you will begin to chant Ah. As you chant, turn your head "
                "to the right, toward the south, then return to centre. In "
                "your mind, be aware of Micha'el, the great prince who protects Israel, guarding "
                "your right side, and receive Chesed, warmth and expansion, "
                "the right pillar."
            )),
            vowel("eh", "Eh: left", (
                "Now you will begin to chant Eh. As you chant, turn your head "
                "to the left, toward the north, then return to centre. In "
                "your mind, be aware of Gavri'el, the prince of fire, guarding "
                "your left side, and receive Gevurah, fire and restraint, "
                "the left pillar."
            )),
            vowel("ee", "Ee: down", (
                "Now you will begin to chant Ee. As you chant, lower your head "
                "toward the earth, then return to centre. In your mind, "
                "be aware of Refa'el, who came to heal Avraham, guarding behind you, "
                "in the west, and receive the Shechinah, settling into the "
                "body, here below."
            )),
            vowel("oo", "Oo: forward", (
                "Now you will begin to chant Oo. As you chant, draw your head "
                "forward, toward the east, then return to centre. In your "
                "mind, be aware of Uri'el, the light of God, guarding before "
                "you, in the east, and receive Tiferes, the Temple at the "
                "centre, where heaven and earth meet."
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



def _add_say(segments):
    for seg in segments:
        if seg["type"] == "speech":
            seg.update(speech(seg["id"], seg["text"]))
        elif seg["type"] == "loop":
            _add_say(seg["segments"])


_add_say(FIVE_VOWELS_SCRIPT)

BEFORE_YOU_BEGIN = "## Before you Begin\n\nFigure out which direction is east."


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
                "before_you_begin": BEFORE_YOU_BEGIN,
                "before_you_begin_blocks": [{"type": "text", "content": BEFORE_YOU_BEGIN}],
            },
        )
        self.stdout.write(f"    stage: {stage}")

        self.stdout.write(self.style.SUCCESS(
            "\nDone. Created 1 meditation, 1 stage (five-vowels)."
        ))
