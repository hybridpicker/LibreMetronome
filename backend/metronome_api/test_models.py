from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from .models import MetronomeSoundSet

class ModelTestCase(TestCase):
    """Test model functionality"""
    
    def test_create_sound_set(self):
        """Test creating a sound set"""
        sound_set = MetronomeSoundSet.objects.create(
            name='Test Sound Set',
            description='A test sound set',
            normal_beat_sound='normal.mp3',
            accent_sound='accent.mp3',
            first_beat_sound='first.mp3'
        )
        
        self.assertEqual(sound_set.name, 'Test Sound Set')
        self.assertEqual(str(sound_set), 'Test Sound Set')
        self.assertFalse(sound_set.is_active)
    
    def test_is_default_property(self):
        """Test is_default property maps to is_active"""
        sound_set = MetronomeSoundSet(
            name='Test',
            is_default=True
        )
        
        self.assertTrue(sound_set.is_active)
        self.assertTrue(sound_set.is_default)
        
        sound_set.is_default = False
        self.assertFalse(sound_set.is_active)
    
    def test_sound_set_ordering(self):
        """Test sound sets are ordered by is_active and name"""
        MetronomeSoundSet.objects.create(
            name='B Sound',
            is_active=False
        )
        MetronomeSoundSet.objects.create(
            name='A Sound',
            is_active=True
        )
        MetronomeSoundSet.objects.create(
            name='C Sound',
            is_active=False
        )
        
        sound_sets = list(MetronomeSoundSet.objects.all())
        
        # Active sound sets should come first
        self.assertEqual(sound_sets[0].name, 'A Sound')
        self.assertTrue(sound_sets[0].is_active)
        
        # Then alphabetically
        self.assertEqual(sound_sets[1].name, 'B Sound')
        self.assertEqual(sound_sets[2].name, 'C Sound')
    
    def test_get_active_sound_set(self):
        """Test get_active_sound_set class method"""
        # Should create default if none exist
        sound_set = MetronomeSoundSet.get_active_sound_set()
        self.assertIsNotNone(sound_set)
        self.assertEqual(sound_set.name, 'Default Sound Set')
        
        # Should return first if exists
        custom_set = MetronomeSoundSet.objects.create(
            name='Custom Set'
        )
        
        # Should return the first one based on ordering (Custom Set comes before Default alphabetically)
        active_set = MetronomeSoundSet.get_active_sound_set()
        self.assertEqual(active_set.name, 'Custom Set')
