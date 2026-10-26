"""Tests for project-level settings, URLs and entry points."""

import importlib
import os
import sys
from unittest import mock

from django.core.exceptions import ImproperlyConfigured
from django.http import Http404
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings

from libremetronome_backend import views


class SettingsTests(SimpleTestCase):
    def load_settings(self, **env):
        sys.modules.pop("libremetronome_backend.settings", None)
        with mock.patch.dict(os.environ, env, clear=True), mock.patch("dotenv.load_dotenv"):
            return importlib.import_module("libremetronome_backend.settings")

    def tearDown(self):
        sys.modules.pop("libremetronome_backend.settings", None)
        importlib.import_module("libremetronome_backend.settings")

    def test_refuses_to_boot_without_secret_key(self):
        with self.assertRaisesMessage(ImproperlyConfigured, "SECRET_KEY must be set"):
            self.load_settings()

    def test_refuses_empty_secret_key(self):
        with self.assertRaises(ImproperlyConfigured):
            self.load_settings(SECRET_KEY="")

    def test_secret_key_comes_from_environment(self):
        self.assertEqual(self.load_settings(SECRET_KEY="from-env").SECRET_KEY, "from-env")

    def test_production_defaults_are_hardened(self):
        loaded = self.load_settings(SECRET_KEY="k")

        self.assertFalse(loaded.DEBUG)
        self.assertTrue(loaded.SECURE_SSL_REDIRECT)
        self.assertTrue(loaded.SESSION_COOKIE_SECURE and loaded.CSRF_COOKIE_SECURE)
        self.assertEqual(loaded.X_FRAME_OPTIONS, "DENY")
        self.assertGreaterEqual(loaded.SECURE_HSTS_SECONDS, 31536000)
        self.assertNotIn("*", loaded.ALLOWED_HOSTS)
        self.assertIn("https://libremetronome.com", loaded.CORS_ALLOWED_ORIGINS)

    def test_test_settings_relax_only_transport_security(self):
        from libremetronome_backend import test_settings

        self.assertFalse(test_settings.SECURE_SSL_REDIRECT)
        self.assertFalse(test_settings.SESSION_COOKIE_SECURE)
        self.assertFalse(test_settings.CSRF_COOKIE_SECURE)
        self.assertFalse(test_settings.DEBUG)

    def test_dev_settings_enable_debug_and_cors(self):
        from libremetronome_backend import dev_settings

        self.assertTrue(dev_settings.DEBUG)
        self.assertTrue(dev_settings.CORS_ALLOW_ALL_ORIGINS)
        self.assertFalse(dev_settings.SECURE_SSL_REDIRECT)
        self.assertIn("POST", dev_settings.CORS_ALLOW_METHODS)
        self.assertIn("content-type", dev_settings.CORS_ALLOW_HEADERS)


class DevRedirectTests(SimpleTestCase):
    @override_settings(DEBUG=True)
    def test_redirects_to_dev_server_in_debug(self):
        response = views.dev_redirect(RequestFactory().get("/"))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "http://localhost:3000")

    @override_settings(DEBUG=False)
    def test_is_a_404_in_production(self):
        with self.assertRaises(Http404):
            views.dev_redirect(RequestFactory().get("/"))


class EntryPointTests(SimpleTestCase):
    def test_wsgi_and_asgi_expose_applications(self):
        from libremetronome_backend import asgi, wsgi

        self.assertTrue(callable(wsgi.application))
        self.assertTrue(callable(asgi.application))


class MediaUrlTests(SimpleTestCase):
    def reload_urls(self):
        import libremetronome_backend.urls as urls

        return importlib.reload(urls)

    def tearDown(self):
        self.reload_urls()  # back to the settings of the test run

    @override_settings(DEBUG=True)
    def test_media_files_are_routed_in_debug(self):
        urls = self.reload_urls()

        patterns = [str(pattern.pattern) for pattern in urls.urlpatterns]
        self.assertTrue(any(pattern.startswith("^metronome_sounds") for pattern in patterns))

    @override_settings(DEBUG=False)
    def test_media_files_are_not_routed_in_production(self):
        urls = self.reload_urls()

        patterns = [str(pattern.pattern) for pattern in urls.urlpatterns]
        self.assertFalse(any(pattern.startswith("^metronome_sounds") for pattern in patterns))


class UrlTests(TestCase):
    def test_media_files_are_not_served_by_django_when_debug_is_off(self):
        # With DEBUG off, /metronome_sounds/ is handled by the explicit sound route only.
        self.assertEqual(self.client.get("/metronome_sounds/missing.mp3").status_code, 404)
