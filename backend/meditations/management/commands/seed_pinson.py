"""Seed Rav Pinson 'Breathing and Quieting the Mind' meditations.

Creates:
- 1 Category: "Breathing & Quieting the Mind"
- 2 Meditations: quieting-the-mind (Part One), pinson-breathing (Part Two)
- 9 Stages with full scripts and variables
- 1 Practice programme (4-week progressive)
"""

import uuid

from django.core.management.base import BaseCommand

from meditations.models import Category, Meditation, Practice, Stage


def _item_id():
    return f"item-{uuid.uuid4().hex[:12]}"


# ─────────────────────────────────────────────────────────────────────
# PART ONE — QUIETING THE MIND
# ─────────────────────────────────────────────────────────────────────

QUIETING_INSTRUCTIONS = {
    "description": (
        "Part One of Rav DovBer Pinson's 'Breathing and Quieting the Mind'. "
        "Three meditations training the capacity for controlled, quiet thinking "
        "through Habata (observation) and Hashkata (quieting)."
    ),
    "stages": [
        {
            "id": "habata-hashkata",
            "name": "1. Habata / Hashkata — Quieting the Mind & Observing",
            "description": (
                "Empties the mind of everyday thoughts by first observing them "
                "and intentionally releasing them, then bringing the mind to "
                "focus on a chosen thought. Trains controlled, quiet thinking."
            ),
            "directions": (
                "Choose a focal-point word or verse before sitting. "
                "Set a timer. Sit comfortably, shoulder rolls to relax. "
                "Enter Hashkata: sit in silence, let thoughts come and go. "
                "Enter Habata: observe your thoughts. "
                "Introduce focal point, recite it repeatedly. "
                "As mind quiets, introduce your question or challenge. "
                "Sit with it. Close with prayer/nigun and gratitude."
            ),
            "progression": (
                "Foundation practice. Underlies Meditation II (daily) "
                "and Meditation III (self-analysis)."
            ),
        },
        {
            "id": "daily-hashkata",
            "name": "2. Hashkata for Daily Living",
            "description": (
                "A stripped-down, on-demand version of Habata/Hashkata "
                "usable at any point in the day for indecision, lack of focus, "
                "or anxiety. Clears the vessel and allows objective clarity."
            ),
            "directions": (
                "Place question in front of mind. Sit comfortably, close eyes. "
                "Let go of internal noise. Observe without manipulation. "
                "Choose anchor word/saying, repeat steadily. "
                "Observe thoughts gently, return to focal point. "
                "As mind settles, introduce your question, repeat it softly. "
                "Allow resolution to rise. Seal with prayer, open eyes."
            ),
            "progression": (
                "Practical daily distillation of Meditation I. "
                "Can be used on-demand throughout the day."
            ),
        },
        {
            "id": "observing-thoughts",
            "name": "3. Habata — Observing One's Thought Patterns",
            "description": (
                "Uses Habata observation not to resolve a specific question "
                "but to reveal which areas of life are demanding attention "
                "and repair. The mind's wandering reveals what needs inner work."
            ),
            "directions": (
                "Sit comfortably, close eyes. Bring focal point: "
                "'Observing One's Thoughts'. Allow distractions without effort. "
                "Return to focal point, welcome fresh ideas on observation. "
                "As focus steadies, observe where mind wanders — without going "
                "there. Notice: grudges, debts, desires, fears. "
                "Make a verbal resolution to work on the area that keeps arising. "
                "Seal with gratitude for self-work from a place of love."
            ),
            "progression": (
                "Advanced extension of Habata. Diagnostic rather than "
                "question-resolving. Discovers what needs inner work."
            ),
        },
    ],
}

HABATA_HASHKATA_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Preparation",
        "segments": [
            {
                "type": "speech", "id": "welcome",
                "text": (
                    "Welcome. Find your seat. Comfortable, but not so "
                    "relaxed that you might fall asleep."
                ),
            },
            {"type": "pause", "duration_seconds": 5},
            {
                "type": "speech", "id": "shoulders",
                "text": (
                    "Take a few shoulder rolls. Raise your arms overhead "
                    "and release them with the breath, stretching the lung "
                    "tissue and relaxing the upper body."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
            {
                "type": "speech", "id": "focal_intro",
                "text": (
                    "Before we begin, bring to mind your chosen focal point. "
                    "A word, a verse, a saying. Something like: All is One. "
                    "Or: Create for me a pure heart. Hold it gently."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "question_prep",
                "text": (
                    "Also bring to mind a question, a challenge, or a "
                    "character trait you wish to work on. We will return "
                    "to it later."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Hashkata — Quieting",
        "segments": [

            {
                "type": "speech", "id": "enter",
                "text": (
                    "Now, invite all of yourself into this moment. "
                    "You may close your eyes if it helps. "
                    "Sit in silence and solitude."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
            {
                "type": "speech", "id": "letting_go",
                "text": (
                    "As sounds, sensations, thoughts, and feelings arise, "
                    "allow them to surface. Without holding onto them. "
                    "Without internalizing or judging them. "
                    "As they come, so they go."
                ),
            },
            {"type": "pause", "duration_seconds": 5},
            {
                "type": "speech", "id": "deep_breaths",
                "text": (
                    "Take a few deep breaths of transition. "
                    "With each exhale, let it all go. Simply be."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Habata — Observation",
        "segments": [
            {
                "type": "speech", "id": "observe",
                "text": (
                    "Gently bring your awareness to your thoughts. "
                    "Are they random? Foolish? Incessant? "
                    "Simply observe. Without judgment."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Focal Point Recitation",
        "segments": [
            {
                "type": "speech", "id": "focal_begin",
                "text": (
                    "Now, softly begin to recite your chosen saying. "
                    "Again and again. Let it serve as the focal point "
                    "of your meditation, returning your mind to center "
                    "when it wanders. The repetition of the saying "
                    "diffuses distraction."
                ),
            },
            {"type": "pause", "duration_seconds": "{focalDuration}"},
            {
                "type": "speech", "id": "focal_mid",
                "text": (
                    "With gentle awareness, sense your head becoming "
                    "more empty and quiet. If your mind wanders astray, "
                    "return to your focal point. Keep reciting with "
                    "gentleness and calm. Try not to work yourself up."
                ),
            },
            {"type": "pause", "duration_seconds": "{focalDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "The Question",
        "segments": [

            {
                "type": "speech", "id": "question_intro",
                "text": (
                    "As the mind reaches quiet and settled shores, "
                    "introduce your question. Your challenge. "
                    "Your affirmation. Allow this to become your new "
                    "saying, repeating it smoothly and steadily."
                ),
            },
            {"type": "pause", "duration_seconds": "{questionDuration}"},
            {
                "type": "speech", "id": "question_open",
                "text": "Become open to inner awakening and clarity.",
            },
            {"type": "pause", "duration_seconds": "{questionDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Closing",
        "segments": [

            {
                "type": "speech", "id": "close",
                "text": (
                    "Gently begin to return. Do not rush back into a "
                    "fast, thoughtless pace. Seal your meditation with "
                    "a prayer, a nigun, a melody. Affirm that what you "
                    "have worked is being realized. Seal with an offering "
                    "of gratitude."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
        ],
    },
]

HABATA_HASHKATA_VARS = {
    "focalDuration": {
        "value": 30,
        "displayName": "Focal Point Duration",
        "unit": "seconds",
    },
    "questionDuration": {
        "value": 30,
        "displayName": "Question Duration",
        "unit": "seconds",
    },
}


DAILY_HASHKATA_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Settling In",
        "segments": [
            {
                "type": "speech", "id": "welcome",
                "text": (
                    "Place the question you are working on in the front "
                    "of your mind. Sit comfortably and relaxed, but not "
                    "so relaxed you may fall asleep. Close your eyes."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "let_go",
                "text": (
                    "Take a moment for letting go of all the internal "
                    "noise, chaos, and fluctuations. Simply be."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
            {
                "type": "speech", "id": "observe",
                "text": (
                    "You may notice various sounds, bodily sensations, "
                    "thoughts, or feelings arise. Without manipulating "
                    "or changing a thing, observe it all."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Anchoring",
        "segments": [
            {
                "type": "speech", "id": "anchor",
                "text": (
                    "Choose a sound, word, or saying that is easy to "
                    "repeat as your focal point. Gently anchor your "
                    "awareness in this focal point. Repeat it steadily "
                    "and smoothly, over and over again."
                ),
            },
            {"type": "pause", "duration_seconds": "{anchorDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Habata — Observation",
        "segments": [
            {
                "type": "speech", "id": "habata",
                "text": (
                    "Observe your thoughts with gentleness and calmness. "
                    "Do not judge them or get upset with yourself for "
                    "having them. Simply observe and let go, returning "
                    "to your focal point."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "many_thoughts",
                "text": (
                    "Many thoughts may come up. Observe them. "
                    "And go back to the focal point."
                ),
            },
            {"type": "pause", "duration_seconds": "{anchorDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "The Question",
        "segments": [

            {
                "type": "speech", "id": "question",
                "text": (
                    "As the mind settles and the onrush of random thoughts "
                    "quiets, introduce your more complex question. "
                    "Slowly and softly, repeat the question to yourself, "
                    "over and over."
                ),
            },
            {"type": "pause", "duration_seconds": "{questionDuration}"},
            {
                "type": "speech", "id": "resolution",
                "text": (
                    "As you approach the issue from a place of steady calm, "
                    "invite resolution to rise. Allow it to settle. "
                    "Sit with it."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Sealing",
        "segments": [

            {
                "type": "speech", "id": "seal",
                "text": (
                    "Seal your practice with a prayer of hope and longing, "
                    "for the answer you receive to be actualized and "
                    "integrated into your life. Gently open your eyes."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
]

DAILY_HASHKATA_VARS = {
    "anchorDuration": {
        "value": 20,
        "displayName": "Anchor Duration",
        "unit": "seconds",
    },
    "questionDuration": {
        "value": 30,
        "displayName": "Question Duration",
        "unit": "seconds",
    },
}


OBSERVING_THOUGHTS_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Settling In",
        "segments": [
            {
                "type": "speech", "id": "welcome",
                "text": (
                    "Sit in your meditation spot. Comfortable, but not "
                    "overly relaxed. Close your eyes."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "focal",
                "text": (
                    "Bring to your mind's eye the phrase: Observing One's "
                    "Thoughts. This serves as your focal point. Create a "
                    "visual to accompany these words."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Allowing",
        "segments": [
            {
                "type": "speech", "id": "allow",
                "text": (
                    "Various sounds, sensations, thoughts, or feelings may "
                    "begin to cross your mind. Allow for these distractions "
                    "without any effort to alter or understand them. "
                    "Hold your center."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "return",
                "text": (
                    "Return to your focal point. Welcome fresh ideas "
                    "on observation."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Steady Observation",
        "segments": [
            {
                "type": "speech", "id": "steady",
                "text": (
                    "As your focus steadies, open to the awareness of "
                    "where your mind wanders. Observe with gentleness "
                    "and objectivity. Do not enter deeply into the deluge "
                    "of emotions or judgments that tempt to overshadow."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "resist",
                "text": (
                    "Resisting distraction only serves to empower "
                    "distraction. Whether these thoughts are of someone "
                    "to whom you hold a grudge, a debt you want to pay off, "
                    "or a new path you want to explore — watch them from "
                    "your grounded seat."
                ),
            },
            {"type": "pause", "duration_seconds": "{observeDuration}"},
            {
                "type": "speech", "id": "notice",
                "text": (
                    "While maintaining your focal point, simply notice "
                    "where your mind wanders. Do not go there. "
                    "Simply observe."
                ),
            },
            {"type": "pause", "duration_seconds": "{observeDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Resolution & Sealing",
        "segments": [

            {
                "type": "speech", "id": "resolution",
                "text": (
                    "Now, make a resolution to work on this area in your "
                    "life that keeps coming up. Verbally declare to "
                    "yourself: I am going to deal with this issue."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
            {
                "type": "speech", "id": "seal",
                "text": (
                    "Let this experience settle. Let the greater awareness "
                    "of yourself seep in. Seal your practice with gratitude "
                    "for the opportunity of self-work from a place of love."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
]

OBSERVING_THOUGHTS_VARS = {
    "observeDuration": {
        "value": 30,
        "displayName": "Observation Duration",
        "unit": "seconds",
    },
}


# ─────────────────────────────────────────────────────────────────────
# PART TWO — BREATHING
# ─────────────────────────────────────────────────────────────────────

BREATHING_INSTRUCTIONS = {
    "description": (
        "Part Two of Rav DovBer Pinson's 'Breathing and Quieting the Mind'. "
        "Six breathing meditations progressing from Lower Unity (Yichuda "
        "Tata'ah) through Higher Unity (Yichuda Ila'ah), the three stages "
        "of breath (Sheifah, Neshifa, B'lima), emotional progression "
        "(Fear, Awe, Pleasure), constant renewal (Chidush), and a "
        "synthesizing daily technique."
    ),
    "stages": [
        {
            "id": "lower-unity",
            "name": "4. Lower Unity — Yichuda Tata'ah",
            "description": (
                "Breath-awareness practice: each inhalation receives the "
                "Divine Cosmic Exhale, each exhalation returns oneself to "
                "the Divine Source. Yichuda Tata'ah — the self exists as "
                "a distinct entity but is utterly dependent on the "
                "continuous Divine Life Force."
            ),
            "directions": (
                "Clear space and commit. Sit comfortably, lower chin slightly. "
                "Let go, observe without manipulation. Bring awareness to "
                "natural breathing through nostrils. Meditate on inhale as "
                "receiving the Supernal Breath. Meditate on exhale as "
                "returning to the Divine Source. Embrace the awareness. "
                "Seal with gratitude."
            ),
            "progression": (
                "First breathing meditation. Foundation for Higher Unity "
                "(Meditation II). Must be 'somewhat mastered' before "
                "progressing."
            ),
        },
        {
            "id": "higher-unity",
            "name": "5. Higher Unity — Yichuda Ila'ah",
            "description": (
                "Advanced breath meditation: no separate 'I' receiving or "
                "giving breath — there is only breath, the Supernal Life "
                "Force flowing through. Moving from 'I am breathing' to "
                "'there is only breath, there is only One.'"
            ),
            "directions": (
                "Clear space and commit. Sit comfortably, lower chin. "
                "Center in the here and now. Observe without manipulation. "
                "Bring awareness to breathing. As mind settles, open to "
                "fluidity and aliveness within. Connect with the deep "
                "intimacy shared with the Creator. The rhythm of breath is "
                "the Divine flowing within. Stop feeling, sensing, thinking "
                "— allow the Supernal Breath to flow through you. "
                "Seal from within the Unity."
            ),
            "progression": (
                "Builds on Lower Unity. Dissolves the self/other duality. "
                "Associated with Deviekus (cleaving/union)."
            ),
        },
        {
            "id": "three-stages",
            "name": "6. Three Stages — Sheifah, Neshifa, B'lima",
            "description": (
                "Meditation on three phases of breath: Sheifah (inhale — "
                "to aspire), Neshifa (exhale), and B'lima (retention — "
                "nothingness). The B'lima after the exhale is the period "
                "of supreme spiritual importance: empty of the past, not "
                "yet impregnated with the future."
            ),
            "directions": (
                "Bring awareness to the full cycle. Sheifah: inhale, drawing "
                "life in. B'lima: retention after inhale, fullness. "
                "Neshifa: exhale, releasing. B'lima: retention after exhale "
                "— empty, pure potential, the moment of Tzimtzum before "
                "new creation."
            ),
            "progression": (
                "Third breathing meditation. Introduces B'lima (retention) "
                "as the third dimension. Foundation for Meditations IV and V."
            ),
        },
        {
            "id": "fear-awe-pleasure",
            "name": "7. Fear, Awe, and Pleasure — Yirah to Ta'anug",
            "description": (
                "Progressive breath meditation through three emotional-"
                "spiritual registers: Yirah as fear (contracted), Yirah as "
                "awe (expansive), and Ta'anug (pleasure/delight of the "
                "Ein Sof). Uses breath to shift from contraction to "
                "expansion to delight."
            ),
            "directions": (
                "Begin in present emotional state, acknowledge contraction. "
                "Exhale: release contracted, fearful Yirah. "
                "Inhale: breathe in the Yirah of awe, reverential expansion. "
                "As awe deepens, open to Ta'anug — the deepest pleasure, "
                "delight in the presence of the Divine. "
                "Seal from within the state arrived at."
            ),
            "progression": (
                "Builds on three-stage structure. Extends it into an "
                "emotional/spiritual progression."
            ),
        },
        {
            "id": "renewal",
            "name": "8. Renewal at Every Moment — Chidush",
            "description": (
                "Meditation on the principle that creation is constantly "
                "renewed at every instant. Each inhale is literally new "
                "life — Chidush. Each exhale is completion. The B'lima "
                "after exhale is complete emptiness before new creation. "
                "Each breath: Tzimtzum (contraction) and Ohr (light)."
            ),
            "directions": (
                "Settle, allow natural breathing. Meditate on exhale as "
                "completion of a moment of life. Dwell in B'lima after "
                "exhale: emptiness, Tzimtzum, pure potential. Meditate on "
                "inhale as brand-new creation — new life, new light, Ohr "
                "returning anew. Rest in awareness of constant renewal. "
                "Seal with gratitude."
            ),
            "progression": (
                "Builds on three-stage structure. Adds Chidush (constant "
                "renewal) as the contemplative lens for the B'lima."
            ),
        },
        {
            "id": "daily-breathing",
            "name": "9. Daily Breathing Technique — Synthesis",
            "description": (
                "Streamlined, all-in-one breathing technique synthesizing "
                "the core insights of all preceding breathing meditations. "
                "Practical, portable, designed for daily use. Four-phase "
                "breath cycle with layered kavvanah (intention)."
            ),
            "directions": (
                "Sit or stand, lower chin. Natural breathing through "
                "nostrils. Inhale with intention (Sheifah): new life from "
                "the Supernal Source. Hold briefly (B'lima after inhale): "
                "fullness. Exhale with intention (Neshifa): returning to "
                "Source. Hold briefly (B'lima after exhale): pure potential. "
                "Repeat. Layer in kavvanah: Lower Unity, Higher Unity, "
                "three-stage awareness, Fear/Awe/Pleasure, or renewal. "
                "Seal with gratitude."
            ),
            "progression": (
                "Final synthesizing practice. Integrates all five prior "
                "breathing meditations into a single daily structure."
            ),
        },
    ],
}


LOWER_UNITY_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Preparation",
        "segments": [
            {
                "type": "speech", "id": "commit",
                "text": (
                    "Every meditation begins with a commitment to honor "
                    "the time you make for your practice. Clear space in "
                    "yourself. Let the physical space around you feel "
                    "inviting, warm, and safe."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "sit",
                "text": (
                    "Sit comfortably and relaxed, but not overly relaxed "
                    "that you may fall asleep. Close your eyes."
                ),
            },
            {"type": "pause", "duration_seconds": 5},
            {
                "type": "speech", "id": "chin",
                "text": (
                    "Slightly lower your chin towards your chest. "
                    "This lengthens the back of your neck and switches "
                    "gears into the parasympathetic nervous system, "
                    "promoting relaxation."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Letting Go",
        "segments": [
            {
                "type": "speech", "id": "let_go",
                "text": (
                    "Take a moment for letting go of all the internal "
                    "noise, chaos, and movement. Simply be."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
            {
                "type": "speech", "id": "observe",
                "text": (
                    "You may notice various sounds, bodily sensations, "
                    "thoughts, or feelings arise. Without manipulating "
                    "or changing a thing, observe it all."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Breath Awareness",
        "segments": [

            {
                "type": "speech", "id": "awareness",
                "text": (
                    "Guide your awareness to your breathing. Let the "
                    "breath flow in and out through the nostrils. "
                    "Whether your breath is long, short, deep, shallow, "
                    "slow, or fast is not relevant. Let it be natural."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "wander",
                "text": (
                    "The mind may wander. If so, gently return your "
                    "awareness to the sensation of breathing. Let "
                    "thoughts vanish as easily as they came. Settle "
                    "your attention on the breath."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Lower Unity — Inhale & Exhale",
        "segments": [
            {
                "type": "speech", "id": "inhale",
                "text": (
                    "As you inhale, meditate on gathering in the breath "
                    "of life, which is rooted in the Source of All Life. "
                    "The Supernal Breath Above. Each inhale breathes into "
                    "you new life, new vitality, new energy."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
            {
                "type": "speech", "id": "inhale_cosmic",
                "text": (
                    "The inhalation is your experience of receiving "
                    "the Divine Cosmic Exhale."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
            {
                "type": "speech", "id": "exhale",
                "text": (
                    "As you exhale, meditate on returning your individual "
                    "breath to its Divine source, the Supernal Breath. "
                    "The exhalation is your experience of giving yourself "
                    "to the Divine Cosmic Inhale."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Dwelling",
        "segments": [
            {
                "type": "speech", "id": "dwell_cue",
                "text": (
                    "Continue breathing naturally. Receiving on the inhale. "
                    "Returning on the exhale."
                ),
            },
            {"type": "pause", "duration_seconds": "{dwellDuration}"},
            {
                "type": "speech", "id": "embrace",
                "text": (
                    "Embrace the awesome awareness that your entire "
                    "existence is utterly dependent on the Creator's "
                    "life flow of energy into this world."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
            {
                "type": "speech", "id": "sit_softly",
                "text": (
                    "Softly sit with this awareness as the breath "
                    "smoothly flows in and out."
                ),
            },
            {"type": "pause", "duration_seconds": "{dwellDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Closing",
        "segments": [

            {
                "type": "speech", "id": "seal",
                "text": (
                    "Seal your practice with gratitude for the chance "
                    "to take part in this cosmic dance of breath. "
                    "Slowly reopen your eyes."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
]

LOWER_UNITY_VARS = {
    "dwellDuration": {
        "value": 30,
        "displayName": "Dwelling Duration",
        "unit": "seconds",
    },
}


HIGHER_UNITY_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Preparation",
        "segments": [
            {
                "type": "speech", "id": "commit",
                "text": (
                    "Clear space on your calendar, in your home, in "
                    "yourself. Let the space feel inviting, warm, and safe."
                ),
            },
            {"type": "pause", "duration_seconds": 5},
            {
                "type": "speech", "id": "sit",
                "text": (
                    "Sit comfortably and relaxed, but not overly relaxed. "
                    "Close your eyes. Slightly lower your chin towards "
                    "your chest to lengthen the back of the neck."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Centering",
        "segments": [
            {
                "type": "speech", "id": "center",
                "text": (
                    "Take a moment to center yourself in this moment, "
                    "in this space. The here and now. The only moment "
                    "there is. As you strengthen your center, the "
                    "external chaos will dull, and with practice, "
                    "fade away."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
            {
                "type": "speech", "id": "observe",
                "text": (
                    "You may notice various sounds, sensations, thoughts, "
                    "or feelings arise. Observe it all without manipulating "
                    "or changing a thing."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Breath Awareness",
        "segments": [

            {
                "type": "speech", "id": "awareness",
                "text": (
                    "Guide your awareness to your breathing. Let the "
                    "breath flow in and out through the nostrils."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
            {
                "type": "speech", "id": "wander",
                "text": (
                    "If your mind wanders, gently return your awareness "
                    "to the sensation of breathing. Allow thoughts to "
                    "effortlessly drift away like clouds while you hold "
                    "this steady space. Your center."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "settle",
                "text": "Keep focus on your breath as the mind settles.",
            },
            {"type": "pause", "duration_seconds": 8},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Higher Unity — Dissolving",
        "segments": [
            {
                "type": "speech", "id": "fluidity",
                "text": (
                    "As you sit in stillness, allow oxygen to flow in "
                    "and out of you. Open to the fluidity and aliveness "
                    "that is within."
                ),
            },
            {"type": "pause", "duration_seconds": "{unityDuration}"},
            {
                "type": "speech", "id": "intimacy",
                "text": (
                    "Here in this space, connect with the deep intimacy "
                    "you share with the Creator of Life. The rhythm of "
                    "your breath is the Divine flowing within you. "
                    "It is as if you are sharing a dance."
                ),
            },
            {"type": "pause", "duration_seconds": "{unityDuration}"},
            {
                "type": "speech", "id": "dissolve",
                "text": (
                    "Stop feeling, sensing, or thinking. Allow the "
                    "Supernal Breath to flow through you. There is no "
                    "separate I that is breathing. There is only breath. "
                    "There is only One."
                ),
            },
            {"type": "pause", "duration_seconds": "{unityDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Closing",
        "segments": [

            {
                "type": "speech", "id": "seal",
                "text": (
                    "Seal your practice from within this brilliantly "
                    "subtle and ever-present Unity. Slowly reopen "
                    "your eyes."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
]

HIGHER_UNITY_VARS = {
    "unityDuration": {
        "value": 30,
        "displayName": "Unity Dwelling Duration",
        "unit": "seconds",
    },
}


THREE_STAGES_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Preparation",
        "segments": [
            {
                "type": "speech", "id": "sit",
                "text": (
                    "Sit comfortably. Close your eyes. Lower your chin "
                    "slightly towards your chest."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "let_go",
                "text": (
                    "Let go of all internal noise. Observe what arises "
                    "without manipulation. Simply be."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Introducing the Three Stages",
        "segments": [

            {
                "type": "speech", "id": "intro",
                "text": (
                    "Bring awareness to the complete cycle of your breath. "
                    "Not just inhale and exhale, but the retention pauses "
                    "between them. There are three stages."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
            {
                "type": "speech", "id": "sheifah",
                "text": (
                    "Sheifah. The inhalation. To aspire. Drawing life in."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
            {
                "type": "speech", "id": "neshifa",
                "text": (
                    "Neshifa. The exhalation. Releasing. Returning."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
            {
                "type": "speech", "id": "blima",
                "text": (
                    "B'lima. The retention. The pause between breaths. "
                    "Nothingness. Pure potential."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Practicing the Cycle",
        "segments": [
            {
                "type": "speech", "id": "cycle_intro",
                "text": (
                    "Now breathe through the full cycle consciously. "
                    "Inhale. Sheifah. Aspiring, drawing life in."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "hold_in",
                "text": (
                    "B'lima. The pause after the inhale. "
                    "A state of fullness, of having received."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "exhale_cue",
                "text": (
                    "Neshifa. Exhale. Releasing, giving back."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "hold_out",
                "text": (
                    "B'lima. The pause after the exhale. This is the "
                    "most crucial stage. You are empty of the past "
                    "and not yet impregnated with the future. "
                    "The moment of Tzimtzum. A darkening before "
                    "new creation."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Extended Practice",
        "segments": [
            {
                "type": "speech", "id": "continue",
                "text": (
                    "Continue this three-stage cycle on your own. "
                    "Sheifah. B'lima. Neshifa. B'lima. "
                    "Let the B'lima after each exhale expand. "
                    "Dwell in that emptiness."
                ),
            },
            {"type": "pause", "duration_seconds": "{cycleDuration}"},
            {
                "type": "speech", "id": "mid_cue",
                "text": (
                    "Inhale: aspiration. Pause: fullness. "
                    "Exhale: release. Pause: emptiness before the "
                    "new light."
                ),
            },
            {"type": "pause", "duration_seconds": "{cycleDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Closing",
        "segments": [

            {
                "type": "speech", "id": "seal",
                "text": (
                    "Allow the breath to return to its natural rhythm. "
                    "Seal your practice with gratitude. "
                    "Slowly reopen your eyes."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
]

THREE_STAGES_VARS = {
    "cycleDuration": {
        "value": 30,
        "displayName": "Cycle Practice Duration",
        "unit": "seconds",
    },
}


FEAR_AWE_PLEASURE_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Preparation",
        "segments": [
            {
                "type": "speech", "id": "sit",
                "text": (
                    "Sit comfortably. Close your eyes. Lower your chin "
                    "slightly. Let go of internal noise."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
            {
                "type": "speech", "id": "breath",
                "text": (
                    "Bring awareness to your natural breath. "
                    "Let it flow without forcing."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Yirah — Fear (Lower)",
        "segments": [

            {
                "type": "speech", "id": "fear_intro",
                "text": (
                    "Begin in your present emotional state. "
                    "Acknowledge whatever is there. Including fear. "
                    "Anxiety. Contraction. The Tzimtzum within."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
            {
                "type": "speech", "id": "fear_exhale",
                "text": (
                    "As you exhale, meditate on releasing the contracted, "
                    "fearful, self-protective mode. The Yirah that is "
                    "about personal survival and danger. Allow the exhale "
                    "to empty you of this contraction."
                ),
            },
            {"type": "pause", "duration_seconds": "{fearDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Yirah — Awe (Higher)",
        "segments": [

            {
                "type": "speech", "id": "awe_inhale",
                "text": (
                    "As you inhale, breathe in the Yirah of awe. "
                    "The reverential sense of standing before something "
                    "vast, infinite, and holy. This is expansion, "
                    "not contraction."
                ),
            },
            {"type": "pause", "duration_seconds": "{aweDuration}"},
            {
                "type": "speech", "id": "awe_deepen",
                "text": (
                    "Let the awe deepen with each breath. "
                    "Exhale the fear. Inhale the awe."
                ),
            },
            {"type": "pause", "duration_seconds": "{aweDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Ta'anug — Pleasure",
        "segments": [

            {
                "type": "speech", "id": "taanug",
                "text": (
                    "As awe deepens, open to the Ta'anug. The deepest "
                    "pleasure. The delight of being in the presence of "
                    "the Divine. This is the state beyond awe, where "
                    "the practitioner rests in the infinite light."
                ),
            },
            {"type": "pause", "duration_seconds": "{pleasureDuration}"},
            {
                "type": "speech", "id": "rest",
                "text": (
                    "Rest here. In the delight. In the presence."
                ),
            },
            {"type": "pause", "duration_seconds": "{pleasureDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Closing",
        "segments": [

            {
                "type": "speech", "id": "seal",
                "text": (
                    "Seal your practice from within the state you "
                    "have arrived at. Slowly reopen your eyes."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
]

FEAR_AWE_PLEASURE_VARS = {
    "fearDuration": {
        "value": 20,
        "displayName": "Fear Release Duration",
        "unit": "seconds",
    },
    "aweDuration": {
        "value": 20,
        "displayName": "Awe Duration",
        "unit": "seconds",
    },
    "pleasureDuration": {
        "value": 30,
        "displayName": "Pleasure Duration",
        "unit": "seconds",
    },
}


RENEWAL_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Preparation",
        "segments": [
            {
                "type": "speech", "id": "sit",
                "text": (
                    "Settle into your meditation space. "
                    "Sit comfortably. Close your eyes. "
                    "Allow natural breathing."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
            {
                "type": "speech", "id": "let_go",
                "text": (
                    "Let go of internal noise. Observe what arises. "
                    "Bring awareness to the breath."
                ),
            },
            {"type": "pause", "duration_seconds": 6},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Exhale as Completion",
        "segments": [

            {
                "type": "speech", "id": "exhale_complete",
                "text": (
                    "Meditate on the exhale as completion. Each exhale "
                    "is the completion of a moment of life. You are "
                    "giving back the breath."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "B'lima — Emptiness",
        "segments": [
            {
                "type": "speech", "id": "blima",
                "text": (
                    "After the exhale, there is the B'lima. The moment "
                    "of emptiness. The moment before the next creation. "
                    "A deep inhale and holding of breath is a darkening "
                    "of creation — Tzimtzum. An exhale, a letting go of "
                    "the Supernal Breath, is a revealing of Light."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "dwell_empty",
                "text": (
                    "Dwell in this space of emptiness between breaths. "
                    "Pure potential. Before the new Light."
                ),
            },
            {"type": "pause", "duration_seconds": "{renewalDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Inhale as New Creation",
        "segments": [

            {
                "type": "speech", "id": "inhale_new",
                "text": (
                    "Each inhale is not a continuation of the old life "
                    "but a brand-new creation. New life. New light. "
                    "New existence being breathed into you. The Ohr, "
                    "the Light, returns anew with each inhale."
                ),
            },
            {"type": "pause", "duration_seconds": "{renewalDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Constant Renewal",
        "segments": [
            {
                "type": "speech", "id": "renewal_awareness",
                "text": (
                    "Every single breath is a renewal of being. "
                    "Rest in the profound awareness that you are being "
                    "re-created, moment by moment."
                ),
            },
            {"type": "pause", "duration_seconds": "{renewalDuration}"},
            {
                "type": "speech", "id": "renewal_mid",
                "text": (
                    "Exhale: completion. B'lima: emptiness. "
                    "Inhale: new creation. Chidush. "
                    "Constant renewal."
                ),
            },
            {"type": "pause", "duration_seconds": "{renewalDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Closing",
        "segments": [

            {
                "type": "speech", "id": "seal",
                "text": (
                    "Seal your practice with gratitude. "
                    "Slowly reopen your eyes."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
]

RENEWAL_VARS = {
    "renewalDuration": {
        "value": 30,
        "displayName": "Renewal Dwelling Duration",
        "unit": "seconds",
    },
}


DAILY_BREATHING_SCRIPT = [
    {
        "type": "loop", "repeat": 1, "label": "Settling",
        "segments": [
            {
                "type": "speech", "id": "settle",
                "text": (
                    "Sit or stand comfortably. Lower your chin slightly "
                    "toward the chest to engage the parasympathetic "
                    "nervous system."
                ),
            },
            {"type": "pause", "duration_seconds": 5},
            {
                "type": "speech", "id": "natural",
                "text": (
                    "Bring awareness to the natural breath flowing "
                    "in and out through the nostrils."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Four-Phase Introduction",
        "segments": [

            {
                "type": "speech", "id": "inhale_intro",
                "text": (
                    "Inhale with intention. Sheifah. Drawing in new "
                    "life, new vitality. The breath of the Supernal "
                    "Source filling you."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "hold_in",
                "text": (
                    "Hold briefly. B'lima after the inhale. "
                    "The fullness of having received life."
                ),
            },
            {"type": "pause", "duration_seconds": 5},
            {
                "type": "speech", "id": "exhale_intro",
                "text": (
                    "Exhale with intention. Neshifa. Releasing. "
                    "Returning the breath to its Source. Letting go "
                    "of what is not needed."
                ),
            },
            {"type": "pause", "duration_seconds": 8},
            {
                "type": "speech", "id": "hold_out",
                "text": (
                    "Hold briefly. B'lima after the exhale. Empty. "
                    "In the space of pure potential. The moment "
                    "before renewal."
                ),
            },
            {"type": "pause", "duration_seconds": 5},
        ],
    },
    {
        "type": "loop", "variable": "breathRounds", "repeat": 5,
        "label": "Four-Phase Breath Cycle",
        "segments": [
            {
                "type": "speech", "id": "round_cue",
                "text": "Inhale. Sheifah.",
            },
            {"type": "pause", "duration_seconds": "{inhaleDuration}"},
            {
                "type": "speech", "id": "hold_in_cue",
                "text": "Hold. B'lima.",
            },
            {"type": "pause", "duration_seconds": "{holdDuration}"},
            {
                "type": "speech", "id": "exhale_cue",
                "text": "Exhale. Neshifa.",
            },
            {"type": "pause", "duration_seconds": "{exhaleDuration}"},
            {
                "type": "speech", "id": "hold_out_cue",
                "text": "Hold. B'lima. Emptiness before renewal.",
            },
            {"type": "pause", "duration_seconds": "{holdDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Silent Practice",
        "segments": [
            {
                "type": "speech", "id": "silent_intro",
                "text": (
                    "Now continue the cycle in silence. You may layer "
                    "in the kavvanah that speaks to you: the consciousness "
                    "of Lower Unity, Higher Unity, the three stages, "
                    "the movement from fear through awe to pleasure, "
                    "or the awareness of constant renewal. Choose what "
                    "is appropriate to this moment."
                ),
            },
            {"type": "pause", "duration_seconds": "{silentDuration}"},
            {
                "type": "speech", "id": "silent_mid",
                "text": (
                    "Inhale. Hold. Exhale. Hold. "
                    "The structure draws the mind back to the breath."
                ),
            },
            {"type": "pause", "duration_seconds": "{silentDuration}"},
        ],
    },
    {
        "type": "loop", "repeat": 1, "label": "Closing",
        "segments": [

            {
                "type": "speech", "id": "seal",
                "text": (
                    "Close with gratitude. Slowly reopen your eyes."
                ),
            },
            {"type": "pause", "duration_seconds": 10},
        ],
    },
]

DAILY_BREATHING_VARS = {
    "breathRounds": {
        "value": 5,
        "displayName": "Guided Breath Rounds",
    },
    "inhaleDuration": {
        "value": 5,
        "displayName": "Inhale Duration",
        "unit": "seconds",
    },
    "holdDuration": {
        "value": 3,
        "displayName": "Hold Duration",
        "unit": "seconds",
    },
    "exhaleDuration": {
        "value": 6,
        "displayName": "Exhale Duration",
        "unit": "seconds",
    },
    "silentDuration": {
        "value": 30,
        "displayName": "Silent Practice Duration",
        "unit": "seconds",
    },
}


# ─────────────────────────────────────────────────────────────────────
# ALL STAGES — compact registry
# ─────────────────────────────────────────────────────────────────────

QUIETING_STAGES = [
    ("habata-hashkata", HABATA_HASHKATA_SCRIPT, HABATA_HASHKATA_VARS),
    ("daily-hashkata", DAILY_HASHKATA_SCRIPT, DAILY_HASHKATA_VARS),
    ("observing-thoughts", OBSERVING_THOUGHTS_SCRIPT, OBSERVING_THOUGHTS_VARS),
]

BREATHING_STAGES = [
    ("lower-unity", LOWER_UNITY_SCRIPT, LOWER_UNITY_VARS),
    ("higher-unity", HIGHER_UNITY_SCRIPT, HIGHER_UNITY_VARS),
    ("three-stages", THREE_STAGES_SCRIPT, THREE_STAGES_VARS),
    ("fear-awe-pleasure", FEAR_AWE_PLEASURE_SCRIPT, FEAR_AWE_PLEASURE_VARS),
    ("renewal", RENEWAL_SCRIPT, RENEWAL_VARS),
    ("daily-breathing", DAILY_BREATHING_SCRIPT, DAILY_BREATHING_VARS),
]


# ─────────────────────────────────────────────────────────────────────
# PROGRAMME — 4-week progressive structure
# ─────────────────────────────────────────────────────────────────────

def _vars(base, **overrides):
    """Clone a variable dict with overridden values."""
    out = {}
    for k, v in base.items():
        entry = dict(v)
        if k in overrides:
            entry["value"] = overrides[k]
        out[k] = entry
    return out


def _build_programme():
    """Build a 4-week progressive programme with increasing durations."""

    def _day(label, meditation, stage_id, stage_name, variables):
        return {
            "label": label,
            "items": [
                {
                    "id": _item_id(),
                    "meditation": meditation,
                    "meditation_display": (
                        "Quieting the Mind" if meditation == "quieting-the-mind"
                        else "Pinson Breathing"
                    ),
                    "stage_id": stage_id,
                    "stage_name": stage_name,
                    "variables": variables,
                },
            ],
        }

    q = "quieting-the-mind"
    b = "pinson-breathing"

    return [
        {
            "label": "Week 1 — Quieting the Mind",
            "days": [
                # Short focal/question: 30s (defaults)
                _day("Day 1", q, "habata-hashkata",
                     "1. Habata / Hashkata", HABATA_HASHKATA_VARS),
                _day("Day 2", q, "habata-hashkata",
                     "1. Habata / Hashkata", HABATA_HASHKATA_VARS),
                # Bump to 45s
                _day("Day 3", q, "habata-hashkata",
                     "1. Habata / Hashkata",
                     _vars(HABATA_HASHKATA_VARS, focalDuration=45, questionDuration=45)),
                _day("Day 4", q, "daily-hashkata",
                     "2. Hashkata for Daily Living", DAILY_HASHKATA_VARS),
                _day("Day 5", q, "daily-hashkata",
                     "2. Hashkata for Daily Living",
                     _vars(DAILY_HASHKATA_VARS, anchorDuration=30, questionDuration=45)),
                _day("Day 6", q, "observing-thoughts",
                     "3. Observing One's Thoughts", OBSERVING_THOUGHTS_VARS),
                _day("Day 7", q, "observing-thoughts",
                     "3. Observing One's Thoughts",
                     _vars(OBSERVING_THOUGHTS_VARS, observeDuration=45)),
            ],
        },
        {
            "label": "Week 2 — Entering the Breath",
            "days": [
                # Dwell starts at 30s, builds to 60s
                _day("Day 1", b, "lower-unity",
                     "4. Lower Unity", LOWER_UNITY_VARS),
                _day("Day 2", b, "lower-unity",
                     "4. Lower Unity", _vars(LOWER_UNITY_VARS, dwellDuration=45)),
                _day("Day 3", b, "lower-unity",
                     "4. Lower Unity", _vars(LOWER_UNITY_VARS, dwellDuration=60)),
                _day("Day 4", b, "higher-unity",
                     "5. Higher Unity", HIGHER_UNITY_VARS),
                _day("Day 5", b, "higher-unity",
                     "5. Higher Unity", _vars(HIGHER_UNITY_VARS, unityDuration=45)),
                _day("Day 6", b, "higher-unity",
                     "5. Higher Unity", _vars(HIGHER_UNITY_VARS, unityDuration=60)),
                _day("Day 7", b, "higher-unity",
                     "5. Higher Unity", _vars(HIGHER_UNITY_VARS, unityDuration=60)),
            ],
        },
        {
            "label": "Week 3 — Deepening",
            "days": [
                _day("Day 1", b, "three-stages",
                     "6. Three Stages", THREE_STAGES_VARS),
                _day("Day 2", b, "three-stages",
                     "6. Three Stages", _vars(THREE_STAGES_VARS, cycleDuration=45)),
                _day("Day 3", b, "three-stages",
                     "6. Three Stages", _vars(THREE_STAGES_VARS, cycleDuration=60)),
                _day("Day 4", b, "fear-awe-pleasure",
                     "7. Fear, Awe, Pleasure", FEAR_AWE_PLEASURE_VARS),
                _day("Day 5", b, "fear-awe-pleasure",
                     "7. Fear, Awe, Pleasure",
                     _vars(FEAR_AWE_PLEASURE_VARS, fearDuration=30, aweDuration=30, pleasureDuration=45)),
                _day("Day 6", b, "fear-awe-pleasure",
                     "7. Fear, Awe, Pleasure",
                     _vars(FEAR_AWE_PLEASURE_VARS, fearDuration=45, aweDuration=45, pleasureDuration=60)),
                _day("Day 7", b, "fear-awe-pleasure",
                     "7. Fear, Awe, Pleasure",
                     _vars(FEAR_AWE_PLEASURE_VARS, fearDuration=45, aweDuration=45, pleasureDuration=60)),
            ],
        },
        {
            "label": "Week 4 — Integration",
            "days": [
                _day("Day 1", b, "renewal",
                     "8. Renewal", RENEWAL_VARS),
                _day("Day 2", b, "renewal",
                     "8. Renewal", _vars(RENEWAL_VARS, renewalDuration=45)),
                _day("Day 3", b, "renewal",
                     "8. Renewal", _vars(RENEWAL_VARS, renewalDuration=60)),
                _day("Day 4", b, "daily-breathing",
                     "9. Daily Breathing Technique", DAILY_BREATHING_VARS),
                _day("Day 5", b, "daily-breathing",
                     "9. Daily Breathing Technique",
                     _vars(DAILY_BREATHING_VARS, silentDuration=45, breathRounds=7)),
                _day("Day 6", b, "daily-breathing",
                     "9. Daily Breathing Technique",
                     _vars(DAILY_BREATHING_VARS, silentDuration=60, breathRounds=9)),
                _day("Day 7", b, "daily-breathing",
                     "9. Daily Breathing Technique",
                     _vars(DAILY_BREATHING_VARS, silentDuration=90, breathRounds=9)),
            ],
        },
    ]


# ─────────────────────────────────────────────────────────────────────
# COMMAND
# ─────────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed Rav Pinson 'Breathing and Quieting the Mind' meditations"

    def handle(self, *args, **options):
        # Category
        category, _ = Category.objects.update_or_create(
            name="pinson-breathing-quieting",
            defaults={
                "display_name": "Breathing & Quieting the Mind",
                "sort_order": 10,
            },
        )
        self.stdout.write(f"  category: {category}")

        # Meditation: Quieting the Mind (Part One)
        quieting, _ = Meditation.objects.update_or_create(
            name="quieting-the-mind",
            defaults={
                "display_name": "Quieting the Mind",
                "category": "pinson-breathing-quieting",
                "instructions": QUIETING_INSTRUCTIONS,
            },
        )
        self.stdout.write(f"  meditation: {quieting}")

        for stage_id, script, variables in QUIETING_STAGES:
            stage, _ = Stage.objects.update_or_create(
                meditation=quieting,
                stage_id=stage_id,
                defaults={"script": script, "variables": variables},
            )
            self.stdout.write(f"    stage: {stage}")

        # Meditation: Pinson Breathing (Part Two)
        breathing, _ = Meditation.objects.update_or_create(
            name="pinson-breathing",
            defaults={
                "display_name": "Pinson Breathing",
                "category": "pinson-breathing-quieting",
                "instructions": BREATHING_INSTRUCTIONS,
            },
        )
        self.stdout.write(f"  meditation: {breathing}")

        for stage_id, script, variables in BREATHING_STAGES:
            stage, _ = Stage.objects.update_or_create(
                meditation=breathing,
                stage_id=stage_id,
                defaults={"script": script, "variables": variables},
            )
            self.stdout.write(f"    stage: {stage}")

        # Practice programme
        programme_name = "pinson-4-week"
        practice, _ = Practice.objects.update_or_create(
            name=programme_name,
            defaults={
                "display_name": "Breathing & Quieting the Mind — 4-Week Programme",
                "items": _build_programme(),
            },
        )
        self.stdout.write(f"  practice: {practice}")

        self.stdout.write(self.style.SUCCESS(
            "\nDone. Created 2 meditations, 9 stages, 1 programme."
        ))
