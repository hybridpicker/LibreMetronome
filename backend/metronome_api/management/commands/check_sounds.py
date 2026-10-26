import os
import shutil

from django.conf import settings
from django.core.management.base import BaseCommand

from metronome_api.models import MetronomeSoundSet


class Command(BaseCommand):
    help = "Check and validate sound set configurations"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Checking sound configurations..."))

        # Check if any sound sets exist
        sound_sets = MetronomeSoundSet.objects.all()
        if not sound_sets.exists():
            self.stdout.write(self.style.ERROR("No sound sets found in database!"))
            return

        self.stdout.write(f"Found {sound_sets.count()} sound set(s) in database.")

        active_set = sound_sets.filter(is_active=True).first()
        if active_set is None:
            self.stdout.write(self.style.WARNING("No active sound set found!"))
        else:
            self.report_active_set(active_set)

        # Media settings check
        self.stdout.write("\nMedia configuration:")
        self.stdout.write(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
        self.stdout.write(f"MEDIA_URL: {settings.MEDIA_URL}")

    def report_active_set(self, active_set):
        """Restore missing sound files of the active set and print its sound URLs."""
        checks = (
            (active_set.normal_beat_sound, "default_normal_beat.wav", "Normal beat sound"),
            (active_set.accent_sound, "default_accent.wav", "Accent sound"),
            (active_set.first_beat_sound, "default_first_beat.wav", "First beat sound"),
        )
        # Evaluate every check first so that no file is skipped after the first change.
        results = [self.check_and_copy(*check) for check in checks]
        if any(results):
            active_set.save()
        self.stdout.write(self.style.SUCCESS(f"Active sound set: {active_set.name} (ID: {active_set.id})"))

        self.stdout.write("\nSound URLs:")
        self.stdout.write(f"Normal: {active_set.normal_beat_sound.url}")
        self.stdout.write(f"Accent: {active_set.accent_sound.url}")
        self.stdout.write(f"First: {active_set.first_beat_sound.url}")

    def check_and_copy(self, sound_field, default_filename, description):
        """Check if the sound file exists in MEDIA_ROOT; if not, copy from frontend assets and update the file field."""
        full_path = os.path.join(settings.MEDIA_ROOT, sound_field.name)
        if not os.path.exists(full_path):
            self.stdout.write(self.style.ERROR(f"✗ {description} file not found at {full_path}"))
            src_path = os.path.join(settings.BASE_DIR, "frontend", "src", "assets", "audio", default_filename)
            if os.path.exists(src_path):
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                shutil.copy2(src_path, full_path)
                # Update the file field's name to the relative path from MEDIA_ROOT
                rel_path = os.path.relpath(full_path, settings.MEDIA_ROOT).replace(os.sep, "/")
                sound_field.name = rel_path
                self.stdout.write(self.style.SUCCESS(f"Copied default sound from {src_path} to {full_path}"))
                return True
            else:
                self.stdout.write(self.style.ERROR(f"Default sound file not found at {src_path}"))
                return False
        else:
            file_size = os.path.getsize(full_path)
            self.stdout.write(self.style.SUCCESS(f"✓ {description} exists ({file_size} bytes)"))
            return False
