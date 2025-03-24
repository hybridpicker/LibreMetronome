from django.test import TestCase
from django.urls import reverse
from django.conf import settings
import json

class SupportAPITestCase(TestCase):
    """
    Test case for the Support API endpoints.
    """
    
    def setUp(self):
        # Set a test payment link for the test case
        settings.STRIPE_PAYMENT_LINK = "https://test.stripe.com/test-payment-link"
    
    def test_support_info_endpoint(self):
        """Test that the support-info endpoint returns the correct payment link."""
        url = reverse('support_info')
        response = self.client.get(url)
        
        # Check status code
        self.assertEqual(response.status_code, 200)
        
        # Parse the JSON response
        data = json.loads(response.content)
        
        # Check that the payment link is in the response
        self.assertIn('paymentLink', data)
        self.assertEqual(data['paymentLink'], settings.STRIPE_PAYMENT_LINK)
    
    def test_support_info_empty_link(self):
        """Test that the endpoint returns an empty string when no payment link is configured."""
        # Temporarily remove the payment link
        original_link = settings.STRIPE_PAYMENT_LINK
        settings.STRIPE_PAYMENT_LINK = ""
        
        url = reverse('support_info')
        response = self.client.get(url)
        
        # Check status code
        self.assertEqual(response.status_code, 200)
        
        # Parse the JSON response
        data = json.loads(response.content)
        
        # Check that the payment link is empty
        self.assertIn('paymentLink', data)
        self.assertEqual(data['paymentLink'], "")
        
        # Restore the original payment link
        settings.STRIPE_PAYMENT_LINK = original_link
    
    def test_cors_headers(self):
        """Test that the CORS headers are correctly set in the response."""
        url = reverse('support_info')
        response = self.client.get(url)
        
        # Check CORS headers
        self.assertEqual(response['Access-Control-Allow-Origin'], '*')
        self.assertEqual(response['Access-Control-Allow-Methods'], 'GET, OPTIONS')
        self.assertIn('X-Requested-With', response['Access-Control-Allow-Headers'])
        self.assertIn('Content-Type', response['Access-Control-Allow-Headers'])
