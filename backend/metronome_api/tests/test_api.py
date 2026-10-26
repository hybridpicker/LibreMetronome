"""Characterization tests for the JSON sound-set API."""

from unittest import mock

from django.test import TestCase
from django.urls import reverse

from metronome_api import views
from metronome_api.models import MetronomeSoundSet


def make_set(name, **kwargs):
    return MetronomeSoundSet.objects.create(
        name=name,
        first_beat_sound=f"{name}_first.wav",
        accent_sound=f"{name}_accent.wav",
        normal_beat_sound=f"{name}_normal.wav",
        **kwargs,
    )


def exploding_manager():
    manager = mock.MagicMock()
    manager.first.side_effect = RuntimeError("boom")
    manager.get.side_effect = RuntimeError("boom")
    manager.all.side_effect = RuntimeError("boom")
    return manager


class SoundSetToDictTests(TestCase):
    def test_none_returns_none(self):
        self.assertIsNone(views.sound_set_to_dict(None))

    def test_contains_urls_timestamps_and_inactive_flag(self):
        sound_set = make_set("Wood", description="Dry", is_active=True)

        data = views.sound_set_to_dict(sound_set)

        self.assertEqual(data["id"], sound_set.id)
        self.assertEqual(data["name"], "Wood")
        self.assertEqual(data["description"], "Dry")
        # The flag is intentionally always False: selection lives in frontend cookies.
        self.assertIs(data["is_active"], False)
        self.assertTrue(data["first_beat_sound_url"].endswith("Wood_first.wav"))
        self.assertTrue(data["accent_sound_url"].endswith("Wood_accent.wav"))
        self.assertTrue(data["normal_beat_sound_url"].endswith("Wood_normal.wav"))
        self.assertEqual(data["created_at"], sound_set.created_at.isoformat())
        self.assertEqual(data["updated_at"], sound_set.updated_at.isoformat())

    def test_missing_files_and_timestamps_become_none(self):
        sound_set = MetronomeSoundSet(name="Unsaved")

        data = views.sound_set_to_dict(sound_set)

        self.assertIsNone(data["first_beat_sound_url"])
        self.assertIsNone(data["accent_sound_url"])
        self.assertIsNone(data["normal_beat_sound_url"])
        self.assertIsNone(data["created_at"])
        self.assertIsNone(data["updated_at"])


class ListAndDetailTests(TestCase):
    def setUp(self):
        self.first = make_set("A", is_active=True)
        self.second = make_set("B")

    def test_all_sound_sets_lists_everything_in_model_order(self):
        data = self.client.get(reverse("all_sound_sets")).json()

        self.assertEqual([item["id"] for item in data], [self.first.id, self.second.id])

    def test_all_sound_sets_empty(self):
        MetronomeSoundSet.objects.all().delete()

        response = self.client.get(reverse("all_sound_sets"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_detail_returns_requested_set(self):
        data = self.client.get(reverse("sound_set_detail", args=[self.second.id])).json()

        self.assertEqual((data["id"], data["name"]), (self.second.id, "B"))

    def test_detail_unknown_id_is_404(self):
        response = self.client.get(reverse("sound_set_detail", args=[9999]))

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"error": "Sound set with ID 9999 not found"})

    def test_non_integer_id_is_not_routed_to_detail(self):
        # Falls through to the React catch-all, which serves index.html.
        response = self.client.get("/api/sound-sets/abc/")

        self.assertTemplateUsed(response, "index.html")


class DefaultAndActiveTests(TestCase):
    def test_both_endpoints_return_first_set_in_model_order(self):
        make_set("Zeta")
        wanted = make_set("Alpha", is_active=True)

        for name in ("active_sound_set", "default_sound_set"):
            with self.subTest(endpoint=name):
                response = self.client.get(reverse(name))
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["id"], wanted.id)
                self.assertEqual(response["Access-Control-Allow-Origin"], "*")
                self.assertEqual(response["Access-Control-Allow-Methods"], "GET, OPTIONS")

    def test_empty_database_returns_404_with_specific_messages(self):
        active = self.client.get(reverse("active_sound_set"))
        default = self.client.get(reverse("default_sound_set"))

        self.assertEqual(active.status_code, 404)
        self.assertEqual(active.json(), {"error": "No sound sets found"})
        self.assertEqual(default.status_code, 404)
        self.assertEqual(default.json(), {"error": "No default sound set found"})


class SetActiveTests(TestCase):
    def setUp(self):
        self.one = make_set("One", is_active=True)
        self.two = make_set("Two", is_active=True)

    def test_post_returns_set_without_touching_database_flags(self):
        response = self.client.post(reverse("set_active_sound_set", args=[self.one.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.one.id)
        self.assertEqual(response["Access-Control-Allow-Methods"], "POST, OPTIONS")
        self.one.refresh_from_db()
        self.two.refresh_from_db()
        self.assertTrue(self.one.is_active and self.two.is_active)

    def test_unknown_id_is_404(self):
        response = self.client.post(reverse("set_active_sound_set", args=[4242]))

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"error": "Sound set with ID 4242 not found"})

    def test_get_is_rejected_with_405(self):
        response = self.client.get(reverse("set_active_sound_set", args=[self.one.id]))

        self.assertEqual(response.status_code, 405)


class UnexpectedFailureTests(TestCase):
    """Unexpected exceptions must end in a JSON 500, never in an unhandled error."""

    def assert_json_500(self, response):
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertIn("error", response.json())

    def test_every_endpoint_reports_500(self):
        cases = [
            ("active_sound_set", None, "get"),
            ("default_sound_set", None, "get"),
            ("all_sound_sets", None, "get"),
            ("sound_set_detail", [1], "get"),
            ("set_active_sound_set", [1], "post"),
        ]
        for name, args, method in cases:
            with (
                self.subTest(endpoint=name),
                mock.patch.object(views.MetronomeSoundSet, "objects", exploding_manager()),
                self.assertLogs("metronome_api.views", level="ERROR") as logs,
            ):
                response = getattr(self.client, method)(reverse(name, args=args))
                self.assert_json_500(response)
                self.assertIn("Unhandled error", logs.output[0])
                self.assertNotIn("boom", response.content.decode())
