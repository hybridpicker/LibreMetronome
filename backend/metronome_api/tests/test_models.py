"""Tests for MetronomeSoundSet and its audio validators."""

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models import FileField
from django.test import SimpleTestCase, TestCase

from metronome_api.models import MetronomeSoundSet, validate_audio_file

DEFAULTS = {
    "first_beat_sound": "src/assets/audio/default_first_beat.wav",
    "accent_sound": "src/assets/audio/default_accent.wav",
    "normal_beat_sound": "src/assets/audio/default_normal_beat.wav",
}


def make_set(name="Set", **kwargs):
    return MetronomeSoundSet.objects.create(
        name=name,
        first_beat_sound=kwargs.pop("first_beat_sound", f"{name}_first.wav"),
        accent_sound=kwargs.pop("accent_sound", f"{name}_accent.wav"),
        normal_beat_sound=kwargs.pop("normal_beat_sound", f"{name}_normal.wav"),
        **kwargs,
    )


class ValidateAudioFileTests(SimpleTestCase):
    def test_accepts_supported_extensions_case_insensitively(self):
        for name in ("a.wav", "b.mp3", "c.ogg", "D.WAV", "e.Mp3"):
            with self.subTest(name=name):
                validate_audio_file(SimpleUploadedFile(name, b"x"))

    def test_rejects_unsupported_and_missing_extensions(self):
        for name in ("a.txt", "b.flac", "noextension", "archive.wav.zip"):
            with (
                self.subTest(name=name),
                self.assertRaisesMessage(ValidationError, "Please use WAV, MP3, or OGG files."),
            ):
                validate_audio_file(SimpleUploadedFile(name, b"x"))


class MetronomeSoundSetTests(TestCase):
    def test_str_is_name(self):
        self.assertEqual(str(make_set("Wood")), "Wood")

    def test_is_active_defaults_to_false(self):
        self.assertFalse(make_set().is_active)

    def test_is_default_kwarg_maps_to_is_active(self):
        sound_set = make_set(is_default=True)

        sound_set.refresh_from_db()
        self.assertTrue(sound_set.is_active)
        self.assertTrue(sound_set.is_default)

    def test_is_default_setter_updates_is_active(self):
        sound_set = make_set()
        sound_set.is_default = True
        self.assertTrue(sound_set.is_active)

    def test_multiple_sets_can_be_active_at_once(self):
        first = make_set("A", is_default=True)
        second = make_set("B", is_default=True)

        first.refresh_from_db()
        second.refresh_from_db()
        self.assertTrue(first.is_default and second.is_default)

    def test_ordering_is_active_first_then_name(self):
        make_set("Zeta", is_active=False)
        make_set("Beta", is_active=False)
        make_set("Omega", is_active=True)

        self.assertEqual(
            list(MetronomeSoundSet.objects.values_list("name", flat=True)),
            ["Omega", "Beta", "Zeta"],
        )

    def test_save_fills_default_sounds_for_empty_fields(self):
        sound_set = MetronomeSoundSet(name="Bare")
        sound_set.save()

        self.assertEqual(sound_set.first_beat_sound.name, DEFAULTS["first_beat_sound"])
        self.assertEqual(sound_set.accent_sound.name, DEFAULTS["accent_sound"])
        self.assertEqual(sound_set.normal_beat_sound.name, DEFAULTS["normal_beat_sound"])

    def test_save_keeps_explicit_sounds(self):
        sound_set = make_set("Own")
        self.assertEqual(sound_set.first_beat_sound.name, "Own_first.wav")

    def test_sound_fields_validate_extensions_and_explain_themselves(self):
        for field_name, help_text in (
            ("first_beat_sound", "Sound for the first beat of the measure"),
            ("accent_sound", "Sound for accented beats"),
            ("normal_beat_sound", "Sound for normal beats"),
        ):
            with self.subTest(field=field_name):
                field = MetronomeSoundSet._meta.get_field(field_name)
                assert isinstance(field, FileField)
                self.assertEqual(field.help_text, help_text)
                self.assertEqual(field.upload_to, "")
                self.assertIn(validate_audio_file, field.validators)
                extension_validator = next(v for v in field.validators if hasattr(v, "allowed_extensions"))
                self.assertEqual(list(extension_validator.allowed_extensions), ["wav", "mp3", "ogg"])

    def test_timestamps_are_set_and_updated(self):
        sound_set = make_set()
        created = sound_set.created_at
        sound_set.name = "Renamed"
        sound_set.save()
        sound_set.refresh_from_db()

        self.assertEqual(sound_set.created_at, created)
        self.assertGreaterEqual(sound_set.updated_at, created)

    def test_full_clean_rejects_non_audio_upload(self):
        wav = SimpleUploadedFile("ok.wav", b"x", content_type="audio/wav")
        bad = SimpleUploadedFile("bad.txt", b"x", content_type="text/plain")
        sound_set = MetronomeSoundSet(name="Bad", first_beat_sound=bad, accent_sound=wav, normal_beat_sound=wav)

        with self.assertRaises(ValidationError) as ctx:
            sound_set.full_clean()
        self.assertIn("first_beat_sound", ctx.exception.message_dict)

    def test_full_clean_accepts_audio_uploads(self):
        files = {
            field: SimpleUploadedFile(f"{field}.mp3", b"x", content_type="audio/mpeg")
            for field in ("first_beat_sound", "accent_sound", "normal_beat_sound")
        }
        MetronomeSoundSet(name="Good", **files).full_clean()

    def test_get_active_sound_set_creates_default_when_empty(self):
        sound_set = MetronomeSoundSet.get_active_sound_set()

        self.assertEqual(sound_set.name, "Default Sound Set")
        self.assertEqual(MetronomeSoundSet.objects.count(), 1)
        self.assertEqual(sound_set.first_beat_sound.name, DEFAULTS["first_beat_sound"])
        self.assertEqual(sound_set.accent_sound.name, DEFAULTS["accent_sound"])
        self.assertEqual(sound_set.normal_beat_sound.name, DEFAULTS["normal_beat_sound"])

    def test_get_active_sound_set_returns_existing_first_by_ordering(self):
        make_set("Zeta")
        wanted = make_set("Alpha")

        self.assertEqual(MetronomeSoundSet.get_active_sound_set(), wanted)
        self.assertEqual(MetronomeSoundSet.objects.count(), 2)
