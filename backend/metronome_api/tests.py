from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.core.exceptions import ValidationError
from .models import MetronomeSoundSet
import os

# Create your tests here.

class MetronomeSoundSetTests(TestCase):
    def setUp(self):
        # Create test audio files
        self.test_wav = SimpleUploadedFile(
            "test_sound.wav",
            b"test wav content",
            content_type="audio/wav"
        )
        
        # Create a test sound set
        self.sound_set = MetronomeSoundSet.objects.create(
            name="Test Sound Set",
            first_beat_sound="metronome_sounds/test_first.wav",
            accent_sound="metronome_sounds/test_accent.wav",
            normal_beat_sound="metronome_sounds/test_normal.wav",
            is_default=True
        )

    def test_sound_set_creation(self):
        """Test MetronomeSoundSet creation and default values"""
        self.assertEqual(self.sound_set.name, "Test Sound Set")
        self.assertTrue(self.sound_set.is_default)
        self.assertTrue(self.sound_set.created_at is not None)
        self.assertTrue(self.sound_set.updated_at is not None)

    def test_sound_file_validation(self):
        """Test sound file format validation"""
        invalid_file = SimpleUploadedFile(
            "test.txt",
            b"invalid content",
            content_type="text/plain"
        )
        
        with self.assertRaises(ValidationError):
            sound_set = MetronomeSoundSet(
                name="Invalid Sound Set",
                first_beat_sound=invalid_file,
                accent_sound=self.test_wav,
                normal_beat_sound=self.test_wav
            )
            sound_set.full_clean()

    def test_default_sound_set_constraint(self):
        """Test that only one sound set can be default"""
        # Create another sound set with is_default=True
        new_sound_set = MetronomeSoundSet.objects.create(
            name="New Default Set",
            first_beat_sound="metronome_sounds/new_first.wav",
            accent_sound="metronome_sounds/new_accent.wav",
            normal_beat_sound="metronome_sounds/new_normal.wav",
            is_default=True
        )
        
        # Refresh the old sound set from db
        self.sound_set.refresh_from_db()
        
        # Check that the old sound set is no longer default
        self.assertFalse(self.sound_set.is_default)
        self.assertTrue(new_sound_set.is_default)

class ReactServingTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_serve_react_index(self):
        """Test that the root URL serves the React index.html"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'index.html')

    def test_serve_react_with_path(self):
        """Test that any frontend route still serves index.html for React routing"""
        response = self.client.get('/some/frontend/route')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'index.html')

    def test_api_endpoint_accessible(self):
        """Test that API endpoints are accessible"""
        response = self.client.get('/api/')
        self.assertNotEqual(response.status_code, 404)  # Endpoint exists

    def test_admin_accessible(self):
        """Test that admin interface is accessible"""
        response = self.client.get('/admin/')
        self.assertEqual(response.status_code, 302)  # Redirects to login
