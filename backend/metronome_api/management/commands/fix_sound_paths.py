import os

from django.core.management.base import BaseCommand

from metronome_api.models import MetronomeSoundSet

# (model field, label in the current-paths listing, label in the "Fixing ..." message)
SOUND_FIELDS = (
    ("normal_beat_sound", "Normal beat", "normal beat"),
    ("accent_sound", "Accent beat", "accent beat"),
    ("first_beat_sound", "First beat", "first beat"),
)


class Command(BaseCommand):
    help = "Fix sound file paths in the database to remove path duplication"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting path correction..."))

        sound_sets = MetronomeSoundSet.objects.all()
        if not sound_sets.exists():
            self.stdout.write(self.style.ERROR("No sound sets found in database!"))
            return

        for sound_set in sound_sets:
            self.fix_sound_set(sound_set)

        self.verify_active_set()

    def fix_sound_set(self, sound_set):
        self.stdout.write(f"\nProcessing sound set: {sound_set.name} (ID: {sound_set.id})")
        self.stdout.write("Current paths in database:")
        for field_name, listing_label, _ in SOUND_FIELDS:
            self.stdout.write(f"{listing_label}: {getattr(sound_set, field_name).name}")

        # Update to use just the filename (Django's upload_to='' will handle the rest)
        changed = False
        for field_name, _, fix_label in SOUND_FIELDS:
            stored = getattr(sound_set, field_name)
            filename = os.path.basename(stored.name)
            if stored.name != filename:
                self.stdout.write(f"Fixing {fix_label}: {stored.name} -> {filename}")
                stored.name = filename
                changed = True

        if changed:
            sound_set.save()
            self.stdout.write(self.style.SUCCESS(f"Updated sound set {sound_set.name}"))
        else:
            self.stdout.write(f"No changes needed for sound set {sound_set.name}")

    def verify_active_set(self):
        active_set = MetronomeSoundSet.objects.filter(is_active=True).first()
        if active_set is None:
            return
        self.stdout.write("\nVerification after fix:")
        self.stdout.write(f"Normal URL: {active_set.normal_beat_sound.url}")
        self.stdout.write(f"Accent URL: {active_set.accent_sound.url}")
        self.stdout.write(f"First URL: {active_set.first_beat_sound.url}")
