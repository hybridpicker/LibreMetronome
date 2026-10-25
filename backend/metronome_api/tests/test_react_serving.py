"""Tests for the React catch-all route and the admin."""

from django.test import RequestFactory, TestCase

from metronome_api import views


class ReactServingTests(TestCase):
    def test_root_serves_index_template(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "index.html")

    def test_unknown_frontend_route_serves_index_template(self):
        response = self.client.get("/some/frontend/route")

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "index.html")

    def test_index_is_never_cached(self):
        cache_control = self.client.get("/")["Cache-Control"]

        for directive in ("max-age=0", "no-cache", "no-store", "must-revalidate"):
            self.assertIn(directive, cache_control)

    def test_index_references_static_bundles(self):
        body = self.client.get("/").content.decode()

        self.assertIn("/static/js/main.js", body)
        self.assertIn("/static/css/main.css", body)

    def test_unknown_api_path_falls_back_to_index(self):
        response = self.client.get("/api/")

        self.assertTemplateUsed(response, "index.html")

    def test_admin_redirects_to_login(self):
        response = self.client.get("/admin/")

        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/login/", response["Location"])

    def test_serve_react_ignores_path_argument(self):
        request = RequestFactory().get("/anything")

        response = views.serve_react(request, path="anything")

        self.assertEqual(response.status_code, 200)
