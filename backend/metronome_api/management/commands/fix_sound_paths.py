from django.core.management.base import BaseCommand
from metronome_api.models import MetronomeSoundSet
import os

class Command(BaseCommand):
    help = 'Fix sound file paths in the database to remove path duplication'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting path correction...'))
        
        # Get all sound sets
        sound_sets = MetronomeSoundSet.objects.all()
        if not sound_sets.exists():
            self.stdout.write(self.style.ERROR('No sound sets found in database!'))
            return
        
        for sound_set in sound_sets:
            self.stdout.write(f"\nProcessing sound set: {sound_set.name} (ID: {sound_set.id})")
            self.stdout.write(f"Current paths in database:")
            self.stdout.write(f"Normal beat: {sound_set.normal_beat_sound.name}")
            self.stdout.write(f"Accent beat: {sound_set.accent_sound.name}")
            self.stdout.write(f"First beat: {sound_set.first_beat_sound.name}")
            
            # Extract just the filenames without paths
            normal_filename = os.path.basename(sound_set.normal_beat_sound.name)
            accent_filename = os.path.basename(sound_set.accent_sound.name)
            first_filename = os.path.basename(sound_set.first_beat_sound.name)
            
            # Update to use just the filename (Django's upload_to='' will handle the rest)
            changed = False
            
            if sound_set.normal_beat_sound.name != normal_filename:
                self.stdout.write(f"Fixing normal beat: {sound_set.normal_beat_sound.name} -> {normal_filename}")
                sound_set.normal_beat_sound.name = normal_filename
                changed = True
                
            if sound_set.accent_sound.name != accent_filename:
                self.stdout.write(f"Fixing accent beat: {sound_set.accent_sound.name} -> {accent_filename}")
                sound_set.accent_sound.name = accent_filename
                changed = True
                
            if sound_set.first_beat_sound.name != first_filename:
                self.stdout.write(f"Fixing first beat: {sound_set.first_beat_sound.name} -> {first_filename}")
                sound_set.first_beat_sound.name = first_filename
                changed = True
            
            if changed:
                sound_set.save()
                self.stdout.write(self.style.SUCCESS(f"Updated sound set {sound_set.name}"))
            else:
                self.stdout.write(f"No changes needed for sound set {sound_set.name}")
        
        # Verify the paths are fixed
        sound_sets = MetronomeSoundSet.objects.all()
        if sound_sets.exists():
            active_set = sound_sets.filter(is_active=True).first()
            if active_set:
                self.stdout.write("\nVerification after fix:")
                self.stdout.write(f"Normal URL: {active_set.normal_beat_sound.url}")
                self.stdout.write(f"Accent URL: {active_set.accent_sound.url}")
                self.stdout.write(f"First URL: {active_set.first_beat_sound.url}")
