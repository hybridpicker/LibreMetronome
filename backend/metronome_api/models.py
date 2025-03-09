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
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    first_beat_sound = models.FileField(
        upload_to='metronome_sounds/',
        validators=[FileExtensionValidator(allowed_extensions=['wav', 'mp3', 'ogg']), validate_audio_file],
        help_text='Sound for the first beat of the measure'
    )
    accent_sound = models.FileField(
        upload_to='metronome_sounds/',
        validators=[FileExtensionValidator(allowed_extensions=['wav', 'mp3', 'ogg']), validate_audio_file],
        help_text='Sound for accented beats'
    )
    normal_beat_sound = models.FileField(
        upload_to='metronome_sounds/',
        validators=[FileExtensionValidator(allowed_extensions=['wav', 'mp3', 'ogg']), validate_audio_file],
        help_text='Sound for normal beats'
    )

    class Meta:
        ordering = ['-is_default', 'name']
        verbose_name = "Metronome Sound Set"
        verbose_name_plural = "Metronome Sound Sets"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Validate files before saving
        self.full_clean()
        
        if self.is_default:
            # Ensure only one default sound set exists
            MetronomeSoundSet.objects.filter(is_default=True).update(is_default=False)
        super().save(*args, **kwargs)
