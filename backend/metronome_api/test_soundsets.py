from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from .models import MetronomeSoundSet
import os

class SoundSetTestCase(TestCase):
    """Test sound set CRUD operations"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin',
            password='testpass123',
            is_staff=True
        )
        self.normal_user = User.objects.create_user(
            username='user',
            password='testpass123',
            is_staff=False
        )
        
        # Create test sound set
        self.sound_set = MetronomeSoundSet.objects.create(
            name='Test Set',
            description='Test description',
            normal_beat_sound='test_normal.mp3',
            accent_sound='test_accent.mp3',
            first_beat_sound='test_first.mp3'
        )
    
    def test_list_sound_sets(self):
        """Test listing all sound sets (no auth required)"""
        response = self.client.get('/api/sound-sets/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Test Set')
    
    def test_create_sound_set_authenticated(self):
        """Test creating sound set as admin"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Create dummy files
        normal_file = SimpleUploadedFile("normal.mp3", b"file_content", content_type="audio/mpeg")
        accent_file = SimpleUploadedFile("accent.mp3", b"file_content", content_type="audio/mpeg")
        first_file = SimpleUploadedFile("first.mp3", b"file_content", content_type="audio/mpeg")
        
        response = self.client.post('/api/sound-sets/', {
            'name': 'New Set',
            'description': 'New description',
            'normal_beat_sound': normal_file,
            'accent_sound': accent_file,
            'first_beat_sound': first_file,
            'is_default': False
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MetronomeSoundSet.objects.count(), 2)
    
    def test_create_sound_set_unauthenticated(self):
        """Test creating sound set without auth fails"""
        response = self.client.post('/api/sound-sets/', {
            'name': 'New Set',
            'description': 'New description'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_sound_set(self):
        """Test updating sound set as admin"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.patch(f'/api/sound-sets/{self.sound_set.id}/', {
            'name': 'Updated Name',
            'description': 'Updated description'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.sound_set.refresh_from_db()
        self.assertEqual(self.sound_set.name, 'Updated Name')
    
    def test_delete_sound_set(self):
        """Test deleting sound set as admin"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.delete(f'/api/sound-sets/{self.sound_set.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(MetronomeSoundSet.objects.count(), 0)
    
    def test_delete_sound_set_unauthorized(self):
        """Test deleting sound set without auth fails"""
        self.client.force_authenticate(user=self.normal_user)
        
        response = self.client.delete(f'/api/sound-sets/{self.sound_set.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(MetronomeSoundSet.objects.count(), 1)
