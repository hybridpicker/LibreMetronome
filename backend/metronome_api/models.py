from django.db import models
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
import os

def validate_audio_file(value):
    """Validate that the file is an audio file."""
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = ['.wav', '.mp3', '.ogg']
    if not ext in valid_extensions:
        raise ValidationError('Unsupported file type. Please use WAV, MP3, or OGG files.')

class MetronomeSoundSet(models.Model):
    """A collection of related metronome sounds."""
    def __init__(self, *args, **kwargs):
        if 'is_default' in kwargs:
            kwargs['is_active'] = kwargs.pop('is_default')
        super(MetronomeSoundSet, self).__init__(*args, **kwargs)

    @property
    def is_default(self):
        return self.is_active

    @is_default.setter
    def is_default(self, value):
        self.is_active = value

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=False, help_text="Only one sound set can be active at a time.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    first_beat_sound = models.FileField(
        upload_to='',
        validators=[FileExtensionValidator(allowed_extensions=['wav', 'mp3', 'ogg']), validate_audio_file],
        help_text='Sound for the first beat of the measure'
    )
    accent_sound = models.FileField(
        upload_to='',
        validators=[FileExtensionValidator(allowed_extensions=['wav', 'mp3', 'ogg']), validate_audio_file],
        help_text='Sound for accented beats'
    )
    normal_beat_sound = models.FileField(
        upload_to='',
        validators=[FileExtensionValidator(allowed_extensions=['wav', 'mp3', 'ogg']), validate_audio_file],
        help_text='Sound for normal beats'
    )

    class Meta:
        ordering = ['-is_active', 'name']
        verbose_name = "Metronome Sound Set"
        verbose_name_plural = "Metronome Sound Sets"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Ensure only one sound set is active
        if self.is_active:
            MetronomeSoundSet.objects.exclude(pk=self.pk).update(is_active=False)

        # Use template audio if sound file not provided
        if not self.first_beat_sound:
            self.first_beat_sound = "src/assets/audio/default_first_beat.wav"
        if not self.accent_sound:
            self.accent_sound = "src/assets/audio/default_accent.wav"
        if not self.normal_beat_sound:
            self.normal_beat_sound = "src/assets/audio/default_normal_beat.wav"

        super().save(*args, **kwargs)

    @classmethod
    def get_active_sound_set(cls):
        active_set = cls.objects.filter(is_active=True).first()
        if not active_set:
            active_set = cls.objects.create(
                name="Default Sound Set",
                first_beat_sound="src/assets/audio/default_first_beat.wav",
                accent_sound="src/assets/audio/default_accent.wav",
                normal_beat_sound="src/assets/audio/default_normal_beat.wav",
                is_active=True,
            )
        return active_set
