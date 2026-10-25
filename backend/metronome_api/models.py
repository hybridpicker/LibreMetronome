import os

from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models

AUDIO_EXTENSIONS = ("wav", "mp3", "ogg")

# Bundled fallbacks used when a sound set is saved without its own files.
DEFAULT_FIRST_BEAT_SOUND = "src/assets/audio/default_first_beat.wav"
DEFAULT_ACCENT_SOUND = "src/assets/audio/default_accent.wav"
DEFAULT_NORMAL_BEAT_SOUND = "src/assets/audio/default_normal_beat.wav"


def validate_audio_file(value):
    """Validate that the file is an audio file."""
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in {f".{extension}" for extension in AUDIO_EXTENSIONS}:
        raise ValidationError("Unsupported file type. Please use WAV, MP3, or OGG files.")


def audio_field(help_text):
    return models.FileField(
        upload_to="",
        validators=[FileExtensionValidator(allowed_extensions=list(AUDIO_EXTENSIONS)), validate_audio_file],
        help_text=help_text,
    )


class MetronomeSoundSet(models.Model):
    """A collection of related metronome sounds."""

    def __init__(self, *args, **kwargs):
        if "is_default" in kwargs:
            kwargs["is_active"] = kwargs.pop("is_default")
        super().__init__(*args, **kwargs)

    @property
    def is_default(self):
        return self.is_active

    @is_default.setter
    def is_default(self, value):
        self.is_active = value

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    # Making is_active optional and not crucial - frontend will use cookies
    is_active = models.BooleanField(
        default=False,
        blank=True,
        null=True,
        help_text=(
            "This field is kept for backwards compatibility but is not used anymore. "
            "Sound set preference is stored in cookies."
        ),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    first_beat_sound = audio_field("Sound for the first beat of the measure")
    accent_sound = audio_field("Sound for accented beats")
    normal_beat_sound = audio_field("Sound for normal beats")

    class Meta:
        ordering = ["-is_active", "name"]
        verbose_name = "Metronome Sound Set"
        verbose_name_plural = "Metronome Sound Sets"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # No longer enforcing single active sound set - cookie-based selection instead

        # Use template audio if sound file not provided
        if not self.first_beat_sound:
            self.first_beat_sound = DEFAULT_FIRST_BEAT_SOUND
        if not self.accent_sound:
            self.accent_sound = DEFAULT_ACCENT_SOUND
        if not self.normal_beat_sound:
            self.normal_beat_sound = DEFAULT_NORMAL_BEAT_SOUND

        super().save(*args, **kwargs)

    @classmethod
    def get_active_sound_set(cls):
        """
        This method no longer relies on the is_active flag since sound selection
        is now cookie-based in the frontend. It returns the first sound set or creates
        a default one if none exists.
        """
        # Just return the first sound set or create a default one
        sound_set = cls.objects.first()
        if not sound_set:
            sound_set = cls.objects.create(
                name="Default Sound Set",
                first_beat_sound=DEFAULT_FIRST_BEAT_SOUND,
                accent_sound=DEFAULT_ACCENT_SOUND,
                normal_beat_sound=DEFAULT_NORMAL_BEAT_SOUND,
                # No longer setting is_active=True
            )
        return sound_set
