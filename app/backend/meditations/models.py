import secrets
import uuid

from django.db import models


ROLE_CHOICES = [
    ("admin", "Admin"),
    ("editor", "Editor"),
    ("builder", "Builder"),
    ("viewer", "Viewer"),
]

INVITE_ROLE_CHOICES = [
    ("builder", "Builder"),
    ("viewer", "Viewer"),
]


class UserProfile(models.Model):
    user = models.OneToOneField(
        "auth.User", on_delete=models.CASCADE, related_name="profile"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="viewer")
    display_name = models.CharField(max_length=200, blank=True)
    show_public_to_viewers = models.BooleanField(default=True)
    profile_photo = models.CharField(max_length=500, blank=True, default="")
    signup_token = models.CharField(max_length=64, unique=True, blank=True, null=True)
    invited_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="invited_users",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def get_signup_token(self):
        """Return existing token or generate one on first access."""
        if not self.signup_token:
            self.signup_token = secrets.token_urlsafe(32)
            self.save(update_fields=["signup_token"])
        return self.signup_token

    @property
    def name(self):
        return self.display_name or self.user.username

    def __str__(self):
        return f"{self.name} ({self.role})"


class InviteLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    token = models.CharField(max_length=64, unique=True, db_index=True)
    name = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="created_invites"
    )
    role = models.CharField(max_length=20, choices=INVITE_ROLE_CHOICES)
    used_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="used_invite",
    )
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.role} invite by {self.created_by.username}"


class ViewerAccess(models.Model):
    viewer = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="viewer_access_grants"
    )
    builder = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="builder_viewers"
    )
    show_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("viewer", "builder")

    def __str__(self):
        return f"{self.viewer.username} -> {self.builder.username}"


class Group(models.Model):
    name = models.SlugField(max_length=200, unique=True, primary_key=True)
    display_name = models.CharField(max_length=200)
    sort_order = models.IntegerField(default=0)
    created_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="exercise_groups",
    )
    is_public = models.BooleanField(default=False, db_index=True)
    shared_with = models.ManyToManyField(
        "auth.User", blank=True, related_name="shared_groups",
    )

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
    created_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="exercise_categories",
    )
    is_public = models.BooleanField(default=False, db_index=True)
    shared_with = models.ManyToManyField(
        "auth.User", blank=True, related_name="shared_categories",
    )

    class Meta:
        ordering = ["sort_order", "display_name"]

    def __str__(self):
        return self.display_name


class Meditation(models.Model):
    name = models.SlugField(max_length=200, unique=True, primary_key=True)
    display_name = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=100, default="uncategorised", db_index=True)
    group = models.ForeignKey(
        Group, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="meditations",
    )
    instructions = models.JSONField(default=dict, blank=True)
    script = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="meditations",
    )
    is_public = models.BooleanField(default=False, db_index=True)
    shared_with = models.ManyToManyField(
        "auth.User", blank=True, related_name="shared_meditations",
    )
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


class Voice(models.Model):
    """A registered ElevenLabs TTS voice."""
    id = models.CharField(max_length=100, primary_key=True)
    provider = models.CharField(max_length=50, default="elevenlabs")
    display_name = models.CharField(max_length=100)

    def __str__(self):
        return self.display_name or self.id


class GeneratedVoiceClip(models.Model):
    """Content-addressed TTS audio. PK = md5(text + "|" + direction + "|" + voice_id)[:16].
    Never deleted — multiple segments can share the same clip.
    """
    text_hash = models.CharField(max_length=16, primary_key=True)
    voice = models.ForeignKey(Voice, on_delete=models.PROTECT, related_name="clips")
    audio_file = models.FileField(upload_to="clips/", max_length=300)
    timestamps = models.JSONField(default=list, blank=True)
    duration = models.FloatField(default=0)

    def __str__(self):
        return self.text_hash


class UserUploadedClip(models.Model):
    """User-uploaded or user-recorded audio file."""
    audio_file = models.FileField(upload_to="uploads/", max_length=300)
    duration = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"upload_{self.pk}"


class SpeechSegmentAudio(models.Model):
    """Per-segment pointer to the active clip for a fixed speech segment.

    Variable segments (text containing {varName} refs from stage.variables)
    are handled entirely by VariableRecording — no SpeechSegmentAudio row
    is created for them.
    """
    meditation = models.ForeignKey(
        Meditation, on_delete=models.CASCADE, related_name="speech_segments"
    )
    stage = models.ForeignKey(
        Stage, on_delete=models.CASCADE, null=True, blank=True,
        related_name="speech_segments",
    )
    seg_id = models.CharField(max_length=200)
    audio_clip = models.ForeignKey(
        GeneratedVoiceClip, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="speech_segments",
    )
    user_clip = models.ForeignKey(
        UserUploadedClip, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="speech_segments",
    )
    trim_start = models.FloatField(null=True, blank=True)
    trim_end = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ("meditation", "stage", "seg_id")

    def __str__(self):
        return f"{self.meditation_id}/{self.seg_id}"


class VariableRecording(models.Model):
    """One row per (segment, variable combination).

    Each slot is filled by either a generated clip (voices tab) or a
    user-uploaded clip (uploaded tab) — never both simultaneously.
    Assembly looks up by (seg_id, variable_key) where variable_key is a
    canonical sorted string e.g. "phaseDuration=4,rounds=5".
    """
    SOURCE_CHOICES = [
        ("generated", "Generated"),
        ("uploaded", "Uploaded"),
    ]

    meditation = models.ForeignKey(
        Meditation, on_delete=models.CASCADE, related_name="variable_recordings"
    )
    stage = models.ForeignKey(
        Stage, on_delete=models.CASCADE, related_name="variable_recordings",
        null=True, blank=True,
    )
    seg_id = models.CharField(max_length=200)
    variable_values = models.JSONField(default=dict)
    variable_key = models.CharField(max_length=500)
    voice = models.ForeignKey(
        Voice, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="variable_recordings",
    )
    audio_clip = models.ForeignKey(
        GeneratedVoiceClip, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="variable_recordings",
    )
    user_clip = models.ForeignKey(
        UserUploadedClip, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="variable_recordings",
    )
    trim_start = models.FloatField(null=True, blank=True)
    trim_end = models.FloatField(null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, blank=True)

    class Meta:
        unique_together = ("meditation", "stage", "seg_id", "variable_key")

    def __str__(self):
        return f"{self.meditation_id}/{self.seg_id} [{self.variable_values}]"


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
    created_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="practices",
    )
    is_public = models.BooleanField(default=False, db_index=True)
    shared_with = models.ManyToManyField(
        "auth.User", blank=True, related_name="shared_practices",
    )
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
    content_hash = models.CharField(max_length=10)
    audio_file = models.FileField(upload_to="outputs/", max_length=300)
    duration = models.FloatField()

    class Meta:
        unique_together = ("meditation", "stage", "content_hash")

    def __str__(self):
        return f"{self.meditation_id}/output_{self.content_hash}"


class Thread(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="chat_threads"
    )
    title = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived = models.BooleanField(default=False)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title or f"Thread {self.id}"


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    thread = models.ForeignKey(
        Thread, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=20)  # user, assistant
    content = models.JSONField()  # Anthropic content block format
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.thread_id}/{self.role}"


class Feedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="feedback"
    )
    message = models.TextField()
    page = models.CharField(max_length=200, blank=True)
    session_id = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username}: {self.message[:50]}"


class PracticeSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="practice_sessions"
    )
    practice = models.ForeignKey(
        Practice, on_delete=models.CASCADE, related_name="sessions"
    )
    practice_display = models.CharField(max_length=200, blank=True)
    week = models.IntegerField()
    day = models.IntegerField()
    day_label = models.CharField(max_length=200, blank=True)
    duration = models.FloatField(default=0)  # seconds
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-completed_at"]
        indexes = [
            models.Index(fields=["user", "-completed_at"]),
        ]

    def __str__(self):
        return f"{self.user.username}: {self.practice_display} W{self.week+1}D{self.day+1}"
