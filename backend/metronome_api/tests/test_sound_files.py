"""Tests for the sound file endpoints (served straight from MEDIA_ROOT)."""

import tempfile
from pathlib import Path

from django.http import Http404
from django.test import RequestFactory, SimpleTestCase, override_settings

from metronome_api import views


class ServeSoundFileTests(SimpleTestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.media = Path(tmp.name)
        (self.media / "metronome_sounds").mkdir()
        override = override_settings(MEDIA_ROOT=str(self.media))
        override.enable()
        self.addCleanup(override.disable)

    def fetch(self, filename):
        response = views.serve_sound_file(RequestFactory().get(f"/metronome_sounds/{filename}"), filename)
        body = b"".join(response.streaming_content)
        return response, body

    def test_serves_file_from_media_root(self):
        (self.media / "click.mp3").write_bytes(b"MP3DATA")

        response, body = self.fetch("click.mp3")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(body, b"MP3DATA")
        self.assertEqual(response["Content-Type"], "audio/mpeg")
        self.assertEqual(response["Content-Disposition"], 'inline; filename="click.mp3"')

    def test_falls_back_to_metronome_sounds_subdirectory(self):
        (self.media / "metronome_sounds" / "first.wav").write_bytes(b"WAVDATA")

        response, body = self.fetch("first.wav")

        self.assertEqual(body, b"WAVDATA")
        self.assertEqual(response["Content-Type"], "audio/wav")

    def test_root_file_wins_over_subdirectory(self):
        (self.media / "x.ogg").write_bytes(b"ROOT")
        (self.media / "metronome_sounds" / "x.ogg").write_bytes(b"SUB")

        response, body = self.fetch("x.ogg")

        self.assertEqual(body, b"ROOT")
        self.assertEqual(response["Content-Type"], "audio/ogg")

    def test_audio_extensions_get_explicit_mime_types(self):
        for name, mime in {"a.mp3": "audio/mpeg", "a.wav": "audio/wav", "a.ogg": "audio/ogg"}.items():
            with self.subTest(name=name):
                (self.media / name).write_bytes(b"x")
                response, _ = self.fetch(name)
                self.assertEqual(response["Content-Type"], mime)

    def test_other_types_use_mimetypes_guess(self):
        (self.media / "notes.txt").write_bytes(b"hello")

        response, _ = self.fetch("notes.txt")

        self.assertEqual(response["Content-Type"], "text/plain")

    def test_unknown_extension_falls_back_to_octet_stream(self):
        (self.media / "blob.zzzunknown").write_bytes(b"x")

        response, _ = self.fetch("blob.zzzunknown")

        self.assertEqual(response["Content-Type"], "application/octet-stream")

    def test_cors_headers_allow_any_origin_for_get(self):
        (self.media / "a.mp3").write_bytes(b"x")

        response, _ = self.fetch("a.mp3")

        self.assertEqual(response["Access-Control-Allow-Origin"], "*")
        self.assertEqual(response["Access-Control-Allow-Methods"], "GET, OPTIONS")
        self.assertEqual(response["Access-Control-Allow-Headers"], "X-Requested-With, Content-Type")

    def test_missing_file_raises_404_mentioning_filename(self):
        with self.assertRaises(Http404) as ctx:
            self.fetch("missing.mp3")

        self.assertIn("missing.mp3", str(ctx.exception))

    def test_directory_name_is_not_served(self):
        with self.assertRaises(Http404):
            self.fetch("metronome_sounds")

    def test_parent_directory_reference_is_not_served(self):
        with self.assertRaises(Http404):
            self.fetch("..")

    def test_symlinked_media_subdirectory_is_still_served(self):
        target = Path(tempfile.mkdtemp())
        self.addCleanup(target.rmdir)
        (target / "linked.mp3").write_bytes(b"LINK")
        self.addCleanup((target / "linked.mp3").unlink)
        (self.media / "metronome_sounds").rmdir()
        (self.media / "metronome_sounds").symlink_to(target, target_is_directory=True)

        _, body = self.fetch("linked.mp3")

        self.assertEqual(body, b"LINK")


class SoundFileRoutingTests(SimpleTestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        Path(tmp.name, "click.mp3").write_bytes(b"MP3")
        override = override_settings(MEDIA_ROOT=tmp.name)
        override.enable()
        self.addCleanup(override.disable)

    def test_both_url_prefixes_serve_the_same_file(self):
        for url in ("/metronome_sounds/click.mp3", "/assets/audio/click.mp3"):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.getvalue(), b"MP3")

    def test_unknown_file_is_a_404(self):
        self.assertEqual(self.client.get("/metronome_sounds/nope.mp3").status_code, 404)
