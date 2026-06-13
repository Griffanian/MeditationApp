import uuid

from django.db import migrations, models


def seed_categories(apps, schema_editor):
    """Create Category rows from existing unique meditation.category values."""
    Meditation = apps.get_model("meditations", "Meditation")
    Category = apps.get_model("meditations", "Category")

    DEFAULTS = {
        "pranayama": ("Pranayama", 0),
        "pratyahara": ("Pratyahara", 1),
        "uncategorised": ("Other", 99),
    }

    seen = set()
    for cat_value in Meditation.objects.values_list("category", flat=True).distinct():
        if cat_value in seen:
            continue
        seen.add(cat_value)
        display, order = DEFAULTS.get(cat_value, (cat_value.capitalize(), 50))
        Category.objects.get_or_create(
            name=cat_value,
            defaults={"display_name": display, "sort_order": order},
        )

    # Ensure the three defaults exist even if no meditations reference them yet
    for key, (display, order) in DEFAULTS.items():
        Category.objects.get_or_create(
            name=key,
            defaults={"display_name": display, "sort_order": order},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("meditations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                (
                    "name",
                    models.CharField(
                        max_length=200, primary_key=True, serialize=False, unique=True
                    ),
                ),
                ("display_name", models.CharField(max_length=200)),
                ("sort_order", models.IntegerField(default=0)),
            ],
            options={
                "ordering": ["sort_order", "display_name"],
            },
        ),
        migrations.RunPython(seed_categories, migrations.RunPython.noop),
    ]
