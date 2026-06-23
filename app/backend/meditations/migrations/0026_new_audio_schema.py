import django.db.models.deletion
import json
from django.db import migrations, models


DEFAULT_VOICE_ID = "UmQN7jS1Ee8B1czsUtQh"


def migrate_audio_data(apps, schema_editor):
    """Migrate AudioClip + Component rows into the new schema.

    Strategy:
    - AudioClip(source=generated) → GeneratedVoiceClip (same text_hash)
    - AudioClip(source=uploaded)  → UserUploadedClip
    - Component                   → SpeechSegmentAudio (trim_meta → flat fields)
    - VariableRecording.audio_clip re-pointed to GeneratedVoiceClip or UserUploadedClip
    """
    AudioClip = apps.get_model("meditations", "AudioClip")
    Component = apps.get_model("meditations", "Component")
    VariableRecording = apps.get_model("meditations", "VariableRecording")
    Voice = apps.get_model("meditations", "Voice")
    GeneratedVoiceClip = apps.get_model("meditations", "GeneratedVoiceClip")
    UserUploadedClip = apps.get_model("meditations", "UserUploadedClip")
    SpeechSegmentAudio = apps.get_model("meditations", "SpeechSegmentAudio")

    # 1. Create the default Voice record.
    voice, _ = Voice.objects.get_or_create(
        id=DEFAULT_VOICE_ID,
        defaults={"provider": "elevenlabs", "display_name": "Default"},
    )

    # 2. Migrate every AudioClip into the appropriate new table.
    #    Build lookup maps so Components and VariableRecordings can be re-linked.
    gvc_by_hash = {}  # old text_hash → GeneratedVoiceClip
    uuc_by_file = {}  # audio_file path (str) → UserUploadedClip

    for ac in AudioClip.objects.all():
        if ac.source == "uploaded":
            uuc = UserUploadedClip.objects.create(
                audio_file=ac.audio_file,
                duration=0,
            )
            uuc_by_file[str(ac.audio_file)] = uuc
        else:
            # "generated" or blank — treat as generated
            gvc, _ = GeneratedVoiceClip.objects.get_or_create(
                text_hash=ac.text_hash,
                defaults={
                    "voice": voice,
                    "audio_file": ac.audio_file,
                    "timestamps": ac.timestamps or [],
                    "duration": 0,
                },
            )
            gvc_by_hash[ac.text_hash] = gvc

    # 3. Migrate Component rows → SpeechSegmentAudio.
    for comp in Component.objects.select_related("audio_clip").all():
        trim_start = None
        trim_end = None
        if comp.trim_meta:
            try:
                tm = (
                    comp.trim_meta
                    if isinstance(comp.trim_meta, dict)
                    else json.loads(comp.trim_meta)
                )
                trim_start = tm.get("start")
                trim_end = tm.get("end")
            except (ValueError, TypeError, AttributeError):
                pass

        audio_clip_obj = None
        user_clip_obj = None
        if comp.audio_clip_id:
            ac = comp.audio_clip
            if ac.source == "uploaded":
                user_clip_obj = uuc_by_file.get(str(ac.audio_file))
            else:
                audio_clip_obj = gvc_by_hash.get(ac.text_hash)

        SpeechSegmentAudio.objects.get_or_create(
            meditation_id=comp.meditation_id,
            stage_id=comp.stage_id,
            seg_id=comp.seg_id,
            defaults={
                "audio_clip": audio_clip_obj,
                "user_clip": user_clip_obj,
                "trim_start": trim_start,
                "trim_end": trim_end,
            },
        )

    # 4. Re-link VariableRecording rows to the new clip tables.
    for vr in VariableRecording.objects.select_related("audio_clip").all():
        if vr.audio_clip_id is None:
            continue
        ac = vr.audio_clip
        if ac.source == "uploaded":
            uuc = uuc_by_file.get(str(ac.audio_file))
            if uuc:
                vr.user_clip = uuc
                vr.save(update_fields=["user_clip"])
        else:
            gvc = gvc_by_hash.get(ac.text_hash)
            if gvc:
                vr.new_audio_clip = gvc
                vr.voice = voice
                vr.save(update_fields=["new_audio_clip", "voice"])


class Migration(migrations.Migration):

    dependencies = [
        ("meditations", "0025_audio_clip_refactor"),
    ]

    operations = [
        # ── Step 1: Create new models ──────────────────────────────────────────
        migrations.CreateModel(
            name="Voice",
            fields=[
                ("id", models.CharField(max_length=100, primary_key=True, serialize=False)),
                ("provider", models.CharField(default="elevenlabs", max_length=50)),
                ("display_name", models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name="GeneratedVoiceClip",
            fields=[
                ("text_hash", models.CharField(max_length=16, primary_key=True, serialize=False)),
                ("voice", models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="clips",
                    to="meditations.voice",
                )),
                ("audio_file", models.FileField(max_length=300, upload_to="clips/")),
                ("timestamps", models.JSONField(blank=True, default=list)),
                ("duration", models.FloatField(default=0)),
            ],
        ),
        migrations.CreateModel(
            name="UserUploadedClip",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("audio_file", models.FileField(max_length=300, upload_to="uploads/")),
                ("duration", models.FloatField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="SpeechSegmentAudio",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("meditation", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="speech_segments",
                    to="meditations.meditation",
                )),
                ("stage", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="speech_segments",
                    to="meditations.stage",
                )),
                ("seg_id", models.CharField(max_length=200)),
                ("audio_clip", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="speech_segments",
                    to="meditations.generatedvoiceclip",
                )),
                ("user_clip", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="speech_segments",
                    to="meditations.useruploadedclip",
                )),
                ("trim_start", models.FloatField(blank=True, null=True)),
                ("trim_end", models.FloatField(blank=True, null=True)),
            ],
            options={
                "unique_together": {("meditation", "stage", "seg_id")},
            },
        ),

        # ── Step 2: Add new fields to VariableRecording ───────────────────────
        # Clear the existing unique constraint first so we can freely alter fields.
        migrations.AlterUniqueTogether(
            name="variablerecording",
            unique_together=set(),
        ),
        migrations.AddField(
            model_name="variablerecording",
            name="variable_order",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="variablerecording",
            name="voice",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="variable_recordings",
                to="meditations.voice",
            ),
        ),
        # Temp name avoids collision with existing audio_clip → AudioClip FK.
        migrations.AddField(
            model_name="variablerecording",
            name="new_audio_clip",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="variable_recordings",
                to="meditations.generatedvoiceclip",
            ),
        ),
        migrations.AddField(
            model_name="variablerecording",
            name="user_clip",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="variable_recordings",
                to="meditations.useruploadedclip",
            ),
        ),
        migrations.AddField(
            model_name="variablerecording",
            name="trim_start",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="variablerecording",
            name="trim_end",
            field=models.FloatField(blank=True, null=True),
        ),

        # ── Step 3: Data migration ────────────────────────────────────────────
        migrations.RunPython(migrate_audio_data, migrations.RunPython.noop),

        # ── Step 4: Swap the old AudioClip FK for the new GeneratedVoiceClip FK
        migrations.RemoveField(model_name="variablerecording", name="audio_clip"),
        migrations.RenameField(
            model_name="variablerecording",
            old_name="new_audio_clip",
            new_name="audio_clip",
        ),

        # ── Step 5: Drop legacy models ────────────────────────────────────────
        migrations.DeleteModel(name="Component"),
        migrations.DeleteModel(name="AudioClip"),

        # ── Step 6: Restore VR unique constraint with new fields ──────────────
        migrations.AlterUniqueTogether(
            name="variablerecording",
            unique_together={("meditation", "stage", "seg_id", "variable_order", "variable_value")},
        ),

        # ── Step 7: AssembledOutput — script_hash → content_hash ─────────────
        migrations.RenameField(
            model_name="assembledoutput",
            old_name="script_hash",
            new_name="content_hash",
        ),
        migrations.AlterUniqueTogether(
            name="assembledoutput",
            unique_together={("meditation", "stage", "content_hash")},
        ),
    ]
