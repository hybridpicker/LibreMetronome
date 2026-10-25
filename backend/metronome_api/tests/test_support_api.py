"""Tests for the support-info endpoint (Stripe payment link)."""

import json

from django.test import TestCase, override_settings
from django.urls import reverse

LINK = "https://test.stripe.com/test-payment-link"


@override_settings(STRIPE_PAYMENT_LINK=LINK)
class SupportInfoTests(TestCase):
    def get(self):
        return self.client.get(reverse("support_info"))

    def test_returns_configured_payment_link_as_json(self):
        response = self.get()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertEqual(json.loads(response.content), {"paymentLink": LINK})

    def test_sets_permissive_cors_headers(self):
        response = self.get()

        self.assertEqual(response["Access-Control-Allow-Origin"], "*")
        self.assertEqual(response["Access-Control-Allow-Methods"], "GET, OPTIONS")
        self.assertIn("X-Requested-With", response["Access-Control-Allow-Headers"])
        self.assertIn("Content-Type", response["Access-Control-Allow-Headers"])

    def test_reflects_changed_setting(self):
        new_link = "https://test.stripe.com/changed-link"
        with override_settings(STRIPE_PAYMENT_LINK=new_link):
            self.assertEqual(self.get().json()["paymentLink"], new_link)

    @override_settings(STRIPE_PAYMENT_LINK="")
    def test_empty_link_is_returned_as_empty_string(self):
        self.assertEqual(self.get().json(), {"paymentLink": ""})

    def test_missing_setting_falls_back_to_empty_string(self):
        from django.conf import settings

        with override_settings():
            delattr(settings, "STRIPE_PAYMENT_LINK")
            self.assertEqual(self.get().json(), {"paymentLink": ""})
