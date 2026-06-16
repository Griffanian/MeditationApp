from django.db import migrations, models


def set_default_groups(apps, schema_editor):
    Category = apps.get_model("meditations", "Category")
    yogic = ["pranayama", "pratyahara"]
    Category.objects.filter(name__in=yogic).update(group="Yogic")


class Migration(migrations.Migration):
    dependencies = [
        ("meditations", "0004_increase_file_field_max_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="category",
            name="group",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.RunPython(set_default_groups, migrations.RunPython.noop),
    ]
