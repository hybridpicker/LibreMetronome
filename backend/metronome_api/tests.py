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

    def test_multiple_active_sound_sets(self):
        """Test that multiple sound sets can be active (new cookie-based design)"""
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
        
        # Check that both sound sets can be active simultaneously
        # This matches our updated design where selection is cookie-based
        self.assertTrue(self.sound_set.is_default)
        self.assertTrue(new_sound_set.is_default)
    
    def test_get_active_sound_set_class_method(self):
        """Test that get_active_sound_set returns a sound set regardless of is_active"""
        # Get active sound set
        active_set = MetronomeSoundSet.get_active_sound_set()
        
        # Verify it returns a sound set (should be our test sound set)
        self.assertIsNotNone(active_set)
        self.assertIsInstance(active_set, MetronomeSoundSet)
        
        # Create more sound sets with varying is_active values
        sound_set2 = MetronomeSoundSet.objects.create(
            name="Second Sound Set",
            first_beat_sound="metronome_sounds/test2_first.wav",
            accent_sound="metronome_sounds/test2_accent.wav",
            normal_beat_sound="metronome_sounds/test2_normal.wav",
            is_default=False
        )
        
        sound_set3 = MetronomeSoundSet.objects.create(
            name="Third Sound Set",
            first_beat_sound="metronome_sounds/test3_first.wav",
            accent_sound="metronome_sounds/test3_accent.wav",
            normal_beat_sound="metronome_sounds/test3_normal.wav",
            is_default=True
        )
        
        # Method should still work (get any available sound set)
        active_set = MetronomeSoundSet.get_active_sound_set()
        self.assertIsNotNone(active_set)
        
        # Should return one of our sound sets
        self.assertIn(active_set.id, [
            self.sound_set.id, 
            sound_set2.id, 
            sound_set3.id
        ])

class SoundSetAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        
        # Create test sound sets
        self.sound_set1 = MetronomeSoundSet.objects.create(
            name="Test Sound Set 1",
            first_beat_sound="metronome_sounds/test1_first.wav",
            accent_sound="metronome_sounds/test1_accent.wav",
            normal_beat_sound="metronome_sounds/test1_normal.wav",
            is_default=True
        )
        
        self.sound_set2 = MetronomeSoundSet.objects.create(
            name="Test Sound Set 2",
            first_beat_sound="metronome_sounds/test2_first.wav",
            accent_sound="metronome_sounds/test2_accent.wav",
            normal_beat_sound="metronome_sounds/test2_normal.wav",
            is_default=True  # Both can be active
        )
    
    def test_all_sound_sets_endpoint(self):
        """Test that the API returns all sound sets"""
        # Get the URL for the soundset-list view using reverse
        url = reverse('soundset-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        
        # Parse JSON response
        data = response.json()
        
        # Should have 2 sound sets
        self.assertEqual(len(data), 2)
        
        # Should include all sound sets regardless of is_active
        sound_set_ids = [item['id'] for item in data]
        self.assertIn(self.sound_set1.id, sound_set_ids)
        self.assertIn(self.sound_set2.id, sound_set_ids)
    
    def test_sound_set_detail_endpoint(self):
        """Test that the API returns a specific sound set"""
        # Get the URL for the soundset-detail view using reverse
        url = reverse('soundset-detail', args=[self.sound_set1.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        
        # Parse JSON response
        data = response.json()
        
        # Should be our sound set
        self.assertEqual(data['id'], self.sound_set1.id)
        self.assertEqual(data['name'], self.sound_set1.name)
    
    def test_set_active_sound_set_endpoint(self):
        """Test that the set_active endpoint works without changing database values"""
        # Use POST to activate a sound set using reverse
        url = reverse('soundset-set-default', args=[self.sound_set1.id])
        response = self.client.post(
            url,
            content_type='application/json'
        )
        
        # Since we're not authenticated as staff, it should fail with 403
        self.assertEqual(response.status_code, 403)
        self.sound_set1.refresh_from_db()
        self.sound_set2.refresh_from_db()
        self.assertTrue(self.sound_set1.is_default)
        self.assertTrue(self.sound_set2.is_default)
    
    def test_active_sound_set_endpoint(self):
        """Test that the active sound set endpoint returns any sound set"""
        # Get the URL for the active_sound_set view using reverse
        url = reverse('active_sound_set')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        
        # Parse JSON response
        data = response.json()
        
        # Should return a sound set
        self.assertIn('id', data)
        self.assertIn('name', data)
        
        # ID should be one of our test sound sets
        self.assertIn(data['id'], [self.sound_set1.id, self.sound_set2.id])


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
