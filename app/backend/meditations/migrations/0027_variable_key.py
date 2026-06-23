from django.db import migrations, models


def backfill_variable_key(apps, schema_editor):
    VariableRecording = apps.get_model("meditations", "VariableRecording")
    for row in VariableRecording.objects.all():
        row.variable_values = {row.variable_name: row.variable_value}
        row.variable_key = f"{row.variable_name}={row.variable_value}"
        row.save(update_fields=["variable_values", "variable_key"])


class Migration(migrations.Migration):

    dependencies = [
        ("meditations", "0026_new_audio_schema"),
    ]

    operations = [
        # 1. Clear the old unique constraint
        migrations.AlterUniqueTogether(
            name="variablerecording",
            unique_together=set(),
        ),

        # 2. Add variable_values JSONField
        migrations.AddField(
            model_name="variablerecording",
            name="variable_values",
            field=models.JSONField(default=dict),
        ),

        # 3. Add variable_key CharField
        migrations.AddField(
            model_name="variablerecording",
            name="variable_key",
            field=models.CharField(default="", max_length=500),
        ),

        # 4. Backfill variable_key from existing variable_name / variable_value
        migrations.RunPython(backfill_variable_key, migrations.RunPython.noop),

        # 5. Remove old fields
        migrations.RemoveField(
            model_name="variablerecording",
            name="variable_name",
        ),
        migrations.RemoveField(
            model_name="variablerecording",
            name="variable_order",
        ),
        migrations.RemoveField(
            model_name="variablerecording",
            name="variable_value",
        ),

        # 6. Restore new unique constraint
        migrations.AlterUniqueTogether(
            name="variablerecording",
            unique_together={("meditation", "stage", "seg_id", "variable_key")},
        ),
    ]
