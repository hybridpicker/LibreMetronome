from django.contrib.admin.sites import site
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from metronome_api.admin import MetronomeSoundSetAdmin
from metronome_api.models import MetronomeSoundSet


class SoundPreviewTests(TestCase):
    def setUp(self):
        self.model_admin = MetronomeSoundSetAdmin(MetronomeSoundSet, site)

    def test_renders_one_audio_player_per_sound(self):
        sound_set = MetronomeSoundSet(
            name="X", first_beat_sound="f.wav", accent_sound="a.wav", normal_beat_sound="n.wav"
        )

        html = self.model_admin.sound_preview(sound_set)

        self.assertEqual(html.count("<audio"), 3)
        for label, url in (("First Beat", "f.wav"), ("Accent", "a.wav"), ("Normal Beat", "n.wav")):
            self.assertIn(f"<strong>{label}</strong>", html)
            self.assertIn(f'src="/metronome_sounds/{url}"', html)

    def test_skips_sounds_without_a_file(self):
        sound_set = MetronomeSoundSet(name="X", accent_sound="a.wav")

        html = self.model_admin.sound_preview(sound_set)

        self.assertEqual(html.count("<audio"), 1)
        self.assertNotIn("First Beat", html)

    def test_no_files_gives_empty_preview(self):
        self.assertEqual(self.model_admin.sound_preview(MetronomeSoundSet(name="X")), "")

    def test_url_is_html_escaped(self):
        sound_set = MetronomeSoundSet(name="X", accent_sound='"><script>x</script>.wav')

        html = self.model_admin.sound_preview(sound_set)

        self.assertNotIn("<script>", html)

    def test_short_description(self):
        self.assertEqual(self.model_admin.sound_preview.short_description, "Sound Previews")  # type: ignore[attr-defined]


class AdminPagesTests(TestCase):
    def setUp(self):
        admin_user = get_user_model().objects.create_superuser("admin-test", "a@example.invalid", "pw-for-tests-only-1")
        self.client.force_login(admin_user)
        MetronomeSoundSet.objects.create(
            name="Listed", first_beat_sound="f.wav", accent_sound="a.wav", normal_beat_sound="n.wav"
        )

    def test_changelist_lists_sets_with_previews(self):
        response = self.client.get(reverse("admin:metronome_api_metronomesoundset_changelist"))

        self.assertContains(response, "Listed")
        self.assertContains(response, "<audio", count=3)
