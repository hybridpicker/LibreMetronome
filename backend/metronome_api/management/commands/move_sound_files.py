from django.core.management.base import BaseCommand
from django.conf import settings
import os
import shutil

class Command(BaseCommand):
    help = 'Move sound files from metronome_sounds/metronome_sounds/ to metronome_sounds/'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting file relocation...'))
        
        # Define source and destination directories
        source_dir = os.path.join(settings.MEDIA_ROOT, 'metronome_sounds')
        dest_dir = settings.MEDIA_ROOT
        
        # Check if source directory exists
        if not os.path.exists(source_dir):
            self.stdout.write(self.style.ERROR(f'Source directory {source_dir} does not exist!'))
            return
            
        # Get all files in the source directory
        files_moved = 0
        files = [f for f in os.listdir(source_dir) if os.path.isfile(os.path.join(source_dir, f))]
        
        for filename in files:
            source_path = os.path.join(source_dir, filename)
            dest_path = os.path.join(dest_dir, filename)
            
            # Check if destination file already exists
            if os.path.exists(dest_path):
                self.stdout.write(f'WARNING: File {dest_path} already exists, skipping...')
                continue
                
            # Move the file
            try:
                shutil.copy2(source_path, dest_path)
                self.stdout.write(f'Moved {source_path} to {dest_path}')
                files_moved += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error moving {source_path}: {str(e)}'))
        
        if files_moved > 0:
            self.stdout.write(self.style.SUCCESS(f'Successfully moved {files_moved} files'))
        else:
            self.stdout.write(self.style.WARNING('No files were moved'))
