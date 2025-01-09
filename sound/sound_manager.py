# sound/sound_manager.py

import pygame
from constants import SOUND_FILES

class SoundManager:
    def __init__(self):
        self.sounds = {}
        self.load_sounds()

    def load_sounds(self):
        """Loads all necessary sounds."""
        try:
            self.sounds['normal'] = pygame.mixer.Sound(SOUND_FILES['normal'])
            self.sounds['accent'] = pygame.mixer.Sound(SOUND_FILES['accent'])
            self.sounds['first'] = pygame.mixer.Sound(SOUND_FILES['first'])
        except pygame.error as e:
            print(f"Error loading sounds: {e}")
            self.sounds['normal'] = self.sounds['accent'] = self.sounds['first'] = None

    def get_sound(self, sound_type):
        """Returns the requested sound.""" 
        return self.sounds.get(sound_type, None)

    def set_volume(self, volume):
        """Sets the volume for all sounds."""
        for sound in self.sounds.values():
            if sound:
                sound.set_volume(volume)
