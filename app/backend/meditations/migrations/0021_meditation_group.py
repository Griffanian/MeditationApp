import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("meditations", "0020_add_created_by_to_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="meditation",
            name="group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="meditations",
                to="meditations.group",
            ),
        ),
    ]
