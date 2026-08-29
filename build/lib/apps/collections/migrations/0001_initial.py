from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL), ("documents", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="Collection",
            fields=[
                ("id", models.UUIDField(editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120)),
                ("documents", models.ManyToManyField(blank=True, related_name="collections", to="documents.document")),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="collections", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("name",)},
        ),
        migrations.AddConstraint(model_name="collection", constraint=models.UniqueConstraint(fields=("owner", "name"), name="unique_collection_name_per_owner")),
    ]

