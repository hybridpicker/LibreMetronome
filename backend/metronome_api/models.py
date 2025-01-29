from django.db import models

class MetronomeSettings(models.Model):
    """Stores metronome settings for a user or globally."""
    tempo = models.IntegerField(default=120)
    volume = models.FloatField(default=1.0)
    swing = models.FloatField(default=0.0)
    subdivisions = models.IntegerField(default=4)

    def __str__(self):
        return f"Settings(tempo={self.tempo}, vol={self.volume}, swing={self.swing}, subs={self.subdivisions})"
