from django.test import TestCase
from django.urls import reverse
from django.conf import settings
import json

class SupportIntegrationTest(TestCase):
    """
    Integration test for the Support API and its configuration.
    """
    
    def setUp(self):
        # Set test payment link
        settings.STRIPE_PAYMENT_LINK = "https://test.stripe.com/test-payment-link"
    
    def test_support_api_integration(self):
        """Test that the support-info endpoint returns the correct data with proper headers."""
        url = reverse('support_info')
        response = self.client.get(url)
        
        # Check status code
        self.assertEqual(response.status_code, 200)
        
        # Check content type
        self.assertEqual(response['Content-Type'], 'application/json')
        
        # Check CORS headers
        self.assertEqual(response['Access-Control-Allow-Origin'], '*')
        
        # Check response data
        data = json.loads(response.content)
        self.assertIn('paymentLink', data)
        self.assertEqual(data['paymentLink'], settings.STRIPE_PAYMENT_LINK)
    
    def test_support_info_respects_settings(self):
        """Test that changing the payment link in settings is reflected in the API response."""
        # Change the payment link
        original_link = settings.STRIPE_PAYMENT_LINK
        new_link = "https://test.stripe.com/changed-link"
        settings.STRIPE_PAYMENT_LINK = new_link
        
        # Request the API
        url = reverse('support_info')
        response = self.client.get(url)
        data = json.loads(response.content)
        
        # Verify the new link is returned
        self.assertEqual(data['paymentLink'], new_link)
        
        # Restore the original link
        settings.STRIPE_PAYMENT_LINK = original_link
