from django.db import models


class Group(models.Model):
    name = models.SlugField(max_length=200, unique=True, primary_key=True)
    display_name = models.CharField(max_length=200)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "display_name"]

    def __str__(self):
        return self.display_name


class Category(models.Model):
    name = models.CharField(max_length=200, unique=True, primary_key=True)
    display_name = models.CharField(max_length=200)
    sort_order = models.IntegerField(default=0)
    group = models.ForeignKey(
        Group, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="categories",
    )

    class Meta:
        ordering = ["sort_order", "display_name"]

    def __str__(self):
        return self.display_name


class Meditation(models.Model):
    name = models.SlugField(max_length=200, unique=True, primary_key=True)
    display_name = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=100, default="uncategorised")
    instructions = models.JSONField(default=dict, blank=True)
    script = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.display_name or self.name


class Stage(models.Model):
    meditation = models.ForeignKey(
        Meditation, on_delete=models.CASCADE, related_name="stages"
    )
    stage_id = models.CharField(max_length=200)
    script = models.JSONField(default=list, blank=True)
    variables = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("meditation", "stage_id")

    def __str__(self):
        return f"{self.meditation_id}/{self.stage_id}"


class Component(models.Model):
    meditation = models.ForeignKey(
        Meditation, on_delete=models.CASCADE, related_name="components"
    )
    stage = models.ForeignKey(
        Stage, on_delete=models.CASCADE, related_name="components",
        null=True, blank=True,
    )
    seg_id = models.CharField(max_length=200)
    text_hash = models.CharField(max_length=8, blank=True)
    timestamps = models.JSONField(default=list, blank=True)
    trim_meta = models.JSONField(default=dict, blank=True)
    audio_file = models.FileField(upload_to="components/", max_length=300, blank=True)

    class Meta:
        unique_together = ("meditation", "stage", "seg_id")

    def __str__(self):
        return f"{self.meditation_id}/{self.seg_id}"


class Asset(models.Model):
    filename = models.CharField(max_length=200, unique=True, primary_key=True)
    audio_file = models.FileField(upload_to="assets/", max_length=300)
    trim_meta = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.filename


class Practice(models.Model):
    name = models.SlugField(max_length=200, unique=True, primary_key=True)
    display_name = models.CharField(max_length=200, blank=True)
    items = models.JSONField(default=list, blank=True)
    # items: [{"id": "...", "meditation": "slug", "stage_id": "...", "variables": {...}}, ...]
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.display_name or self.name


class AssembledOutput(models.Model):
    meditation = models.ForeignKey(
        Meditation, on_delete=models.CASCADE, related_name="outputs"
    )
    stage = models.ForeignKey(
        Stage, on_delete=models.CASCADE, null=True, blank=True,
    )
    script_hash = models.CharField(max_length=10)
    audio_file = models.FileField(upload_to="outputs/", max_length=300)
    duration = models.FloatField()

    class Meta:
        unique_together = ("meditation", "stage", "script_hash")

    def __str__(self):
        return f"{self.meditation_id}/output_{self.script_hash}"
