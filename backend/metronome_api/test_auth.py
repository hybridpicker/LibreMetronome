from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import MetronomeSoundSet
import json

class AdminAuthTestCase(TestCase):
    """Test admin authentication endpoints"""
    
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
    
    def test_admin_login_success(self):
        """Test successful admin login"""
        response = self.client.post('/api/admin/login/', {
            'username': 'admin',
            'password': 'testpass123'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertIn('success', data)
        self.assertTrue(data['success'])
    
    def test_admin_login_non_staff(self):
        """Test login fails for non-staff users"""
        response = self.client.post('/api/admin/login/', {
            'username': 'user',
            'password': 'testpass123'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_admin_login_invalid_credentials(self):
        """Test login fails with invalid credentials"""
        response = self.client.post('/api/admin/login/', {
            'username': 'admin',
            'password': 'wrongpass'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_check_auth_authenticated(self):
        """Test auth check for authenticated admin"""
        # Login via the admin login endpoint first
        response = self.client.post('/api/admin/login/', {
            'username': 'admin',
            'password': 'testpass123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Now check auth
        response = self.client.get('/api/admin/check-auth/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertTrue(data['authenticated'])
    
    def test_check_auth_unauthenticated(self):
        """Test auth check for unauthenticated user"""
        response = self.client.get('/api/admin/check-auth/')
        
        # Should redirect to login or return 403
        self.assertIn(response.status_code, [status.HTTP_302_FOUND, status.HTTP_403_FORBIDDEN])
